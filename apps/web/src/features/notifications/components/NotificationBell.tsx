import { useState, useRef, useEffect } from "react"
import { Bell, X, CheckCheck } from "lucide-react"
import { useNotifications } from "../hooks/useNotifications"
import NotificationItem from "./NotificationItem"
import "../notifications.css"

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div className="notification-bell-wrapper" ref={wrapperRef}>
      <button
        className="icon-btn notification-bell"
        onClick={() => setOpen(v => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          {/* Header */}
          <div className="notification-header">
            <span className="notification-title">
              🔔 Notifications
              {unreadCount > 0 && <span className="notif-count-chip">{unreadCount}</span>}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {unreadCount > 0 && (
                <button className="notif-action-btn" onClick={markAllRead} title="Mark all read">
                  <CheckCheck size={15} />
                </button>
              )}
              <button className="notif-action-btn" onClick={() => setOpen(false)}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="notif-loading">
              <div className="spinner" />
              <span>Loading...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notif-empty">
              <span style={{ fontSize: 32 }}>🔕</span>
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map(n => (
                <NotificationItem key={n.id} notification={n} onRead={markRead} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}