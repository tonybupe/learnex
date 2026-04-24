import { useNotifications } from "@/features/notifications/hooks/useNotifications"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/features/auth/auth.store"
import { Bell, TrendingUp, Calendar, ChevronRight, Users, BookOpen, Brain, Video } from "lucide-react"

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38, flexShrink: 0 }}>
      {name?.[0]?.toUpperCase() ?? "?"}
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

function notifRoute(n: any): string {
  const type = (n.notification_type ?? "").toLowerCase()
  const entity = (n.entity_type ?? "").toLowerCase()
  const map: Record<string, string> = {
    lesson_published: "/lessons", new_lesson: "/lessons",
    follow_created: "/home", new_follower: "/home",
    class_post_created: "/feed", comment: "/feed", like: "/feed", reaction: "/feed", new_post: "/feed",
    class_join: "/classes", class_invite: "/classes",
    quiz_grade: "/quizzes", new_quiz: "/quizzes",
    live_session: "/live-sessions",
    message: "/messages",
  }
  if (map[type]) return map[type]
  const entityMap: Record<string, string> = {
    lesson: "/lessons", class: "/classes", quiz: "/quizzes",
    post: "/feed", live_session: "/live-sessions", message: "/messages",
  }
  return entityMap[entity] ?? "/home"
}

function SectionCard({ title, icon, children, onViewAll, viewAllLabel }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; onViewAll?: () => void; viewAllLabel?: string
}) {
  return (
    <div style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 12, color: "var(--text)" }}>
          {icon} {title}
        </div>
        {onViewAll && (
          <button onClick={onViewAll}
            style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, fontFamily: "inherit", padding: 0 }}>
            {viewAllLabel ?? "See all"} <ChevronRight size={10} />
          </button>
        )}
      </div>
      <div style={{ padding: "0 0 4px" }}>
        {children}
      </div>
    </div>
  )
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
      const res = await api.get("/discovery/trending-teachers").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data.slice(0, 4) : []
    },
    staleTime: 120000,
  })

  const { data: stats } = useQuery({
    queryKey: ["rp-stats", user?.id, user?.role],
    queryFn: async () => {
      const ep = user?.role === "admin" ? "/analytics/dashboard/admin"
        : user?.role === "teacher" ? "/analytics/dashboard/teacher"
        : "/analytics/dashboard/learner"
      const res = await api.get(ep).catch(() => ({ data: {} }))
      return res.data
    },
    staleTime: 120000,
    enabled: !!user?.id,
  })

  const unread = notifications.filter((n: any) => !n.is_read)

  const handleNotifClick = (n: any) => {
    if (!n.is_read) markRead(n.id)
    navigate(notifRoute(n))
  }

  const quickStats = user?.role === "teacher" ? [
    { label: "Classes", value: stats?.classes_count ?? 0, icon: <Users size={13} />, path: "/classes", color: "#cb26e4" },
    { label: "Learners", value: stats?.total_learners ?? 0, icon: <Users size={13} />, path: "/classes", color: "#38bdf8" },
    { label: "Lessons", value: stats?.lessons_count ?? 0, icon: <BookOpen size={13} />, path: "/lessons", color: "#22c55e" },
    { label: "Quizzes", value: stats?.quizzes_count ?? 0, icon: <Brain size={13} />, path: "/quizzes", color: "#f59e0b" },
  ] : user?.role === "learner" ? [
    { label: "Enrolled", value: stats?.enrolled_classes_count ?? 0, icon: <Users size={13} />, path: "/classes", color: "#cb26e4" },
    { label: "Lessons", value: stats?.lesson_count ?? 0, icon: <BookOpen size={13} />, path: "/lessons", color: "#38bdf8" },
    { label: "Avg Score", value: stats?.average_quiz_score != null ? `${Number(stats.average_quiz_score).toFixed(0)}%` : "—", icon: <Brain size={13} />, path: "/quizzes", color: "#22c55e" },
  ] : []

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "12px 10px" }}>

      {/* Quick Stats */}
      {quickStats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          {quickStats.map(s => (
            <button key={s.label} onClick={() => navigate(s.path)}
              style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", padding: "10px 10px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s", borderLeft: `3px solid ${s.color}` }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--card)"}>
              <div style={{ color: s.color, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 18, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Notifications */}
      <SectionCard
        title="Notifications"
        icon={<Bell size={13} style={{ color: "var(--accent)" }} />}
        onViewAll={unread.length > 0 ? () => {} : undefined}
        viewAllLabel={unread.length > 0 ? `${unread.length} unread` : undefined}>
        {notifications.length === 0 ? (
          <div style={{ padding: "10px 14px 12px", fontSize: 12, color: "var(--muted)", textAlign: "center" }}>No notifications yet</div>
        ) : (
          notifications.slice(0, 5).map((n: any) => (
            <button key={n.id} onClick={() => handleNotifClick(n)}
              style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 14px", background: n.is_read ? "transparent" : "rgba(203,38,228,0.04)", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "background 0.15s", borderBottom: "1px solid var(--border)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.is_read ? "transparent" : "rgba(203,38,228,0.04)"}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: n.is_read ? "var(--border)" : "var(--accent)", flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: n.is_read ? 500 : 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title ?? n.message}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{timeAgo(n.created_at)}</div>
              </div>
              {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 5 }} />}
            </button>
          ))
        )}
        {notifications.length > 5 && (
          <div style={{ padding: "8px 14px", fontSize: 10, color: "var(--muted)", textAlign: "center" }}>
            +{notifications.length - 5} more notifications
          </div>
        )}
      </SectionCard>

      {/* Upcoming Sessions */}
      <SectionCard
        title="Live Sessions"
        icon={<Video size={13} style={{ color: "#ef4444" }} />}
        onViewAll={() => navigate("/live-sessions")}
        viewAllLabel="View all">
        {sessions.length === 0 ? (
          <div style={{ padding: "10px 14px 12px", fontSize: 12, color: "var(--muted)", textAlign: "center" }}>No upcoming sessions</div>
        ) : (
          sessions.slice(0, 3).map((s: any) => (
            <button key={s.id} onClick={() => navigate("/live-sessions")}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, boxShadow: "0 0 6px #ef4444" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                  {new Date(s.scheduled_start_at || s.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <ChevronRight size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
            </button>
          ))
        )}
      </SectionCard>

      {/* Teachers */}
      <SectionCard
        title="Top Teachers"
        icon={<TrendingUp size={13} style={{ color: "#22c55e" }} />}
        onViewAll={() => navigate("/discover")}
        viewAllLabel="Discover">
        {teachers.length === 0 ? (
          <div style={{ padding: "10px 14px 12px", fontSize: 12, color: "var(--muted)", textAlign: "center" }}>No teachers yet</div>
        ) : (
          teachers.map((t: any) => (
            <button key={t.id} onClick={() => navigate(`/profile/${t.id}`)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              <Avatar name={t.full_name} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.full_name}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>
                  {t.classes_count ?? 0} classes · {t.learners_count ?? 0} learners
                </div>
              </div>
              <ChevronRight size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
            </button>
          ))
        )}
      </SectionCard>

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: 10, color: "var(--muted)", padding: "8px 0 4px" }}>
        Learnex &copy; {new Date().getFullYear()}
      </div>
    </div>
  )
}