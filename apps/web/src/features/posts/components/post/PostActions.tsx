// components/post/PostActions.tsx
import { useCallback, memo } from "react"
import type { Post } from "../../types/post.types"
import { usePostActions } from "../../hooks/usePostActions"
import { useAuthStore } from "@/features/auth/auth.store"
import { useToast } from "@/features/posts/hooks/useToast" // ✅ Fixed import path

type Props = {
  post: Post
  onLike?: () => void
  onShare?: () => void
  onToggleComments: () => void
  onDelete?: () => void
  showComments?: boolean
  isLoading?: boolean
}

function PostActions({
  post,
  onLike,
  onShare,
  onToggleComments,
  onDelete,
  showComments = false,
  isLoading = false,
}: Props) {
  const user = useAuthStore((state) => state.user)
  const toast = useToast()
  
  const { toggleLike, deletePost, loading: actionLoading } = usePostActions({
    optimisticUpdates: true,
    onError: (action, postId, error) => {
      toast.error(error.message || `Failed to ${action} post`)
    }
  })
  
  const canDelete = user?.role === "admin" || user?.id === post.author.id
  const isLoadingAction = isLoading || (actionLoading && post.id === post.id)
  
  const handleLike = useCallback(async () => {
    if (isLoadingAction) return
    
    const success = await toggleLike(post.id, post.is_liked ?? false)
    
    if (success) {
      onLike?.()
    }
  }, [post.id, post.is_liked, toggleLike, isLoadingAction, onLike])
  
  const handleShare = useCallback(async () => {
    const shareData = {
      title: post.title || 'Check out this post',
      text: post.content.slice(0, 100),
      url: `${window.location.origin}/posts/${post.id}`,
    }
    
    try {
      if (navigator.share && window.innerWidth < 768) {
        await navigator.share(shareData)
        toast.success('Shared successfully!', { duration: 2000 })
      } else {
        await navigator.clipboard.writeText(shareData.url)
        toast.success('Link copied to clipboard!', { duration: 2000 })
      }
      onShare?.()
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Failed to share')
      }
    }
  }, [post, toast, onShare])
  
  const handleDelete = useCallback(async () => {
    if (!canDelete) {
      toast.warning("You don't have permission to delete this post")
      return
    }
    
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this post? This action cannot be undone."
    )
    
    if (!confirmDelete) return
    
    const success = await deletePost(post.id)
    
    if (success) {
      onDelete?.()
    }
  }, [canDelete, post.id, deletePost, onDelete, toast])
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent, action: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      switch(action) {
        case 'like':
          handleLike()
          break
        case 'comment':
          onToggleComments()
          break
        case 'share':
          handleShare()
          break
        case 'delete':
          handleDelete()
          break
      }
    }
  }, [handleLike, onToggleComments, handleShare, handleDelete])
  
  // Format count for display (K, M)
  const formatCount = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
    return count.toString()
  }
  
  return (
    <div className="post-actions" role="group" aria-label="Post actions">
      {/* LIKE BUTTON */}
      <button
        type="button"
        className={`post-action ${post.is_liked ? "active" : ""}`}
        onClick={handleLike}
        onKeyDown={(e) => handleKeyDown(e, 'like')}
        disabled={isLoadingAction}
        aria-label={post.is_liked ? "Unlike post" : "Like post"}
        aria-pressed={post.is_liked}
      >
        <span className="action-icon">
          {post.is_liked ? "❤️" : "🤍"}
        </span>
        <span className="action-text">
          {post.is_liked ? "Liked" : "Like"}
        </span>
        {post.reactions_count > 0 && (
          <span className="action-count">{formatCount(post.reactions_count)}</span>
        )}
      </button>
      
      {/* COMMENT BUTTON */}
      <button
        type="button"
        className={`post-action ${showComments ? "active" : ""}`}
        onClick={onToggleComments}
        onKeyDown={(e) => handleKeyDown(e, 'comment')}
        aria-label={showComments ? "Hide comments" : "View comments"}
        aria-expanded={showComments}
      >
        <span className="action-icon">💬</span>
        <span className="action-text">
          {showComments ? "Hide" : "Comment"}
        </span>
        {post.comments_count > 0 && (
          <span className="action-count">{formatCount(post.comments_count)}</span>
        )}
      </button>
      
      {/* SHARE BUTTON */}
      <button
        type="button"
        className="post-action"
        onClick={handleShare}
        onKeyDown={(e) => handleKeyDown(e, 'share')}
        aria-label="Share post"
      >
        <span className="action-icon">🔗</span>
        <span className="action-text">Share</span>
        {post.saves_count && post.saves_count > 0 && (
          <span className="action-count">{formatCount(post.saves_count)}</span>
        )}
      </button>
      
      {/* DELETE BUTTON (conditionally rendered) */}
      {canDelete && (
        <button
          type="button"
          className="post-action danger"
          onClick={handleDelete}
          onKeyDown={(e) => handleKeyDown(e, 'delete')}
          disabled={isLoadingAction}
          aria-label="Delete post"
        >
          <span className="action-icon">🗑️</span>
          <span className="action-text">Delete</span>
        </button>
      )}
    </div>
  )
}

// Custom comparison for memoization
const areEqual = (prevProps: Props, nextProps: Props): boolean => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.is_liked === nextProps.post.is_liked &&
    prevProps.post.reactions_count === nextProps.post.reactions_count &&
    prevProps.post.comments_count === nextProps.post.comments_count &&
    prevProps.post.saves_count === nextProps.post.saves_count &&
    prevProps.showComments === nextProps.showComments &&
    prevProps.isLoading === nextProps.isLoading
  )
}

export default memo(PostActions, areEqual)