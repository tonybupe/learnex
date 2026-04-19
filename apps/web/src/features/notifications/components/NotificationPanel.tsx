import NotificationItem from "./NotificationItem"
import { useNotifications } from "../hooks/useNotifications"

import "../notifications.css"

export default function NotificationPanel() {

  const {

    notifications,
    loading,
    markRead

  } = useNotifications()

  if (loading) {

    return (
      <div className="notification-panel">
        Loading notifications...
      </div>
    )

  }

  if (!notifications.length) {

    return (
      <div className="notification-panel">
        No notifications
      </div>
    )

  }

  return (

    <div className="notification-panel">

      {notifications.map((n) => (

        <NotificationItem
          key={n.id}
          notification={n}
          onRead={markRead}
          onClose={() => {}}
        />

      ))}

    </div>

  )

}