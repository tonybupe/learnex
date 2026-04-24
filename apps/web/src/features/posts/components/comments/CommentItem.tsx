import { memo, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import type { Comment } from "../../types/post.types"
import { formatPostDate } from "../../types/post.types"
import { useAuthStore } from "@/features/auth/auth.store"
import { canDeleteComment } from "@/utils/user"
import { Heart, Trash2 } from "lucide-react"

type Props = {
  comment: Comment
  onDelete?: (id: number) => Promise<boolean>
  onReply?: (content: string) => Promise<boolean>
  depth?: number
}

function getBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1","") || "http://localhost:8000"
}
function resolveAvatar(url?: string | null) {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `${getBaseUrl()}${url}`
}

function Avatar({ user, size = 36, onClick }: { user: any; size?: number; onClick?: () => void }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[(user?.full_name?.charCodeAt(0) ?? 0) % colors.length]
  const url = resolveAvatar(user?.profile?.avatar_url)
  return (
    <div onClick={onClick} style={{ cursor: onClick ? "pointer" : "default", flexShrink: 0 }}>
      {url ? (
        <img src={url} alt={user?.full_name}
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38 }}>
          {user?.full_name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  )
}

function CommentItemComponent({ comment, onDelete, onReply, depth = 0 }: Props) {
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.user)
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [replyLoading, setReplyLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  const canDel = canDeleteComment(currentUser, comment.author.id)
  const isOwn = currentUser?.id === comment.author.id

  const handleDelete = useCallback(async () => {
    if (!window.confirm("Delete this comment?")) return
    setDeleting(true)
    await onDelete?.(comment.id)
    setDeleting(false)
  }, [comment.id, onDelete])

  const handleReplySubmit = useCallback(async () => {
    const text = replyText.trim()
    if (!text || replyLoading) return
    setReplyLoading(true)
    const success = await onReply?.(`@${comment.author.full_name} ${text}`)
    if (success) { setReplyText(""); setShowReply(false) }
    setReplyLoading(false)
  }, [replyText, replyLoading, comment.author.full_name, onReply])

  return (
    <div className={`x-comment ${depth > 0 ? "x-comment-reply" : ""}`}>
      {/* Thread line for replies */}
      {depth > 0 && <div className="x-thread-line" />}

      {/* Avatar */}
      <div className="x-comment-avatar">
        <Avatar user={comment.author} size={depth > 0 ? 28 : 36}
          onClick={() => navigate(`/profile/${comment.author.id}`)} />
        {/* Vertical thread line below avatar */}
        {showReply && <div className="x-avatar-line" />}
      </div>

      {/* Content */}
      <div className="x-comment-body">
        {/* Header */}
        <div className="x-comment-header">
          <span className="x-comment-name"
            onClick={() => navigate(`/profile/${comment.author.id}`)}
            style={{ cursor: "pointer" }}>
            {comment.author.full_name}
          </span>
          {comment.author.role !== "learner" && (
            <span className="x-comment-role">{comment.author.role}</span>
          )}
          <span className="x-comment-time">{formatPostDate(comment.created_at)}</span>
          {canDel && (
            <button className="x-comment-delete" onClick={handleDelete} disabled={deleting}
              title="Delete comment">
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {/* Text */}
        <div className="x-comment-text">{comment.content}</div>

        {/* Actions */}
        <div className="x-comment-actions">
          <button className={`x-comment-action ${liked ? "liked" : ""}`}
            onClick={() => { setLiked(l => !l); setLikeCount(c => liked ? c-1 : c+1) }}>
            <Heart size={13} fill={liked ? "currentColor" : "none"} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>

          {onReply && depth === 0 && (
            <button className="x-comment-action"
              onClick={() => { setShowReply(v => !v); if (!showReply) setTimeout(() => document.getElementById(`reply-${comment.id}`)?.focus(), 100) }}>
              Reply
            </button>
          )}
        </div>

        {/* Reply Composer */}
        {showReply && (
          <div className="x-reply-composer">
            <input
              id={`reply-${comment.id}`}
              className="x-reply-input"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReplySubmit() } if (e.key === "Escape") { setShowReply(false); setReplyText("") } }}
              placeholder={`Reply to ${comment.author.full_name}...`}
              maxLength={500}
            />
            <div className="x-reply-actions">
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{replyText.length}/500</span>
              <button className="btn" style={{ fontSize: 12, padding: "4px 12px" }}
                onClick={() => { setShowReply(false); setReplyText("") }}>Cancel</button>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: "4px 14px" }}
                onClick={handleReplySubmit} disabled={!replyText.trim() || replyLoading}>
                {replyLoading ? "..." : "Reply"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(CommentItemComponent)
