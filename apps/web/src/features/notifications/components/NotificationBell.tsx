import { useState } from "react"
import { Bell } from "lucide-react"

import { useNotifications } from "../hooks/useNotifications"

import NotificationPanel from "./NotificationPanel"

import "../notifications.css"

export default function NotificationBell() {

  const [open, setOpen] = useState(false)

  const { unreadCount } = useNotifications()

  return (

    <div className="notification-bell-wrapper">

      <button
        className="notification-bell"
        onClick={() => setOpen((v) => !v)}
      >

        <Bell size={20} />

        {unreadCount > 0 && (

          <span className="notification-badge">
            {unreadCount}
          </span>

        )}

      </button>

      {open && <NotificationPanel />}

    </div>

  )

}