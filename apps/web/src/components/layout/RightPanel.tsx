import { useNotifications } from "@/features/notifications/hooks/useNotifications"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/features/auth/auth.store"
import { Bell, TrendingUp, Calendar } from "lucide-react"

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38, flexShrink: 0 }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
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

// Map notification to valid frontend route (same logic as NotificationItem)
function notifRoute(n: any): string {
  const type = (n.notification_type ?? "").toLowerCase()
  const entity = (n.entity_type ?? "").toLowerCase()
  switch (type) {
    case "lesson_published":
    case "new_lesson":      return "/lessons"
    case "follow_created":
    case "new_follower":    return "/home"
    case "class_post_created":
    case "comment":
    case "like":
    case "reaction":
    case "new_post":        return "/feed"
    case "class_join":
    case "class_invite":    return "/classes"
    case "quiz_grade":
    case "new_quiz":        return "/quizzes"
    case "live_session":    return "/live-sessions"
    case "message":         return "/messages"
  }
  switch (entity) {
    case "lesson":          return "/lessons"
    case "class":           return "/classes"
    case "quiz":            return "/quizzes"
    case "post":            return "/feed"
    case "live_session":    return "/live-sessions"
    case "message":         return "/messages"
  }
  return "/home"
}

export default function RightPanel() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const { notifications, markRead } = useNotifications()

  const { data: sessions = [] } = useQuery({
    queryKey: ["upcoming-sessions-panel"],
    queryFn: async () => {
      const res = await api.get("/live-sessions/upcoming").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 60000,
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-panel"],
    queryFn: async () => {
      const res = await api.get("/classes").catch(() => ({ data: [] }))
      const classes = Array.isArray(res.data) ? res.data : []
      const seen = new Set<number>()
      const result: any[] = []
      for (const cls of classes) {
        if (cls.teacher && !seen.has(cls.teacher.id)) {
          seen.add(cls.teacher.id)
          result.push(cls.teacher)
        }
      }
      return result.slice(0, 4)
    },
    staleTime: 120000,
  })

  const unread = notifications.filter((n: any) => !n.is_read)

  const handleNotifClick = (n: any) => {
    if (!n.is_read) markRead(n.id)
    navigate(notifRoute(n))
  }

  return (
    <div className="right-panel-stack">

      {/* Notifications */}
      <div className="rp-card">
        <div className="rp-header">
          <div className="rp-title">
            <Bell size={14} style={{ color: "var(--accent)" }} /> Notifications
          </div>
          {unread.length > 0 && <span className="rp-badge">{unread.length}</span>}
        </div>
        {notifications.length === 0 ? (
          <div className="rp-empty">No notifications yet</div>
        ) : (
          <div className="rp-list">
            {notifications.slice(0, 5).map((n: any) => (
              <div key={n.id}
                className={`rp-notif ${n.is_read ? "" : "unread"}`}
                onClick={() => handleNotifClick(n)}
                style={{ cursor: "pointer" }}
                title="Click to view">
                <div className="rp-notif-dot" style={{ background: n.is_read ? "var(--border)" : "var(--accent)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="rp-notif-msg">{n.title ?? n.message}</div>
                  <div className="rp-notif-time">{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        )}
        {/* No "view all" link — /notifications doesn't exist */}
        {notifications.length > 5 && (
          <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
            +{notifications.length - 5} more — open bell icon to view
          </div>
        )}
      </div>

      {/* Upcoming Sessions */}
      <div className="rp-card">
        <div className="rp-header">
          <div className="rp-title">
            <Calendar size={14} style={{ color: "var(--accent2)" }} /> Upcoming Sessions
          </div>
        </div>
        {sessions.length === 0 ? (
          <div className="rp-empty">No upcoming sessions</div>
        ) : (
          <div className="rp-list">
            {sessions.slice(0, 3).map((s: any) => (
              <div key={s.id} className="rp-session" onClick={() => navigate("/live-sessions")} style={{ cursor: "pointer" }}>
                <div className="rp-session-dot" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="rp-session-title">{s.title}</div>
                  <div className="rp-session-time">
                    {new Date(s.scheduled_start_at || s.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="rp-link" onClick={() => navigate("/live-sessions")}>View schedule →</button>
      </div>

      {/* Teachers */}
      <div className="rp-card">
        <div className="rp-header">
          <div className="rp-title">
            <TrendingUp size={14} style={{ color: "var(--success)" }} /> Teachers
          </div>
        </div>
        {teachers.length === 0 ? (
          <div className="rp-empty">No teachers yet</div>
        ) : (
          <div className="rp-list">
            {teachers.map((t: any) => (
              <div key={t.id} className="rp-teacher"
                onClick={() => navigate(`/profile/${t.id}`)} style={{ cursor: "pointer" }}>
                <Avatar name={t.full_name} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="rp-teacher-name">{t.full_name}</div>
                  <div className="rp-teacher-sub">Teacher</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="rp-link" onClick={() => navigate("/discover")}>Discover more →</button>
      </div>

      <div style={{ padding: "8px 4px", fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
        Learnex © {new Date().getFullYear()}
      </div>
    </div>
  )
}