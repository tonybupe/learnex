// components/comments/PostComments.tsx
import { useCallback, useRef, useEffect } from "react"
import { useComments } from "../../hooks/useComments"
import { useToast } from "@/features/posts/hooks/useToast"

import CommentComposer from "./CommentComposer"
import CommentList from "./CommentList"

type Props = {
  postId: number
  onCommentAdded?: () => void
  onCommentDeleted?: () => void
  autoFocus?: boolean
}

export default function PostComments({ 
  postId, 
  onCommentAdded, 
  onCommentDeleted,
  autoFocus = false 
}: Props) {
  const { 
    comments, 
    loading, 
    loadingMore,
    hasMore,
    error,
    addComment, 
    deleteComment,
    loadMore,
    reload 
  } = useComments(postId, {
    initialLimit: 10,
    autoLoad: true,
    enablePolling: false,
  })
  
  const commentsContainerRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  
  // Handle comment added
  const handleAddComment = useCallback(async (content: string) => {
    const success = await addComment(content)
    if (success) {
      onCommentAdded?.()
      
      // Scroll to new comment if it's at the top (newest first)
      if (commentsContainerRef.current) {
        setTimeout(() => {
          commentsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }, 100)
      }
    }
    return success
  }, [addComment, onCommentAdded])
  
  // Handle comment deleted
  const handleDeleteComment = useCallback(async (commentId: number) => {
    const success = await deleteComment(commentId)
    if (success) {
      onCommentDeleted?.()
      toast.success('Comment deleted', { duration: 2000 })
    }
    return success
  }, [deleteComment, onCommentDeleted, toast])
  
  // Handle retry on error
  const handleRetry = useCallback(() => {
    reload()
  }, [reload])
  
  // Auto-scroll to comments when opened
  useEffect(() => {
    if (autoFocus && commentsContainerRef.current) {
      setTimeout(() => {
        const commentInput = document.querySelector<HTMLInputElement>('.comment-composer input')
        commentInput?.focus()
      }, 100)
    }
  }, [autoFocus])
  
  // Handle infinite scroll for comments
  useEffect(() => {
    const handleScroll = () => {
      if (!commentsContainerRef.current) return
      
      const { scrollTop, scrollHeight, clientHeight } = commentsContainerRef.current
      // Load more when scrolled to bottom (with 100px threshold)
      if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !loadingMore) {
        loadMore()
      }
    }
    
    const container = commentsContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [hasMore, loadingMore, loadMore])
  
  // Show error state
  if (error && comments.length === 0) {
    return (
      <div className="comments-error">
        <div className="error-icon">💬</div>
        <p>Failed to load comments</p>
        <p className="error-message">{error}</p>
        <button onClick={handleRetry} className="retry-btn">
          Try Again
        </button>
      </div>
    )
  }
  
  return (
    <div className="post-comments" ref={commentsContainerRef}>
      {/* Comment Composer */}
      <CommentComposer 
        onSubmit={handleAddComment} 
        autoFocus={autoFocus}
        disabled={loading}
      />
      
      {/* Comments List */}
      <CommentList
        comments={comments}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onDelete={handleDeleteComment}
        onLoadMore={loadMore}
      />
      
      {/* Loading More Indicator */}
      {loadingMore && (
        <div className="comments-loading-more">
          <div className="spinner-small" />
          <span>Loading more comments...</span>
        </div>
      )}
      
      {/* End of Comments */}
      {!hasMore && comments.length > 0 && (
        <div className="comments-end">
          <span>✨ End of comments ✨</span>
        </div>
      )}
      
      {/* Empty State */}
      {!loading && comments.length === 0 && !error && (
        <div className="comments-empty">
          <div className="empty-icon">💭</div>
          <p>No comments yet</p>
          <p className="empty-subtitle">Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  )
}