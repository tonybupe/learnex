import { memo } from "react"
import { useNavigate } from "react-router-dom"
import type { Post } from "../../types/post.types"
import { formatPostDate } from "../../types/post.types"
import { useAuthStore } from "@/features/auth/auth.store"
import { canDeletePost } from "@/utils/user"

type Props = {
  post: Post
  onDelete?: () => void
  isDeleting?: boolean
}

function getBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1","") || "http://localhost:8000"
}

function resolveAvatar(url?: string | null) {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `${getBaseUrl()}${url}`
}

const ROLE_COLORS: Record<string, string> = {
  teacher: "#cb26e4", admin: "#ef4444", learner: "#38bdf8"
}

function Avatar({ user, size = 40, onClick }: { user: any; size?: number; onClick?: () => void }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[(user?.full_name?.charCodeAt(0) ?? 0) % colors.length]
  const url = resolveAvatar(user?.profile?.avatar_url)

  return (
    <div onClick={onClick} style={{ cursor: onClick ? "pointer" : "default", flexShrink: 0 }}
      title={`View ${user?.full_name}'s profile`}>
      {url ? (
        <img src={url} alt={user?.full_name}
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", display: "block" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38, border: "2px solid var(--border)" }}>
          {user?.full_name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  )
}

function PostHeaderComponent({ post, onDelete, isDeleting = false }: Props) {
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.user)
  const author = post.author
  const canDel = canDeletePost(currentUser, author.id)
  const isAuthor = currentUser?.id === author.id

  const roleColor = ROLE_COLORS[author.role] ?? "var(--muted)"

  return (
    <div className="post-header">
      <div className="post-header-left">
        {/* Clickable Avatar */}
        <Avatar user={author} size={42} onClick={() => navigate(`/profile/${author.id}`)} />

        {/* Name + Meta */}
        <div className="post-info">
          <div className="post-name">
            <span
              style={{ cursor: "pointer", fontWeight: 800 }}
              onClick={() => navigate(`/profile/${author.id}`)}
              title={`View ${author.full_name}'s profile`}>
              {author.full_name}
            </span>
            {author.role !== "learner" && (
              <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}30`, marginLeft: 6 }}>
                {author.role}
              </span>
            )}
            {isAuthor && (
              <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: "rgba(34,197,94,0.12)", color: "var(--success)", border: "1px solid rgba(34,197,94,0.25)", marginLeft: 4 }}>
                you
              </span>
            )}
          </div>
          <div className="post-meta">
            {formatPostDate(post.created_at)}
            {post.classroom && <span> · {post.classroom.title}</span>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="post-header-actions">
        {canDel && onDelete && (
          <button className="post-delete" onClick={onDelete} disabled={isDeleting}
            title="Delete post" aria-label="Delete post">
            {isDeleting ? <span className="spinner-small" style={{ borderTopColor: "var(--danger)" }} /> : "🗑️"}
          </button>
        )}
      </div>
    </div>
  )
}

export const PostHeader = memo(PostHeaderComponent)
