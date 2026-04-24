import { useNavigate } from "react-router-dom"
import type { Notification } from "../types/notification.types"

const ICONS: Record<string, string> = {
  follow_created:     "­ƒæñ",
  lesson_published:   "­ƒôû",
  class_post_created: "­ƒôú",
  class_join:         "­ƒÄô",
  class_invite:       "­ƒÄô",
  quiz_grade:         "­ƒôØ",
  live_session:       "­ƒÄÑ",
  comment:            "­ƒÆ¼",
  like:               "ÔØñ´©Å",
  reaction:           "ÔØñ´©Å",
  message:            "­ƒÆî",
  reminder:           "ÔÅ░",
  announcement:       "­ƒôó",
  default:            "­ƒöö",
}

// Map API action_url or entity_type to valid FRONTEND routes
// API sends: /lessons/34, /users/2, /posts/31 ÔÇö none of these exist as frontend routes
function resolveRoute(n: Notification): string {
  const { entity_type, notification_type } = n

  // Map by notification_type first (most specific)
  const type = (notification_type ?? "").toLowerCase()
  switch (type) {
    case "lesson_published":
    case "lesson_update":
    case "new_lesson":
      return "/lessons"
    case "follow_created":
    case "new_follower":
    case "follow":
      return "/home"
    case "class_post_created":
    case "new_post":
    case "post_mention":
    case "comment":
    case "like":
    case "reaction":
      return "/feed"
    case "class_join":
    case "class_invite":
    case "new_member":
    case "class_update":
      return "/classes"
    case "quiz_grade":
    case "quiz_result":
    case "new_quiz":
      return "/quizzes"
    case "live_session":
    case "live_starting":
      return "/live-sessions"
    case "message":
    case "new_message":
      return "/messages"
    case "announcement":
      return "/feed"
    case "reminder":
      return "/home"
  }

  // Fallback by entity_type
  const entity = (entity_type ?? "").toLowerCase()
  switch (entity) {
    case "lesson":       return "/lessons"
    case "class":
    case "classroom":    return "/classes"
    case "quiz":         return "/quizzes"
    case "post":         return "/feed"
    case "user":         return "/home"
    case "live_session": return "/live-sessions"
    case "message":      return "/messages"
    case "subject":      return "/subjects"
  }

  return "/home"
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
  const icon = ICONS[n.notification_type] ?? ICONS.default
  const route = resolveRoute(n)

  const handleClick = () => {
    if (!n.is_read) onRead(n.id)
    navigate(route)
    onClose()
  }

  return (
    <div
      className={`notification-item ${n.is_read ? "" : "unread"} clickable`}
      onClick={handleClick}
      title="Click to view"
      style={{ cursor: "pointer" }}
    >
      <div className="notif-icon">{icon}</div>
      <div className="notif-content">
        {n.title && <div className="notif-title">{n.title}</div>}
        <div className="notification-message">{n.message}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          <div className="notification-time">{timeAgo(n.created_at)}</div>
          <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>
            View ÔåÆ
          </span>
        </div>
      </div>
      {!n.is_read && <div className="notif-dot" />}
    </div>
  )
}
