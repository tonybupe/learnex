import { useNavigate } from "react-router-dom"
import type { Notification } from "../types/notification.types"

const ICONS: Record<string, string> = {
  follow:         "👤",
  like:           "❤️",
  reaction:       "❤️",
  comment:        "💬",
  class_invite:   "🎓",
  class_join:     "🎓",
  new_lesson:     "📖",
  lesson:         "📖",
  quiz_grade:     "📝",
  quiz:           "📝",
  live_session:   "🎥",
  live:           "🎥",
  announcement:   "📢",
  new_post:       "📣",
  post:           "📣",
  message:        "💌",
  reminder:       "⏰",
  system:         "🔔",
  default:        "🔔",
}

// Build the correct route from notification data
function resolveRoute(n: Notification): string | null {
  // Use action_url if provided
  if (n.action_url) {
    // If it starts with http, open externally — else use as path
    if (n.action_url.startsWith("http")) return null
    return n.action_url
  }

  const { entity_type, entity_id, notification_type } = n

  // Route by entity_type + entity_id
  if (entity_type && entity_id) {
    switch (entity_type.toLowerCase()) {
      case "class":
      case "classroom":   return "/classes"
      case "lesson":      return "/lessons"
      case "quiz":        return "/quizzes"
      case "post":        return "/feed"
      case "user":        return `/profile/${entity_id}`
      case "live":
      case "live_session": return "/live-sessions"
      case "message":     return "/messages"
    }
  }

  // Route by notification_type
  switch (notification_type?.toLowerCase()) {
    case "follow":        return "/profile"
    case "class_invite":
    case "class_join":    return "/classes"
    case "new_lesson":
    case "lesson":        return "/lessons"
    case "quiz_grade":
    case "quiz":          return "/quizzes"
    case "live_session":
    case "live":          return "/live-sessions"
    case "comment":
    case "like":
    case "reaction":
    case "new_post":
    case "post":          return "/feed"
    case "message":       return "/messages"
    case "announcement":  return "/feed"
  }

  return null
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

type Props = {
  notification: Notification
  onRead: (id: number) => void
  onClose: () => void
}

export default function NotificationItem({ notification: n, onRead, onClose }: Props) {
  const navigate = useNavigate()
  const icon = ICONS[n.notification_type] ?? ICONS[n.entity_type ?? ""] ?? ICONS.default
  const route = resolveRoute(n)
  const isClickable = !!route

  const handleClick = () => {
    if (!n.is_read) onRead(n.id)
    if (n.action_url?.startsWith("http")) {
      window.open(n.action_url, "_blank")
    } else if (route) {
      navigate(route)
      onClose()
    }
  }

  return (
    <div
      className={`notification-item ${n.is_read ? "" : "unread"} ${isClickable ? "clickable" : ""}`}
      onClick={handleClick}
      title={isClickable ? "Click to view" : undefined}
      style={{ cursor: isClickable ? "pointer" : "default" }}
    >
      <div className="notif-icon">{icon}</div>
      <div className="notif-content">
        {n.title && <div className="notif-title">{n.title}</div>}
        <div className="notification-message">{n.message}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          <div className="notification-time">{timeAgo(n.created_at)}</div>
          {isClickable && (
            <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>
              View →
            </span>
          )}
        </div>
      </div>
      {!n.is_read && <div className="notif-dot" />}
    </div>
  )
}
