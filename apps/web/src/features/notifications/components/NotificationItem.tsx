import type { Notification } from "../types/notification.types"

const ICONS: Record<string, string> = {
  follow: "👤",
  like: "❤️",
  comment: "💬",
  class_invite: "🎓",
  quiz_grade: "📝",
  live_session: "🎥",
  default: "🔔",
}

type Props = {
  notification: Notification
  onRead: (id: number) => void
}

export default function NotificationItem({ notification, onRead }: Props) {
  const icon = ICONS[notification.type] ?? ICONS.default
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div
      className={`notification-item ${notification.is_read ? "" : "unread"}`}
      onClick={() => !notification.is_read && onRead(notification.id)}
    >
      <div className="notif-icon">{icon}</div>
      <div className="notif-content">
        {notification.title && (
          <div className="notif-title">{notification.title}</div>
        )}
        <div className="notification-message">{notification.message}</div>
        <div className="notification-time">{timeAgo(notification.created_at)}</div>
      </div>
      {!notification.is_read && <div className="notif-dot" />}
    </div>
  )
}