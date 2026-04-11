// components/feed/FeedPost.tsx
import { useState, useCallback, memo, useRef, useEffect } from "react"
import type { Post } from "../../types/post.types"
import { usePostActions } from "../../hooks/usePostActions"
import { useToast } from "@/features/posts/hooks/useToast"
import { PostHeader } from "../post/PostHeader"
import PostContent from "../post/PostContent"
import PostActions from "../post/PostActions"
import PostStats from "../post/PostStats"
import PostComments from "../comments/PostComments"

type Props = {
  post: Post
  onPostUpdate?: (updatedPost: Post) => void
  onPostDelete?: (postId: number) => void
  isOptimistic?: boolean
  animationDelay?: number  // Add this prop
}

function FeedPost({ 
  post, 
  onPostUpdate, 
  onPostDelete, 
  isOptimistic = false,
  animationDelay = 0  // Default to 0
}: Props) {
  const [showComments, setShowComments] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [localPost, setLocalPost] = useState<Post>(post)
  const [error, setError] = useState<string | null>(null)
  
  const postRef = useRef<HTMLElement>(null)
  const toast = useToast()
  
  // Use enhanced post actions hook
  const { 
    toggleLike, 
    deletePost, 
    loading: actionLoading, 
    loadingPostId 
  } = usePostActions({
    optimisticUpdates: true,
    onSuccess: (action, postId) => {
      if (action === 'delete') {
        onPostDelete?.(postId)
        toast.success('Post deleted successfully', { duration: 3000 })
      }
    },
    onError: (action, postId, error) => {
      if (action === 'like') {
        // Revert optimistic update if needed
        setLocalPost(prev => ({
          ...prev,
          is_liked: !prev.is_liked,
          reactions_count: prev.is_liked 
            ? prev.reactions_count - 1 
            : prev.reactions_count + 1
        }))
        
        setError('Failed to update like. Please try again.')
        setTimeout(() => setError(null), 3000)
      }
      
      if (action === 'delete') {
        setError('Failed to delete post')
        setTimeout(() => setError(null), 3000)
      }
      
      toast.error(error.message || `Failed to ${action} post`)
    }
  })
  
  // Update local post when prop changes
  useEffect(() => {
    setLocalPost(post)
  }, [post])
  
  // Handle like toggle with optimistic update
  const handleLike = useCallback(async () => {
    if (actionLoading && loadingPostId === post.id) return
    
    // Optimistic update
    setLocalPost(prev => ({
      ...prev,
      is_liked: !prev.is_liked,
      reactions_count: prev.is_liked 
        ? prev.reactions_count - 1 
        : prev.reactions_count + 1
    }))
    
    // Notify parent for feed-level update
    onPostUpdate?.({
      ...localPost,
      is_liked: !localPost.is_liked,
      reactions_count: localPost.is_liked 
        ? localPost.reactions_count - 1 
        : localPost.reactions_count + 1
    })
    
    // Make API call
    const success = await toggleLike(post.id, localPost.is_liked || false)
    
    if (!success) {
      // Error already handled by hook, but we need to revert
      setLocalPost(prev => ({
        ...prev,
        is_liked: !prev.is_liked,
        reactions_count: prev.is_liked 
          ? prev.reactions_count - 1 
          : prev.reactions_count + 1
      }))
    }
  }, [post.id, localPost.is_liked, toggleLike, actionLoading, loadingPostId, onPostUpdate])
  
  // Handle delete with confirmation
  const handleDelete = useCallback(async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to delete this post? This action cannot be undone.'
    )
    
    if (!confirmed) return
    
    setIsDeleting(true)
    
    // Optimistic removal - animate out
    if (postRef.current) {
      postRef.current.style.opacity = '0'
      postRef.current.style.transform = 'translateY(-10px)'
    }
    
    const success = await deletePost(post.id)
    
    if (!success) {
      // Revert animation if failed
      if (postRef.current) {
        postRef.current.style.opacity = '1'
        postRef.current.style.transform = 'translateY(0)'
      }
      setIsDeleting(false)
    }
    // If success, component will be removed by parent
  }, [post.id, deletePost])
  
  // Handle share functionality
  const handleShare = useCallback(async () => {
    const shareData = {
      title: localPost.title || 'Check out this post',
      text: localPost.content.slice(0, 100),
      url: `${window.location.origin}/posts/${post.id}`,
    }
    
    try {
      if (navigator.share && window.innerWidth < 768) {
        // Use Web Share API on mobile
        await navigator.share(shareData)
        toast.success('Shared successfully!', { duration: 2000 })
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.url)
        toast.success('Link copied to clipboard!', { duration: 2000 })
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Failed to share')
      }
    }
  }, [localPost, post.id, toast])
  
  // Handle comment toggle with analytics
  const handleToggleComments = useCallback(() => {
    setShowComments(prev => !prev)
    
    // Optional: Track analytics
    if (!showComments) {
      // Track comment section opened
      console.debug('[Analytics] Comments opened for post:', post.id)
    }
  }, [showComments, post.id])
  
  // Handle comment added (update stats)
  const handleCommentAdded = useCallback(() => {
    setLocalPost(prev => ({
      ...prev,
      comments_count: prev.comments_count + 1
    }))
    
    onPostUpdate?.({
      ...localPost,
      comments_count: localPost.comments_count + 1
    })
  }, [localPost, onPostUpdate])
  
  // Handle comment deleted (update stats)
  const handleCommentDeleted = useCallback(() => {
    setLocalPost(prev => ({
      ...prev,
      comments_count: Math.max(0, prev.comments_count - 1)
    }))
    
    onPostUpdate?.({
      ...localPost,
      comments_count: Math.max(0, localPost.comments_count - 1)
    })
  }, [localPost, onPostUpdate])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 'l' key to like
      if (e.key === 'l' && document.activeElement === postRef.current) {
        e.preventDefault()
        handleLike()
      }
      // 'c' key to open comments
      if (e.key === 'c' && document.activeElement === postRef.current) {
        e.preventDefault()
        handleToggleComments()
      }
    }
    
    const postElement = postRef.current
    if (postElement) {
      postElement.addEventListener('keydown', handleKeyPress)
      return () => postElement.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleLike, handleToggleComments])
  
  // Loading state for this specific post
  const isLoading = actionLoading && loadingPostId === post.id
  
  // Animation style with delay
  const animationStyle = {
    animation: `fadeIn 0.3s ease ${animationDelay}s forwards`,
    opacity: 0,
    transform: 'translateY(10px)',
  }
  
  return (
    <article 
      ref={postRef}
      className={`feed-post ${isOptimistic ? 'optimistic' : ''} ${isDeleting ? 'deleting' : ''}`}
      data-post-id={post.id}
      tabIndex={0}
      aria-label={`Post by ${localPost.author.full_name}`}
      style={animationStyle}
    >
      {/* Error Toast for this post */}
      {error && (
        <div className="post-error-toast" role="alert">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      {/* Header */}
      <PostHeader 
        post={localPost} 
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />
      
      {/* Content */}
      <PostContent post={localPost} />
      
      {/* Stats */}
      <PostStats post={localPost} />
      
      {/* Actions */}
      <PostActions
        post={localPost}
        onLike={handleLike}
        onShare={handleShare}
        onToggleComments={handleToggleComments}
        onDelete={handleDelete}
        showComments={showComments}
        isLoading={isLoading}
      />
      
      {/* Comments Section */}
      {showComments && (
        <div className="post-comments">
          <PostComments 
            postId={post.id}
            onCommentAdded={handleCommentAdded}
            onCommentDeleted={handleCommentDeleted}
          />
        </div>
      )}
      
      {/* Loading Overlay (for delete) */}
      {isDeleting && (
        <div className="post-delete-overlay">
          <div className="spinner" />
          <span>Deleting...</span>
        </div>
      )}
    </article>
  )
}

// Memoize with custom comparison for better performance
export default memo(FeedPost, (prevProps, nextProps) => {
  // Only re-render if post data actually changed
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.content === nextProps.post.content &&
    prevProps.post.is_liked === nextProps.post.is_liked &&
    prevProps.post.reactions_count === nextProps.post.reactions_count &&
    prevProps.post.comments_count === nextProps.post.comments_count &&
    prevProps.isOptimistic === nextProps.isOptimistic
  )
})