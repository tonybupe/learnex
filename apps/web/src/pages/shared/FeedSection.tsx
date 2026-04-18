import { useCallback, useState, useEffect, useRef } from "react"
import { useRealtimeFeed } from "@/features/posts/hooks/useRealtimeFeed"
import { useToast } from "@/features/posts/hooks/useToast"
import FeedComposer from "@/features/posts/components/feed/FeedComposer"
import FeedList from "@/features/posts/components/feed/FeedList"
import { getFeedByMode } from "@/features/posts/api/posts.api"
import type { Post } from "@/features/posts/types/post.types"
import "@/features/posts/styles/posts.css"
import { RefreshCw, Wifi, WifiOff } from "lucide-react"

type FeedMode = "latest" | "popular" | "following" | "trending" | "classes"

const FEED_TABS: { label: string; value: FeedMode; icon: string; desc: string }[] = [
  { label: "Latest",    value: "latest",    icon: "🕐", desc: "Most recent posts"                },
  { label: "Trending",  value: "trending",  icon: "🔥", desc: "Hot posts in the last 3 days"    },
  { label: "Popular",   value: "popular",   icon: "⭐", desc: "Most liked this week"             },
  { label: "Following", value: "following", icon: "👥", desc: "From people you follow"           },
  { label: "My Classes",value: "classes",   icon: "🎓", desc: "From your enrolled classes"       },
]

export default function FeedSection() {
  const toast = useToast()
  const [mode, setMode] = useState<FeedMode>("latest")
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newPostsBanner, setNewPostsBanner] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [liveCount, setLiveCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const LIMIT = 20

  const loadFeed = useCallback(async (feedMode: FeedMode, pageNum: number, append = false) => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)
      setError(null)
      const data = await getFeedByMode(feedMode, pageNum, LIMIT)
      if (!append) {
        setPosts(data)
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        setPosts(prev => {
          const ids = new Set(prev.map(p => p.id))
          return [...prev, ...data.filter(p => !ids.has(p.id))]
        })
      }
      setHasMore(data.length === LIMIT)
      setPage(pageNum)
    } catch (e: any) {
      if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
        setError(e?.message || "Failed to load feed")
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Load on mount + mode change
  useEffect(() => {
    setPosts([])
    setPage(1)
    setHasMore(true)
    setNewPostsBanner(false)
    setLiveCount(0)
    loadFeed(mode, 1, false)
  }, [mode, loadFeed])

  // Real-time WebSocket
  useRealtimeFeed({
    onConnect: () => setWsConnected(true),
    onDisconnect: () => setWsConnected(false),
    onNewPost: (data) => {
      // Only show banner for latest/trending — other modes need manual refresh
      setLiveCount(c => c + 1)
      if (mode === "latest" || mode === "trending") {
        setNewPostsBanner(true)
      }
    },
    onUpdate: () => {
      if (mode === "popular" || mode === "trending") setNewPostsBanner(true)
    },
  })

  const handleModeChange = (newMode: FeedMode) => {
    if (newMode === mode) { loadFeed(mode, 1, false); return }
    setMode(newMode)
  }

  const handleRefresh = () => {
    setNewPostsBanner(false)
    setLiveCount(0)
    loadFeed(mode, 1, false)
  }

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      loadFeed(mode, page + 1, true)
    }
  }

  const handlePostCreated = (post: any) => {
    if (post) {
      setPosts(prev => [post, ...prev.filter(p => p.id !== post.id)])
      toast.success("Post shared!")
    }
  }

  const handlePostDelete = (postId: number) => {
    // Instant optimistic removal from feed
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const activeTab = FEED_TABS.find(t => t.value === mode)!

  return (
    <div className="feed-section">
      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {wsConnected ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--success)", fontWeight: 700 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", animation: "pulse 2s infinite" }} />
              Live
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted)" }}>
              <WifiOff size={11} /> Offline
            </div>
          )}
        </div>
        <button onClick={handleRefresh}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: "inherit" }}
          title="Refresh feed">
          <RefreshCw size={13} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {/* New posts banner */}
      {newPostsBanner && (
        <button className="new-posts-banner" onClick={handleRefresh}
          style={{ width: "100%", marginBottom: 12, padding: "10px 16px", borderRadius: 12, border: "1px solid var(--accent)", background: "color-mix(in srgb, var(--accent) 8%, var(--card))", color: "var(--accent)", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>
          ✨ {liveCount > 0 ? `${liveCount} new post${liveCount > 1 ? "s" : ""}` : "New activity"} — tap to refresh
        </button>
      )}

      {/* Feed mode tabs */}
      <div className="tabs-bar" style={{ marginBottom: 16, overflowX: "auto" }}>
        {FEED_TABS.map(tab => (
          <button key={tab.value}
            className={`tab-btn ${mode === tab.value ? "active" : ""}`}
            onClick={() => handleModeChange(tab.value)}
            title={tab.desc}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab description */}
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 14 }}>{activeTab.icon}</span>
        <span>{activeTab.desc}</span>
      </div>

      {/* Post composer */}
      <FeedComposer onCreated={handlePostCreated} />

      {/* Feed list */}
      <FeedList
        posts={posts}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        error={error}
        onRetry={() => loadFeed(mode, 1, false)}
        onPostDelete={handlePostDelete}
      />
    </div>
  )
}