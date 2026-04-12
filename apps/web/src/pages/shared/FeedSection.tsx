import { useCallback, useState } from "react"
import { useFeed } from "@/features/posts/hooks/useFeed"
import { useRealtimeFeed } from "@/features/posts/hooks/useRealtimeFeed"
import { useToast } from "@/features/posts/hooks/useToast"
import FeedComposer from "@/features/posts/components/feed/FeedComposer"
import FeedList from "@/features/posts/components/feed/FeedList"
import "@/features/posts/styles/posts.css"

type SortBy = "latest" | "popular" | "following"

const SORT_TABS: { label: string; value: SortBy; icon: string }[] = [
  { label: "Latest",    value: "latest",    icon: "🕐" },
  { label: "Popular",   value: "popular",   icon: "🔥" },
  { label: "Following", value: "following", icon: "👥" },
]

export default function FeedSection() {
  const toast = useToast()
  const [sortBy, setSortBy] = useState<SortBy>("latest")
  const [newPostBanner, setNewPostBanner] = useState(false)

  const {
    posts, loading, loadingMore, hasMore,
    error, reload, loadMore, addPost, setSortBy: setFeedSort,
  } = useFeed({ autoLoad: true, initialLimit: 20, sortBy })

  useRealtimeFeed({
    onUpdate: () => setNewPostBanner(true),
  })

  const handleSortChange = useCallback((sort: SortBy) => {
    if (sort === sortBy) return
    setSortBy(sort)
    setFeedSort(sort)
  }, [sortBy, setFeedSort])

  const handlePostCreated = useCallback((post: any) => {
    if (post) {
      // Add to feed immediately, dedup handles if reload also fetches it
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
      {newPostBanner && (
        <button className="new-posts-banner" onClick={handleRefresh}>
          ✨ New posts available — tap to refresh
        </button>
      )}

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

      <FeedComposer onCreated={handlePostCreated} />

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