import { useState, useRef, useEffect } from "react"
import { Bell, X, CheckCheck, Settings } from "lucide-react"
import { useNotifications } from "../hooks/useNotifications"
import NotificationItem from "./NotificationItem"
import "../notifications.css"

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const visible = filter === "unread"
    ? notifications.filter(n => !n.is_read)
    : notifications

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
              {unreadCount > 0 && (
                <span className="notif-count-chip">{unreadCount}</span>
              )}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {unreadCount > 0 && (
                <button className="notif-action-btn" onClick={markAllRead} title="Mark all read">
                  <CheckCheck size={15} />
                </button>
              )}
              <button className="notif-action-btn" onClick={() => setOpen(false)} title="Close">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", padding: "0 12px" }}>
            {(["all", "unread"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", color: filter === f ? "var(--accent)" : "var(--muted)", borderBottom: filter === f ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1, textTransform: "capitalize" }}>
                {f} {f === "unread" && unreadCount > 0 ? `(${unreadCount})` : ""}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="notif-loading">
              <div className="spinner" />
              <span>Loading...</span>
            </div>
          ) : visible.length === 0 ? (
            <div className="notif-empty">
              <span style={{ fontSize: 32 }}>🔕</span>
              <p>{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
            </div>
          ) : (
            <div className="notif-list">
              {visible.map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markRead}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
              <a href="/notifications" onClick={() => setOpen(false)}
                style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
                View all notifications →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
