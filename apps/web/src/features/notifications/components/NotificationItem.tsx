import type { Notification } from "../types/notification.types"

type Props = {

  notification: Notification
  onRead: (id: number) => void

}

export default function NotificationItem({

  notification,
  onRead

}: Props) {

  return (

    <div
      className={`notification-item ${notification.is_read ? "" : "unread"}`}
      onClick={() => onRead(notification.id)}
    >

      <div className="notification-message">
        {notification.message}
      </div>

      <div className="notification-time">
        {new Date(notification.created_at).toLocaleString()}
      </div>

    </div>

  )

}