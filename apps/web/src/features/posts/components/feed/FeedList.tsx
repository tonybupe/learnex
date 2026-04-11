// components/feed/FeedList.tsx
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
  onScrollToTop?: () => void
  showScrollTop?: boolean
}

function FeedList({ 
  posts, 
  loading, 
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  error = null,
  onRetry,
  onScrollToTop,
  showScrollTop = true
}: Props) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [optimisticPosts, setOptimisticPosts] = useState<Post[]>([])
  
  // Debug: Log when posts prop changes
  useEffect(() => {
    console.log('[FeedList] Posts prop received:', {
      count: posts.length,
      sample: posts.slice(0, 2).map(p => ({ id: p.id, content: p.content?.substring(0, 30) }))
    })
  }, [posts])
  
  // Debug: Log loading state
  useEffect(() => {
    console.log('[FeedList] Loading state:', loading)
  }, [loading])
  
  // Combine real posts with optimistic ones
  const allPosts = [...optimisticPosts, ...posts]
  
  // Debug: Log combined posts
  useEffect(() => {
    console.log('[FeedList] All posts count (optimistic + real):', allPosts.length)
  }, [allPosts.length])
  
  // Handle new post creation (optimistic update)
  const handleNewPost = useCallback((newPost: Post) => {
    if (newPost && newPost.is_optimistic) {
      // Add optimistic post to the top
      setOptimisticPosts(prev => [newPost, ...prev])
      
      // Remove optimistic post after 2 seconds if no confirmation
      setTimeout(() => {
        setOptimisticPosts(prev => prev.filter(p => p.id !== newPost.id))
      }, 5000)
    } else if (newPost) {
      // Real post received - remove any matching optimistic post
      setOptimisticPosts(prev => prev.filter(p => p.id !== newPost.id))
    }
  }, [])
  
  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || loading || loadingMore) return
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          onLoadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )
    
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [onLoadMore, hasMore, loading, loadingMore])
  
  // Track scroll position for back to top button
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop
        setShowBackToTop(scrollTop > 500)
      }
    }
    
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])
  
  const handleScrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
    onScrollToTop?.()
  }, [onScrollToTop])
  
  // Loading skeleton with shimmer effect
  const renderSkeleton = () => (
    <div className="feed-loading">
      <div className="skeleton-loader">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton-post shimmer">
            <div className="skeleton-header">
              <div className="skeleton-avatar" />
              <div className="skeleton-info">
                <div className="skeleton-line" style={{ width: '120px' }} />
                <div className="skeleton-line" style={{ width: '80px' }} />
              </div>
            </div>
            <div className="skeleton-content">
              <div className="skeleton-line" style={{ width: '90%' }} />
              <div className="skeleton-line" style={{ width: '70%' }} />
              <div className="skeleton-line" style={{ width: '50%' }} />
            </div>
            <div className="skeleton-actions">
              <div className="skeleton-button" />
              <div className="skeleton-button" />
              <div className="skeleton-button" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
  
  // Error state with retry
  const renderError = () => (
    <div className="feed-error">
      <div className="error-icon">⚠️</div>
      <h3>Failed to load feed</h3>
      <p>{error || "Something went wrong. Please try again."}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          <span className="retry-icon">🔄</span>
          Try Again
        </button>
      )}
    </div>
  )
  
  // Empty state with illustration
  const renderEmpty = () => (
    <div className="feed-empty">
      <div className="empty-illustration">
        <div className="empty-icon">📝</div>
      </div>
      <h3>No posts yet</h3>
      <p>Be the first to share something with your class!</p>
      <div className="empty-tips">
        <span>✨ Share your thoughts</span>
        <span>📸 Add images or videos</span>
        <span>💬 Start a discussion</span>
      </div>
    </div>
  )
  
  // Loading more indicator
  const renderLoadingMore = () => (
    <div className="feed-load-more">
      <div className="loading-spinner">
        <div className="spinner" />
        <span>Loading more posts...</span>
      </div>
    </div>
  )
  
  // End of feed indicator
  const renderEndOfFeed = () => (
    <div className="feed-end">
      <div className="end-icon">✨</div>
      <span>You've seen everything</span>
      <span className="end-subtitle">Check back later for new posts!</span>
    </div>
  )
  
  // Loading state
  if (loading && allPosts.length === 0) {
    console.log('[FeedList] Rendering skeleton (loading)')
    return renderSkeleton()
  }
  
  // Error state
  if (error && allPosts.length === 0) {
    console.log('[FeedList] Rendering error state')
    return renderError()
  }
  
  // Empty state
  if (!allPosts.length) {
    console.log('[FeedList] Rendering empty state (no posts)')
    return renderEmpty()
  }
  
  console.log('[FeedList] Rendering posts, count:', allPosts.length)
  
  return (
    <div className="feed-list-container" ref={containerRef}>
      <div className="feed-list">
        {allPosts.map((post, index) => (
          <FeedPost 
            key={post.id} 
            post={post} 
            isOptimistic={post.is_optimistic}
            animationDelay={index < 5 ? index * 0.05 : 0}
          />
        ))}
      </div>
      
      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="feed-load-more-wrapper">
          {loadingMore ? renderLoadingMore() : (
            <div className="feed-scroll-trigger">
              <span>Scroll for more</span>
              <div className="scroll-indicator">↓</div>
            </div>
          )}
        </div>
      )}
      
      {/* End of feed */}
      {!hasMore && allPosts.length > 0 && renderEndOfFeed()}
      
      {/* Back to top button */}
      {showScrollTop && showBackToTop && (
        <button 
          className="back-to-top"
          onClick={handleScrollToTop}
          aria-label="Back to top"
        >
          <span className="arrow-up">↑</span>
        </button>
      )}
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(FeedList, (prevProps, nextProps) => {
  // Only re-render if posts array changed or loading states changed
  if (prevProps.posts.length !== nextProps.posts.length) return false
  if (prevProps.loading !== nextProps.loading) return false
  if (prevProps.loadingMore !== nextProps.loadingMore) return false
  if (prevProps.error !== nextProps.error) return false
  return true
})