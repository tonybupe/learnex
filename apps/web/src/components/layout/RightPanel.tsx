import { useNotifications } from "@/features/notifications/hooks/useNotifications"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/features/auth/auth.store"
import { Bell, TrendingUp, Calendar, ChevronRight, Users, BookOpen, Brain, Video, Target } from "lucide-react"

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const c = colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: c, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38, flexShrink: 0 }}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  )
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function notifRoute(n: any): string {
  const t = (n.notification_type ?? "").toLowerCase()
  const e = (n.entity_type ?? "").toLowerCase()
  const m: Record<string,string> = {
    lesson_published:"/lessons", new_lesson:"/lessons",
    follow_created:"/home", new_follower:"/home",
    class_post_created:"/feed", comment:"/feed", like:"/feed", reaction:"/feed", new_post:"/feed",
    class_join:"/classes", class_invite:"/classes",
    quiz_grade:"/quizzes", new_quiz:"/quizzes",
    live_session:"/live-sessions", message:"/messages",
  }
  if (m[t]) return m[t]
  const em: Record<string,string> = { lesson:"/lessons", class:"/classes", quiz:"/quizzes", post:"/feed", live_session:"/live-sessions", message:"/messages" }
  return em[e] ?? "/home"
}

function Section({ title, icon, badge, onAll, allLabel, maxH = 180, children }: {
  title: string; icon: React.ReactNode; badge?: number; onAll?: () => void; allLabel?: string; maxH?: number; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {icon} {title}
          {!!badge && badge > 0 && (
            <span style={{ padding: "1px 6px", borderRadius: 999, background: "var(--accent)", color: "white", fontSize: 9, fontWeight: 800 }}>{badge}</span>
          )}
        </div>
        {onAll && (
          <button onClick={onAll}
            style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, fontFamily: "inherit", padding: 0 }}>
            {allLabel ?? "All"} <ChevronRight size={9} />
          </button>
        )}
      </div>
      {/* Scrollable list */}
      <div style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ maxHeight: maxH, overflowY: "auto", scrollbarWidth: "none" as const }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function Row({ onClick, left, title, sub, right }: { onClick: () => void; left: React.ReactNode; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "background 0.12s" }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
      {left}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{title}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{sub}</div>}
      </div>
      {right ?? <ChevronRight size={11} style={{ color: "var(--border)", flexShrink: 0 }} />}
    </button>
  )
}

function Empty({ msg }: { msg: string }) {
  return <div style={{ padding: "14px 10px", fontSize: 11, color: "var(--muted)", textAlign: "center" }}>{msg}</div>
}

export default function RightPanel() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const { notifications, markRead } = useNotifications()

  const { data: sessions = [] } = useQuery({
    queryKey: ["rp-sessions"],
    queryFn: async () => {
      const res = await api.get("/live-sessions/upcoming").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 60000,
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ["rp-teachers"],
    queryFn: async () => {
      const res = await api.get("/discovery/trending-teachers").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 120000,
  })

  const { data: stats } = useQuery({
    queryKey: ["rp-stats", user?.id],
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

  const quickStats = user?.role === "teacher" ? [
    { label: "Classes",  value: stats?.classes_count  ?? 0, color: "#cb26e4", path: "/classes",  icon: <Users size={11} /> },
    { label: "Learners", value: stats?.total_learners ?? 0, color: "#38bdf8", path: "/classes",  icon: <Users size={11} /> },
    { label: "Lessons",  value: stats?.lessons_count  ?? 0, color: "#22c55e", path: "/lessons",  icon: <BookOpen size={11} /> },
    { label: "Quizzes",  value: stats?.quizzes_count  ?? 0, color: "#f59e0b", path: "/quizzes",  icon: <Brain size={11} /> },
  ] : user?.role === "learner" ? [
    { label: "Enrolled", value: stats?.enrolled_classes_count ?? 0, color: "#cb26e4", path: "/classes", icon: <Users size={11} /> },
    { label: "Lessons",  value: stats?.lesson_count ?? 0,           color: "#38bdf8", path: "/lessons", icon: <BookOpen size={11} /> },
    { label: "Score",    value: stats?.average_quiz_score != null ? `${Number(stats.average_quiz_score).toFixed(0)}%` : "—", color: "#22c55e", path: "/quizzes", icon: <Target size={11} /> },
  ] : []

  return (
    <div style={{ padding: "10px 10px 20px", display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Quick Stats - compact pill row */}
      {quickStats.length > 0 && (
        <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
          {quickStats.map(s => (
            <button key={s.label} onClick={() => navigate(s.path)}
              style={{ flex: "1 1 calc(50% - 3px)", display: "flex", alignItems: "center", gap: 6, padding: "7px 9px", borderRadius: 10, background: "var(--card)", border: `1px solid var(--border)`, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s", borderLeft: `3px solid ${s.color}` }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--card)"}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 14, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Notifications */}
      <Section
        title="Notifications"
        icon={<Bell size={11} style={{ color: "var(--accent)" }} />}
        badge={unread.length}
        maxH={200}
        onAll={notifications.length > 0 ? () => {} : undefined}
        allLabel={notifications.length > 0 ? `${notifications.length} total` : undefined}>
        {notifications.length === 0
          ? <Empty msg="No notifications" />
          : notifications.slice(0, 10).map((n: any) => (
            <Row key={n.id}
              onClick={() => { if (!n.is_read) markRead(n.id); navigate(notifRoute(n)) }}
              left={<div style={{ width: 7, height: 7, borderRadius: "50%", background: n.is_read ? "var(--border)" : "var(--accent)", flexShrink: 0, marginTop: 2 }} />}
              title={n.title ?? n.message ?? "Notification"}
              sub={timeAgo(n.created_at)}
              right={!n.is_read ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} /> : <ChevronRight size={11} style={{ color: "var(--border)" }} />}
            />
          ))
        }
      </Section>

      {/* Live Sessions */}
      <Section
        title="Live Sessions"
        icon={<Video size={11} style={{ color: "#ef4444" }} />}
        maxH={160}
        onAll={() => navigate("/live-sessions")}
        allLabel="View all">
        {sessions.length === 0
          ? <Empty msg="No upcoming sessions" />
          : sessions.map((s: any) => (
            <Row key={s.id}
              onClick={() => navigate("/live-sessions")}
              left={<div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, boxShadow: "0 0 5px #ef4444" }} />}
              title={s.title}
              sub={new Date(s.scheduled_start_at || s.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            />
          ))
        }
      </Section>

      {/* Top Teachers */}
      <Section
        title="Top Teachers"
        icon={<TrendingUp size={11} style={{ color: "#22c55e" }} />}
        maxH={200}
        onAll={() => navigate("/discover")}
        allLabel="Discover">
        {teachers.length === 0
          ? <Empty msg="No teachers yet" />
          : teachers.map((t: any) => (
            <Row key={t.id}
              onClick={() => navigate(`/profile/${t.id}`)}
              left={<Avatar name={t.full_name} size={28} />}
              title={t.full_name}
              sub={`${t.classes_count ?? 0} classes · ${t.learners_count ?? 0} learners`}
            />
          ))
        }
      </Section>

      <div style={{ textAlign: "center", fontSize: 9, color: "var(--muted)", paddingTop: 6, letterSpacing: "0.04em" }}>
        LEARNEX &copy; {new Date().getFullYear()}
      </div>
    </div>
  )
}