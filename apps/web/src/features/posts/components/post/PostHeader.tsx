// components/post/PostHeader.tsx
import { memo } from "react"
import type { Post } from "../../types/post.types"
import { formatPostDate } from "../../types/post.types"
import { UserAvatar } from "@/components/ui/UserAvatar"
import { getUserRole, canDeletePost as canDeletePostUtil } from "@/utils/user" // ✅ Renamed import
import { useAuthStore } from "@/features/auth/auth.store"

type Props = {
  post: Post
  onDelete?: () => void
  isDeleting?: boolean
  onEdit?: () => void
  canEdit?: boolean
}

function PostHeaderComponent({ 
  post, 
  onDelete, 
  isDeleting = false,
  onEdit,
  canEdit = false
}: Props) {
  const currentUser = useAuthStore((state) => state.user)
  const author = post.author
  const canDelete = canDeletePostUtil(currentUser, author.id) // ✅ Use renamed function
  const userRole = getUserRole(author)
  
  // Determine if current user is the author
  const isAuthor = currentUser?.id === author.id
  
  return (
    <div className="post-header">
      <div className="post-header-left">
        <UserAvatar 
          user={author} 
          size="sm" 
          withTooltip 
        />
        
        <div className="post-info">
          <div className="post-name">
            {author.full_name}
            {author.role === 'teacher' && (
              <span className="role-badge teacher" aria-label="Teacher">
                Teacher
              </span>
            )}
            {author.role === 'admin' && (
              <span className="role-badge admin" aria-label="Administrator">
                Admin
              </span>
            )}
            {isAuthor && (
              <span className="role-badge you" aria-label="You">
                You
              </span>
            )}
          </div>
          <div className="post-meta">
            {userRole} • {formatPostDate(post.created_at)}
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="post-header-actions">
        {/* Edit Button */}
        {(canEdit || isAuthor) && onEdit && (
          <button
            className="post-edit"
            onClick={onEdit}
            aria-label="Edit post"
            title="Edit post"
          >
            <span className="edit-icon">✏️</span>
          </button>
        )}
        
        {/* Delete Button */}
        {canDelete && onDelete && (
          <button
            className="post-delete"
            onClick={onDelete}
            disabled={isDeleting}
            aria-label="Delete post"
            title="Delete post"
          >
            {isDeleting ? (
              <span className="spinner-small" />
            ) : (
              <span className="delete-icon">🗑️</span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Custom comparison for memoization
const areEqual = (prevProps: Props, nextProps: Props): boolean => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.content === nextProps.post.content &&
    prevProps.post.author.id === nextProps.post.author.id &&
    prevProps.post.created_at === nextProps.post.created_at &&
    prevProps.isDeleting === nextProps.isDeleting
  )
}

export const PostHeader = memo(PostHeaderComponent, areEqual)