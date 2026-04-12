import { memo, useState, useCallback } from "react"
import type { Comment } from "../../types/post.types"
import { UserAvatar } from "@/components/ui/UserAvatar"
import { useAuthStore } from "@/features/auth/auth.store"
import { canDeleteComment } from "@/utils/user"
import { formatPostDate } from "../../types/post.types"

type Props = {
  comment: Comment
  onDelete?: (commentId: number) => Promise<boolean>
  onReply?: (content: string) => Promise<boolean>
  depth?: number
}

function CommentItem({ comment, onDelete, onReply, depth = 0 }: Props) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [replyLoading, setReplyLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const currentUser = useAuthStore(s => s.user)
  const canDelete = canDeleteComment(currentUser, comment.author.id)
  const isOwner = currentUser?.id === comment.author.id

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return }
    setDeleting(true)
    await onDelete?.(comment.id)
    setDeleting(false)
    setConfirmDelete(false)
  }, [confirmDelete, comment.id, onDelete])

  const handleReplySubmit = useCallback(async () => {
    const text = replyText.trim()
    if (!text || replyLoading) return
    setReplyLoading(true)
    const content = `@${comment.author.full_name} ${text}`
    const success = await onReply?.(content)
    if (success) { setReplyText(""); setShowReply(false) }
    setReplyLoading(false)
  }, [replyText, replyLoading, comment.author.full_name, onReply])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReplySubmit() }
    if (e.key === "Escape") { setShowReply(false); setReplyText("") }
  }, [handleReplySubmit])

  return (
    <div className={`comment-item ${depth > 0 ? "comment-reply-item" : ""}`}>
      <UserAvatar user={comment.author} size="xs" />

      <div className="comment-bubble">
        <div className="comment-name">
          {comment.author.full_name}
          {comment.author.role !== "learner" && (
            <span className={`role-badge ${comment.author.role}`} style={{ marginLeft: 6 }}>
              {comment.author.role}
            </span>
          )}
        </div>
        <div className="comment-text">{comment.content}</div>
        <div className="comment-meta">
          <span>{formatPostDate(comment.created_at)}</span>
          {onReply && depth === 0 && (
            <button
              className="comment-delete"
              style={{ color: "var(--accent2)", fontWeight: 700 }}
              onClick={() => { setShowReply(v => !v); setReplyText("") }}
            >
              Reply
            </button>
          )}
          {canDelete && (
            confirmDelete
              ? <>
                  <button className="comment-delete" style={{ color: "var(--danger)" }} onClick={handleDelete} disabled={deleting}>Confirm?</button>
                  <button className="comment-delete" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </>
              : <button className="comment-delete" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "..." : isOwner ? "Delete" : "🗑️"}
                </button>
          )}
        </div>

        {/* Inline Reply Composer */}
        {showReply && (
          <div className="comment-composer" style={{ marginTop: 8 }}>
            <UserAvatar user={currentUser} size="xs" />
            <div className="comment-input-container">
              <input
                className="comment-input"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Reply to ${comment.author.full_name}...`}
                autoFocus
                maxLength={500}
              />
              <button
                className={`comment-submit ${replyText.trim() ? "active" : ""}`}
                onClick={handleReplySubmit}
                disabled={!replyText.trim() || replyLoading}
              >
                {replyLoading ? <span className="spinner-small" style={{ borderTopColor: "var(--accent)" }} /> : "➤"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(CommentItem)