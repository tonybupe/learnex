import AppShell from "@/components/layout/AppShell"
import FeedSection from "@/pages/shared/FeedSection"
import { useStickyHeader } from "@/hooks/useStickyHeader"
import { useAuthStore } from "@/features/auth/auth.store"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useNavigate } from "react-router-dom"
import {
  BookOpen, Users, GraduationCap, Calendar,
  PlusCircle, FileText, Video, MessageSquare,
  BarChart2, Settings, ChevronRight, Clock
} from "lucide-react"

function StatCard({ title, value, icon, color, sub }: {
  title: string; value: string | number; icon: React.ReactNode; color: string; sub?: string
}) {
  return (
    <div className="kpi stat-card" style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="kpi-sub">{title}</div>
        <div className="kpi-value" style={{ color }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function TeacherDashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const { shrunk } = useStickyHeader()
  const firstName = user?.full_name?.split(" ")[0] ?? "Teacher"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const { data: stats, isLoading } = useQuery({
    queryKey: ["teacher-dashboard"],
    queryFn: async () => (await api.get("/analytics/dashboard/teacher")).data,
    retry: false, staleTime: 60000,
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ["upcoming-sessions"],
    queryFn: async () => {
      const res = await api.get("/live-sessions/upcoming").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 60000,
  })

  const { data: analytics } = useQuery({
    queryKey: ["teacher-activity", user?.id],
    queryFn: async () => (await api.get(`/analytics/users/${user?.id}/activity`)).data,
    enabled: !!user?.id, retry: false, staleTime: 60000,
  })

  const ACTIONS = [
    { label: "New Lesson",    icon: <PlusCircle size={18} />,   path: "/lessons",       color: "#cb26e4" },
    { label: "New Quiz",      icon: <FileText size={18} />,     path: "/quizzes",       color: "#38bdf8" },
    { label: "My Classes",    icon: <GraduationCap size={18} />,path: "/classes",       color: "#22c55e" },
    { label: "Live Session",  icon: <Video size={18} />,        path: "/live-sessions", color: "#f59e0b" },
    { label: "Analytics",     icon: <BarChart2 size={18} />,    path: "/analytics",     color: "#8b5cf6" },
    { label: "Subjects",      icon: <BookOpen size={18} />,     path: "/subjects",      color: "#06b6d4" },
  ]

  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>

        {/* ── STICKY SHRINKING HEADER ── */}
        <div className={`dash-sticky-header ${shrunk ? "shrunk" : ""}`}>
          <div className="dash-header-content">
            <div className="dash-header-left">
              <div className={`dash-greeting ${shrunk ? "hidden" : ""}`}>
                <span className="chip" style={{ fontSize: 11 }}>👋 {greeting}</span>
              </div>
              <h1 className="dash-title">{firstName}</h1>
              <p className={`dash-sub ${shrunk ? "hidden" : ""}`}>
                Manage your classes, lessons and student engagement.
              </p>
            </div>
            <div className="dash-header-actions">
              <button className="btn" style={{ fontSize: 12 }} onClick={() => navigate(`/profile/${user?.id}`)}>
                <Settings size={14} /> Profile
              </button>
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => navigate("/classes")}>
                <PlusCircle size={14} /> New Class
              </button>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="dash-body">

          {/* Stats */}
          <div className="stats-grid" style={{ gap: 14 }}>
            <StatCard title="My Classes"      value={isLoading ? "—" : stats?.total_classes ?? 0}    icon={<BookOpen size={20} />}      color="#cb26e4" />
            <StatCard title="Students"        value={isLoading ? "—" : stats?.total_learners ?? 0}   icon={<Users size={20} />}         color="#38bdf8" />
            <StatCard title="Lessons"         value={isLoading ? "—" : stats?.total_lessons ?? 0}    icon={<GraduationCap size={20} />} color="#22c55e" sub="published" />
            <StatCard title="Quiz Attempts"   value={isLoading ? "—" : stats?.total_quiz_attempts ?? 0} icon={<Calendar size={20} />}  color="#f59e0b" />
          </div>

          {/* Quick Actions */}
          <div className="card" style={{ padding: "16px 18px" }}>
            <div className="card-head">
              <span className="card-title">⚡ Quick Actions</span>
            </div>
            <div className="actions-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
              {ACTIONS.map(a => (
                <button key={a.label} onClick={() => navigate(a.path)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 8px", borderRadius: 12, border: `1px solid ${a.color}25`, background: `${a.color}08`, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${a.color}15`; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${a.color}08`; (e.currentTarget as HTMLElement).style.transform = "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}20`, display: "flex", alignItems: "center", justifyContent: "center", color: a.color }}>
                    {a.icon}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: a.color, textAlign: "center", lineHeight: 1.3 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2-col: Upcoming + Activity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Upcoming Sessions */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">📅 Upcoming Sessions</span>
                <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => navigate("/live-sessions")}>
                  View all <ChevronRight size={12} />
                </button>
              </div>
              {sessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 13 }}>
                  <Video size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div>No upcoming sessions</div>
                </div>
              ) : sessions.slice(0, 4).map((s: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.session_type}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted)" }}>
                    <Clock size={11} />
                    {new Date(s.scheduled_start_at || s.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>

            {/* Activity */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">📊 My Activity</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Posts created",      value: analytics?.posts_count ?? "—",               color: "#cb26e4" },
                  { label: "Lessons published",  value: analytics?.lessons_count ?? "—",             color: "#38bdf8" },
                  { label: "Quizzes created",    value: analytics?.quizzes_created_count ?? "—",     color: "#22c55e" },
                  { label: "Messages sent",      value: analytics?.messages_sent_count ?? "—",       color: "#f59e0b" },
                  { label: "Sessions hosted",    value: analytics?.live_sessions_hosted_count ?? "—",color: "#8b5cf6" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span style={{ color: "var(--muted)", fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontWeight: 800, color: row.color, fontSize: 16 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feed */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="card-head" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
              <span className="card-title">🔥 Class Feed</span>
              <span className="chip" style={{ fontSize: 11 }}>Live</span>
            </div>
            <div style={{ padding: "12px 18px 18px" }}>
              <FeedSection />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}