import { useRef, useCallback, useEffect, memo, useState } from "react"
import FeedPost from "./FeedPost"
import type { Post } from "../../types/post.types"

type Props = {
  posts: Post[]
  loading: boolean
  loadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  error?: string | null
  onRetry?: () => void
}

function FeedList({ posts, loading, loadingMore = false, hasMore = false, onLoadMore, error = null, onRetry }: Props) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)

  // Infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || loading || loadingMore) return
    observerRef.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) onLoadMore() },
      { threshold: 0.1, rootMargin: "100px" }
    )
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current)
    return () => observerRef.current?.disconnect()
  }, [onLoadMore, hasMore, loading, loadingMore])

  // Back to top
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 500)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleScrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: "smooth" }), [])

  if (loading && posts.length === 0) return (
    <div className="feed-loading">
      {[1,2,3].map(i => (
        <div key={i} className="skeleton-post">
          <div className="skeleton-header">
            <div className="skeleton-avatar" />
            <div className="skeleton-info">
              <div className="skeleton-line" style={{ width: "140px" }} />
              <div className="skeleton-line" style={{ width: "90px" }} />
            </div>
          </div>
          <div className="skeleton-content">
            <div className="skeleton-line" style={{ width: "92%" }} />
            <div className="skeleton-line" style={{ width: "75%" }} />
            <div className="skeleton-line" style={{ width: "55%" }} />
          </div>
          <div className="skeleton-actions">
            <div className="skeleton-button" />
            <div className="skeleton-button" />
            <div className="skeleton-button" />
          </div>
        </div>
      ))}
    </div>
  )

  if (error && posts.length === 0) return (
    <div className="feed-error">
      <span className="error-icon">⚠️</span>
      <h3>Failed to load feed</h3>
      <p>{error}</p>
      {onRetry && <button className="retry-btn" onClick={onRetry}>🔄 Try Again</button>}
    </div>
  )

  if (!loading && posts.length === 0) return (
    <div className="feed-empty">
      <span className="empty-icon">📝</span>
      <h3>No posts yet</h3>
      <p>Be the first to share something!</p>
      <div className="empty-tips">
        <span>✨ Share your thoughts</span>
        <span>📸 Add images</span>
        <span>💬 Start a discussion</span>
      </div>
    </div>
  )

  return (
    <div className="feed-list-container">
      <div className="feed-list">
        {posts.map((post, index) => (
          <FeedPost
            key={`post-${post.id}`}
            post={post}
            isOptimistic={post.is_optimistic}
            animationDelay={index < 5 ? index * 0.05 : 0}
          />
        ))}
      </div>

      {hasMore && (
        <div ref={loadMoreRef} className="feed-load-more-wrapper">
          {loadingMore
            ? <div className="feed-load-more"><div className="loading-spinner"><div className="spinner" /><span>Loading more...</span></div></div>
            : <div className="feed-scroll-trigger"><span className="scroll-indicator">↓</span></div>
          }
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="feed-end">
          <span className="end-icon">✨</span>
          <span>You're all caught up!</span>
          <span className="end-subtitle">Check back later for new posts</span>
        </div>
      )}

      {showBackToTop && (
        <button className="back-to-top" onClick={handleScrollToTop} aria-label="Back to top">↑</button>
      )}
    </div>
  )
}

export default memo(FeedList)