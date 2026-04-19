// components/comments/CommentList.tsx
import { memo, useRef, useEffect, useState, useCallback } from "react"
import type { Comment } from "../../types/post.types"
import CommentItem from "./CommentItem"

type Props = {
  comments: Comment[]
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  onDelete?: (commentId: number) => Promise<boolean>
  onLoadMore?: () => void
  onCommentReply?: (commentId: number, authorName: string) => void
  highlightedCommentId?: number | null
}

function CommentList({ 
  comments, 
  loading = false,
  loadingMore = false,
  hasMore = false,
  onDelete,
  onLoadMore,
  onCommentReply,
  highlightedCommentId = null
}: Props) {
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAutoLoading, setIsAutoLoading] = useState(false)
  
  // Setup infinite scroll for comments
  useEffect(() => {
    if (!onLoadMore || !hasMore || loading || loadingMore || isAutoLoading) return
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !isAutoLoading) {
          setIsAutoLoading(true)
          onLoadMore()
          // Reset auto-loading flag after a delay
          setTimeout(() => setIsAutoLoading(false), 500)
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: '100px' 
      }
    )
    
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [onLoadMore, hasMore, loading, loadingMore, isAutoLoading])
  
  // Scroll to highlighted comment
  useEffect(() => {
    if (highlightedCommentId && containerRef.current) {
      const highlightedElement = containerRef.current.querySelector(`[data-comment-id="${highlightedCommentId}"]`)
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [highlightedCommentId, comments])
  
  // Handle manual load more
  const handleLoadMore = useCallback(() => {
    if (!onLoadMore || loadingMore || loading || !hasMore) return
    onLoadMore()
  }, [onLoadMore, loadingMore, loading, hasMore])
  
  // Loading skeleton with shimmer effect
  const renderSkeleton = () => (
    <div className="comment-list-loading">
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton-comment shimmer">
          <div className="skeleton-avatar" />
          <div className="skeleton-content">
            <div className="skeleton-header">
              <div className="skeleton-line" style={{ width: '120px' }} />
              <div className="skeleton-line" style={{ width: '80px' }} />
            </div>
            <div className="skeleton-line" style={{ width: '90%' }} />
            <div className="skeleton-line" style={{ width: '70%' }} />
          </div>
        </div>
      ))}
    </div>
  )
  
  // Empty state with illustration
  const renderEmpty = () => (
    <div className="comment-list-empty">
      <div className="empty-illustration">
        <div className="empty-icon">💭</div>
      </div>
      <h4>No comments yet</h4>
      <p className="empty-subtitle">Be the first to share your thoughts!</p>
      <div className="empty-tips">
        <span>✨ Start a conversation</span>
        <span>💬 Share your insights</span>
      </div>
    </div>
  )
  
  // Loading more indicator
  const renderLoadingMore = () => (
    <div className="comment-load-more">
      <div className="loading-spinner">
        <div className="spinner" />
        <span>Loading more comments...</span>
      </div>
    </div>
  )
  
  // End of comments indicator
  const renderEndOfComments = () => (
    <div className="comment-list-end">
      <div className="end-icon">✨</div>
      <span>End of comments</span>
      <span className="end-subtitle">That's all for now</span>
    </div>
  )
  
  // Loading state
  if (loading && comments.length === 0) {
    return renderSkeleton()
  }
  
  // Empty state
  if (!loading && comments.length === 0) {
    return renderEmpty()
  }
  
  return (
    <div className="comment-list-container" ref={containerRef}>
      <div className="comment-list">
        {comments.map((comment, index) => (
          <CommentItem 
            key={comment.id} 
            comment={comment} 
            onDelete={onDelete}
            onReply={onCommentReply as any}
            // isHighlighted={highlightedCommentId === comment.id}
            // animationDelay={index < 5 ? index * 0.05 : 0}
          />
        ))}
      </div>
      
      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="comment-load-more-wrapper">
          {loadingMore ? (
            renderLoadingMore()
          ) : (
            <button 
              onClick={handleLoadMore} 
              className="load-more-btn"
              aria-label="Load more comments"
            >
              <span className="btn-icon">↓</span>
              <span>Load more comments</span>
            </button>
          )}
        </div>
      )}
      
      {/* End of Comments */}
      {!hasMore && comments.length > 0 && renderEndOfComments()}
    </div>
  )
}

// Custom comparison for memoization
const areEqual = (prevProps: Props, nextProps: Props): boolean => {
  // Only re-render if comments array changed or loading states changed
  if (prevProps.comments.length !== nextProps.comments.length) return false
  if (prevProps.loading !== nextProps.loading) return false
  if (prevProps.loadingMore !== nextProps.loadingMore) return false
  if (prevProps.hasMore !== nextProps.hasMore) return false
  if (prevProps.highlightedCommentId !== nextProps.highlightedCommentId) return false
  
  // Deep check comments only if lengths are equal
  for (let i = 0; i < prevProps.comments.length; i++) {
    if (prevProps.comments[i].id !== nextProps.comments[i].id) return false
    if (prevProps.comments[i].content !== nextProps.comments[i].content) return false
    if (prevProps.comments[i].likes_count !== nextProps.comments[i].likes_count) return false
  }
  
  return true
}

export default memo(CommentList, areEqual)