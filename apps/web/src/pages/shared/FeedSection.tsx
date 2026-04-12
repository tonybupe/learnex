// pages/shared/FeedSection.tsx
import { useCallback, useState } from "react"
import { useFeed } from "@/features/posts/hooks/useFeed"
import { useRealtimeFeed } from "@/features/posts/hooks/useRealtimeFeed"
import { useToast } from "@/features/posts/hooks/useToast"
import FeedComposer from "@/features/posts/components/feed/FeedComposer"
import FeedList from "@/features/posts/components/feed/FeedList"
import "@/features/posts/styles/posts.css"

type SortBy = "latest" | "popular" | "following"

const SORT_TABS: { label: string; value: SortBy }[] = [
  { label: "Latest", value: "latest" },
  { label: "Popular", value: "popular" },
  { label: "Following", value: "following" },
]

export default function FeedSection() {
  const toast = useToast()
  const [sortBy, setSortBy] = useState<SortBy>("latest")

  const {
    posts, loading, loadingMore, hasMore,
    error, reload, loadMore, setSortBy: setFeedSort,
  } = useFeed({ autoLoad: true, initialLimit: 20, sortBy })

  useRealtimeFeed({
    onUpdate: () => {
      toast.info("New posts available!", {
        action: { label: "Refresh", onClick: () => reload() },
      })
    },
  })

  const handleSortChange = useCallback((sort: SortBy) => {
    setSortBy(sort)
    setFeedSort(sort)
  }, [setFeedSort])

  const handlePostCreated = useCallback(() => {
    toast.success("Post shared!")
    reload()
  }, [reload, toast])

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) loadMore()
  }, [loading, loadingMore, hasMore, loadMore])

  return (
    <div className="feed-section">
      {/* Sort Tabs */}
      <div className="tabs-bar" style={{ marginBottom: 16 }}>
        {SORT_TABS.map(tab => (
          <button
            key={tab.value}
            className={`tab-btn ${sortBy === tab.value ? "active" : ""}`}
            onClick={() => handleSortChange(tab.value)}
          >
            {tab.label}
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