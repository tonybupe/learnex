// components/comments/CommentItem.tsx
import { memo, useState, useCallback, useRef, useEffect } from "react"
import type { Comment } from "../../types/post.types"
import { UserAvatar } from "@/components/ui/UserAvatar"
import { useAuthStore } from "@/features/auth/auth.store"
import { useToast } from "@/features/posts/hooks/useToast" // ✅ Fixed import path
import { canDeleteComment, getUserRole } from "@/utils/user"
import { formatPostDate } from "../../types/post.types"

type Props = {
  comment: Comment
  onDelete?: (commentId: number) => Promise<boolean>
  isDeleting?: boolean
  onReply?: (commentId: number, authorName: string) => void
  isHighlighted?: boolean
  animationDelay?: number // ✅ Add animationDelay prop
}

function CommentItem({ 
  comment, 
  onDelete, 
  isDeleting: externalDeleting = false,
  onReply,
  isHighlighted = false,
  animationDelay = 0 // ✅ Default to 0
}: Props) {
  // =========================================
  // STATE
  // =========================================
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  // =========================================
  // REFS
  // =========================================
  const confirmTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const itemRef = useRef<HTMLDivElement>(null)
  
  // =========================================
  // HOOKS
  // =========================================
  const currentUser = useAuthStore((state) => state.user)
  const toast = useToast()
  
  // =========================================
  // DERIVED STATE
  // =========================================
  const canDelete = canDeleteComment(currentUser, comment.author.id)
  const isLoading = isDeleting || externalDeleting
  const isOwner = currentUser?.id === comment.author.id
  const formattedDate = formatPostDate(comment.created_at)
  const userRole = getUserRole(comment.author)
  
  // Animation style with delay
  const animationStyle = {
    animation: `commentFadeIn 0.3s ease ${animationDelay}s forwards`,
    opacity: 0,
    transform: 'translateY(8px)',
  }
  
  // =========================================
  // EFFECTS
  // =========================================
  
  // Auto-hide delete confirmation after timeout
  useEffect(() => {
    if (showDeleteConfirm) {
      confirmTimeoutRef.current = setTimeout(() => {
        setShowDeleteConfirm(false)
      }, 3000)
    }
    
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current)
      }
    }
  }, [showDeleteConfirm])
  
  // Scroll into view if highlighted
  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Add temporary highlight class
      itemRef.current.classList.add('highlighted')
      setTimeout(() => {
        itemRef.current?.classList.remove('highlighted')
      }, 2000)
    }
  }, [isHighlighted])
  
  // =========================================
  // HANDLERS
  // =========================================
  
  /**
   * Handle comment deletion with confirmation
   */
  const handleDelete = useCallback(async () => {
    if (!canDelete) {
      toast.warning("You don't have permission to delete this comment")
      return
    }
    
    // If already in confirmation mode, execute delete
    if (showDeleteConfirm) {
      setIsDeleting(true)
      
      try {
        if (onDelete) {
          const success = await onDelete(comment.id)
          if (success) {
            toast.success("Comment deleted", { duration: 2000 })
          } else {
            toast.error("Failed to delete comment")
          }
        }
      } catch (err) {
        toast.error("Failed to delete comment")
      } finally {
        setIsDeleting(false)
        setShowDeleteConfirm(false)
      }
    } else {
      // Show confirmation first
      setShowDeleteConfirm(true)
    }
  }, [canDelete, comment.id, onDelete, showDeleteConfirm, toast])
  
  /**
   * Cancel delete confirmation
   */
  const cancelDelete = useCallback(() => {
    setShowDeleteConfirm(false)
  }, [])
  
  /**
   * Handle reply to comment
   */
  const handleReply = useCallback(() => {
    if (onReply) {
      onReply(comment.id, comment.author.full_name)
    }
  }, [comment.id, comment.author.full_name, onReply])
  
  /**
   * Handle keydown events for accessibility
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && canDelete && !isLoading) {
      e.preventDefault()
      handleDelete()
    }
    if (e.key === 'r' && onReply) {
      e.preventDefault()
      handleReply()
    }
  }, [canDelete, isLoading, handleDelete, onReply, handleReply])
  
  // =========================================
  // RENDER
  // =========================================
  
  return (
    <div 
      ref={itemRef}
      className={`comment-item ${isLoading ? 'deleting' : ''} ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Comment by ${comment.author.full_name}`}
      style={animationStyle}
      data-comment-id={comment.id}
    >
      {/* Avatar */}
      <UserAvatar 
        user={comment.author} 
        size="sm" 
        className="comment-avatar"
        withTooltip
      />
      
      {/* Comment Content */}
      <div className="comment-content">
        <div className="comment-header">
          <div className="comment-author-info">
            <span className="comment-author">{comment.author.full_name}</span>
            <span className="comment-date" title={new Date(comment.created_at).toLocaleString()}>
              {formattedDate}
            </span>
          </div>
          
          {/* Role Badge */}
          {comment.author.role !== 'learner' && (
            <span className={`role-badge ${comment.author.role}`}>
              {userRole}
            </span>
          )}
        </div>
        
        <p className="comment-text">{comment.content}</p>
        
        {/* Comment Actions */}
        <div className="comment-footer">
          {onReply && isHovered && !isLoading && (
            <button
              type="button"
              className="comment-reply"
              onClick={handleReply}
              aria-label={`Reply to ${comment.author.full_name}`}
            >
              <span className="reply-icon">↩️</span>
              <span>Reply</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Delete Button */}
      {canDelete && (
        <div className="comment-actions">
          {showDeleteConfirm ? (
            <div 
              className="delete-confirm"
              role="dialog"
              aria-label="Confirm delete"
            >
              <span className="confirm-text">Delete?</span>
              <button 
                onClick={handleDelete} 
                className="confirm-yes"
                disabled={isLoading}
                aria-label="Confirm delete comment"
              >
                Yes
              </button>
              <button 
                onClick={cancelDelete} 
                className="confirm-no"
                disabled={isLoading}
                aria-label="Cancel delete"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className={`comment-delete ${isOwner ? 'owner' : ''}`}
              disabled={isLoading}
              aria-label="Delete comment"
              title="Delete comment (Delete key)"
            >
              {isLoading ? (
                <span className="spinner-small" />
              ) : (
                <span>🗑️</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Custom comparison for memoization
const areEqual = (prevProps: Props, nextProps: Props): boolean => {
  return (
    prevProps.comment.id === nextProps.comment.id &&
    prevProps.comment.content === nextProps.comment.content &&
    prevProps.comment.is_liked === nextProps.comment.is_liked &&
    prevProps.comment.likes_count === nextProps.comment.likes_count &&
    prevProps.isDeleting === nextProps.isDeleting &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.animationDelay === nextProps.animationDelay
  )
}

export default memo(CommentItem, areEqual)