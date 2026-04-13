import { useNotifications } from "@/features/notifications/hooks/useNotifications"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/features/auth/auth.store"
import { Bell, Users, TrendingUp, Calendar } from "lucide-react"

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[name?.charCodeAt(0) % colors.length]
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
    queryKey: ["trending-teachers"],
    queryFn: async () => {
      const res = await api.get("/users").catch(() => ({ data: [] }))
      const all = Array.isArray(res.data) ? res.data : []
      return all.filter((u: any) => u.role === "teacher").slice(0, 4)
    },
    staleTime: 120000,
  })

  const unread = notifications.filter(n => !n.is_read)

  return (
    <div className="right-panel-stack">

      {/* Notifications */}
      <div className="rp-card">
        <div className="rp-header">
          <div className="rp-title">
            <Bell size={14} style={{ color: "var(--accent)" }} />
            Notifications
          </div>
          {unread.length > 0 && (
            <span className="rp-badge">{unread.length}</span>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="rp-empty">No notifications yet</div>
        ) : (
          <div className="rp-list">
            {notifications.slice(0, 4).map(n => (
              <div key={n.id} className={`rp-notif ${n.is_read ? "" : "unread"}`}
                onClick={() => markRead(n.id)} style={{ cursor: "pointer" }}>
                <div className="rp-notif-dot" style={{ background: n.is_read ? "var(--border)" : "var(--accent)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="rp-notif-msg">{n.title ?? n.message}</div>
                  <div className="rp-notif-time">{timeAgo(n.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="rp-link" onClick={() => navigate("/notifications")}>
          View all notifications →
        </button>
      </div>

      {/* Upcoming Sessions */}
      <div className="rp-card">
        <div className="rp-header">
          <div className="rp-title">
            <Calendar size={14} style={{ color: "var(--accent2)" }} />
            Upcoming Sessions
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="rp-empty">No upcoming sessions</div>
        ) : (
          <div className="rp-list">
            {sessions.slice(0, 3).map((s: any) => (
              <div key={s.id} className="rp-session">
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
        <button className="rp-link" onClick={() => navigate("/live-sessions")}>
          View schedule →
        </button>
      </div>

      {/* Trending Teachers */}
      <div className="rp-card">
        <div className="rp-header">
          <div className="rp-title">
            <TrendingUp size={14} style={{ color: "var(--success)" }} />
            Teachers
          </div>
        </div>

        {teachers.length === 0 ? (
          <div className="rp-empty">No teachers yet</div>
        ) : (
          <div className="rp-list">
            {teachers.map((t: any) => (
              <div key={t.id} className="rp-teacher"
                onClick={() => navigate(`/profile/${t.id}`)}
                style={{ cursor: "pointer" }}>
                <Avatar name={t.full_name} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="rp-teacher-name">{t.full_name}</div>
                  <div className="rp-teacher-sub">{t.profile?.profession || "Teacher"}</div>
                </div>
                <button className="rp-follow-btn">+</button>
              </div>
            ))}
          </div>
        )}
        <button className="rp-link" onClick={() => navigate("/discover")}>
          Discover more →
        </button>
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 4px", fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
        Learnex © {new Date().getFullYear()} · <a href="/settings" style={{ color: "var(--muted)" }}>Privacy</a>
      </div>
    </div>
  )
}