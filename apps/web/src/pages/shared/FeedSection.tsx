import { useCallback, useState, useEffect } from "react"
import { useFeed } from "@/features/posts/hooks/useFeed"
import { useRealtimeFeed } from "@/features/posts/hooks/useRealtimeFeed"
import { useToast } from "@/features/posts/hooks/useToast"
import { useAuthStore } from "@/features/auth/auth.store"
import FeedComposer from "@/features/posts/components/feed/FeedComposer"
import FeedList from "@/features/posts/components/feed/FeedList"
import "@/features/posts/styles/posts.css"

type SortBy = "latest" | "popular" | "following"

const SORT_TABS: { label: string; value: SortBy; icon: string }[] = [
  { label: "Latest", value: "latest", icon: "🕐" },
  { label: "Popular", value: "popular", icon: "🔥" },
  { label: "Following", value: "following", icon: "👥" },
]

export default function FeedSection() {
  const toast = useToast()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [sortBy, setSortBy] = useState<SortBy>("latest")
  const [newPostBanner, setNewPostBanner] = useState(false)

  const {
    posts, loading, loadingMore, hasMore,
    error, reload, loadMore, addPost, setSortBy: setFeedSort,
  } = useFeed({ autoLoad: false, initialLimit: 20, sortBy: "latest" })

  // Load feed once authenticated
  useEffect(() => {
    if (isAuthenticated) reload()
  }, [isAuthenticated])

  useRealtimeFeed({
    onUpdate: () => setNewPostBanner(true),
  })

  const handleSortChange = useCallback((sort: SortBy) => {
    setSortBy(sort)
    setFeedSort(sort)
  }, [setFeedSort])

  const handlePostCreated = useCallback((post: any) => {
    if (post) {
      addPost(post)
      toast.success("Post shared!")
    }
  }, [addPost, toast])

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) loadMore()
  }, [loading, loadingMore, hasMore, loadMore])

  const handleRefresh = useCallback(() => {
    setNewPostBanner(false)
    reload()
  }, [reload])

  return (
    <div className="feed-section">
      {/* New posts banner */}
      {newPostBanner && (
        <button className="new-posts-banner" onClick={handleRefresh}>
          ✨ New posts available — tap to refresh
        </button>
      )}

      {/* Sort Tabs */}
      <div className="tabs-bar">
        {SORT_TABS.map(tab => (
          <button
            key={tab.value}
            className={`tab-btn ${sortBy === tab.value ? "active" : ""}`}
            onClick={() => handleSortChange(tab.value)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Composer */}
      <FeedComposer onCreated={handlePostCreated} />

      {/* Feed */}
      <FeedList
        posts={posts}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        error={error}
        onRetry={reload}
      />
    </div>
  )
}