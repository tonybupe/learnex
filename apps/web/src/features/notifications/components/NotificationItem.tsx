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

// Valid app routes (must match App.tsx exactly)
// /home /feed /classes /classes/discover /lessons /quizzes
// /live-sessions /messages /analytics /discover /settings
// /profile/:userId /subjects /teacher/dashboard /learner/dashboard /admin/dashboard

function resolveRoute(n: Notification): string | null {
  // Use action_url first if it is an internal path
  if (n.action_url && !n.action_url.startsWith("http")) {
    return n.action_url
  }

  const type = (n.notification_type ?? "").toLowerCase()
  const entity = (n.entity_type ?? "").toLowerCase()
  const id = n.entity_id

  // Route by entity_type
  if (entity) {
    switch (entity) {
      case "class":
      case "classroom":    return "/classes"
      case "lesson":       return "/lessons"
      case "quiz":         return "/quizzes"
      case "post":         return "/feed"
      case "user":         return id ? `/profile/${id}` : "/home"
      case "live":
      case "live_session": return "/live-sessions"
      case "message":      return "/messages"
      case "subject":      return "/subjects"
    }
  }

  // Route by notification_type
  switch (type) {
    case "follow":
    case "new_follower":   return "/home"
    case "class_invite":
    case "class_join":
    case "new_member":     return "/classes"
    case "new_lesson":
    case "lesson_update":  return "/lessons"
    case "quiz_grade":
    case "quiz_result":
    case "new_quiz":       return "/quizzes"
    case "live_session":
    case "live_starting":  return "/live-sessions"
    case "comment":
    case "like":
    case "reaction":
    case "new_post":
    case "post_mention":   return "/feed"
    case "message":
    case "new_message":    return "/messages"
    case "announcement":   return "/feed"
    case "reminder":       return "/home"
  }

  return "/home"  // safe fallback — always valid
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
