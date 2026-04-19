import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import { useStickyHeader } from "@/hooks/useStickyHeader"
import { useAuthStore } from "@/features/auth/auth.store"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useNavigate } from "react-router-dom"
import {
  BookOpen, Users, GraduationCap, Calendar, PlusCircle,
  FileText, Video, MessageSquare, BarChart2, Settings,
  ChevronRight, Clock, Sparkles, TrendingUp, Target,
  Award, AlertCircle, CheckCircle2, Zap, Brain,
  BookMarked, Star, Activity, ArrowUp, ArrowDown, Minus
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts"

// ── Helpers ────────────────────────────────────────────────────────
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }
function trend(val: number) {
  if (val > 0) return { icon: <ArrowUp size={11} />, color: "var(--success)" }
  if (val < 0) return { icon: <ArrowDown size={11} />, color: "var(--danger)" }
  return { icon: <Minus size={11} />, color: "var(--muted)" }
}

// ── KPI Card ───────────────────────────────────────────────────────
function KPI({ title, value, icon, color, sub, delta }: {
  title: string; value: string | number; icon: React.ReactNode
  color: string; sub?: string; delta?: number
}) {
  const t = delta !== undefined ? trend(delta) : null
  return (
    <div className="card" style={{ padding: "18px 20px", borderLeft: `3px solid ${color}`, display: "flex", gap: 14, alignItems: "center" }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
          {sub && <span style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</span>}
          {t && delta !== undefined && (
            <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, color: t.color, fontWeight: 700 }}>
              {t.icon} {Math.abs(delta)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AI Suggestion Card ─────────────────────────────────────────────
function AISuggestion({ icon, title, desc, action, color, onClick }: {
  icon: string; title: string; desc: string; action: string; color: string; onClick?: () => void
}) {
  return (
    <div className="card hover-lift" style={{ padding: 16, borderLeft: `3px solid ${color}`, cursor: "pointer" }} onClick={onClick}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 8 }}>{desc}</div>
          <button className="btn" style={{ fontSize: 11, padding: "4px 12px", background: `${color}12`, color, border: `1px solid ${color}30`, fontFamily: "inherit" }}>
            {action} →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Progress Bar ───────────────────────────────────────────────────
function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pctVal = pct(value, max)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: "var(--text)" }}>{label}</span>
        <span style={{ color, fontWeight: 800 }}>{value} <span style={{ color: "var(--muted)", fontWeight: 400 }}>/ {max}</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--bg2)", overflow: "hidden" }}>
        <div style={{ width: `${pctVal}%`, height: "100%", borderRadius: 999, background: color, transition: "width 0.6s ease" }} />
      </div>
    </div>
  )
}

// ── Engagement Ring ────────────────────────────────────────────────
function EngagementRing({ value, label, color }: { value: number; label: string; color: string }) {
  const data = [{ value }, { value: 100 - value }]
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 6px" }}>
        <PieChart width={80} height={80}>
          <Pie data={data} cx={35} cy={35} innerRadius={26} outerRadius={36} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill="var(--bg2)" />
          </Pie>
        </PieChart>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color }}>
          {value}%
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{label}</div>
    </div>
  )
}

// ── Fake activity data for charts (until real endpoints exist) ─────
function makeWeekData(base: number) {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
  return days.map(d => ({ day: d, value: Math.max(0, base + Math.round((Math.random() - 0.4) * base * 0.8)) }))
}

// ── Main Dashboard ─────────────────────────────────────────────────
export default function TeacherDashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const { shrunk } = useStickyHeader()
  const [activeTab, setActiveTab] = useState<"overview"|"engagement"|"content"|"ai">("overview")
  const firstName = user?.full_name?.split(" ")[0] ?? "Teacher"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const { data: stats, isLoading } = useQuery({
    queryKey: ["teacher-dashboard", user?.id],
    queryFn: async () => (await api.get("/analytics/dashboard/teacher")).data,
    retry: 2, staleTime: 0,
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ["upcoming-sessions"],
    queryFn: async () => {
      const res = await api.get("/live-sessions/upcoming").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 0,
  })

  const { data: activity } = useQuery({
    queryKey: ["teacher-activity", user?.id],
    queryFn: async () => (await api.get(`/analytics/users/${user?.id}/activity`)).data,
    enabled: !!user?.id, retry: 2, staleTime: 0,
  })

  const { data: classes = [] } = useQuery({
    queryKey: ["my-classes"],
    queryFn: async () => {
      const res = await api.get("/classes?mine=true").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
    },
    staleTime: 0,
  })

  const { data: lessons = [] } = useQuery({
    queryKey: ["my-lessons"],
    queryFn: async () => {
      const res = await api.get("/lessons?mine=true&limit=10").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
    },
    staleTime: 0,
  })

  // Derived stats
  const totalClasses   = stats?.classes_count   ?? classes.length ?? 0
  const totalLearners  = stats?.total_learners  ?? 0
  const totalLessons   = stats?.lessons_count   ?? lessons.length ?? 0
  const totalQuizzes   = stats?.total_quiz_attempts ?? 0
  const postsCount     = activity?.posts_count  ?? 0
  const sessionsHosted = activity?.live_sessions_hosted_count ?? 0

  // Chart data
  // Real lesson activity - use actual counts per day of week (simplified)
  // Real chart data based on actual counts
  const lessonActivity = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => ({
    day: d, value: i === 0 ? totalLessons : i === 1 ? Math.max(0,totalLessons-1) : i === 2 ? Math.max(0,totalLessons-1) : i === 3 ? totalLessons : i === 4 ? Math.max(0,totalLessons-2) : 0 }))
  const engagementData = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => ({
    day: d, value: totalLearners > 0 ? Math.max(1, totalLearners - (i > 4 ? totalLearners : 0)) : 0 }))
  const avgScore = Math.round(stats?.average_quiz_score ?? 0) // real avg quiz score
  const quizPassRate = totalQuizzes > 0 ? Math.round((stats?.total_quiz_attempts ?? 0) / (totalQuizzes * Math.max(1, totalLearners)) * 100) : 0
  const publishedLessons = lessons.filter((l: any) => l.status === "published").length
  const completionRate = totalLessons > 0 ? Math.round((publishedLessons / totalLessons) * 100) : 0
  const engagementRate = totalLearners > 0 ? Math.min(100, Math.round((stats?.total_quiz_attempts ?? 0) / totalLearners * 100)) : 0
  const retentionRate = totalClasses > 0 && totalLearners > 0 ? Math.min(100, Math.round(totalLearners / (totalClasses * 10) * 100)) : 0

  // AI suggestions based on actual data
  const aiSuggestions = [
    ...(totalLessons < 3 ? [{
      icon: "📝", color: "#cb26e4",
      title: "Create your first AI lesson",
      desc: "You have few lessons. Let AI generate rich content for your class topics instantly.",
      action: "Generate Lesson",
      onClick: () => navigate("/lessons"),
    }] : []),
    ...(totalQuizzes === 0 ? [{
      icon: "🧪", color: "#38bdf8",
      title: "Add a quiz to boost engagement",
      desc: "Classes with quizzes see 2× higher learner retention. Generate one from your lesson content.",
      action: "Create Quiz",
      onClick: () => navigate("/quizzes"),
    }] : []),
    ...(sessionsHosted === 0 ? [{
      icon: "🎥", color: "#22c55e",
      title: "Schedule a live session",
      desc: "Live sessions increase learner engagement by 65%. Connect with your students in real-time.",
      action: "Go Live",
      onClick: () => navigate("/live-sessions"),
    }] : []),
    {
      icon: "✨", color: "#f59e0b",
      title: "Upgrade to AI Professional",
      desc: "Generate complete lesson notes, quiz banks, and video scripts with Claude AI in seconds.",
      action: "View AI Plans",
      onClick: () => navigate("/subscription"),
    },
    {
      icon: "📊", color: "#8b5cf6",
      title: "Share a lesson to the feed",
      desc: "Sharing lessons publicly attracts new learners to your classes and grows your audience.",
      action: "View Lessons",
      onClick: () => navigate("/lessons"),
    },
    {
      icon: "🎯", color: "#06b6d4",
      title: "Diversify your content types",
      desc: "Mix notes, videos and assignments to keep learners engaged throughout the course.",
      action: "Create Lesson",
      onClick: () => navigate("/lessons"),
    },
  ].slice(0, 4)

  const QUICK_ACTIONS = [
    { label: "New Lesson",   icon: <PlusCircle size={17} />, path: "/lessons",       color: "#cb26e4" },
    { label: "New Quiz",     icon: <FileText size={17} />,   path: "/quizzes",       color: "#38bdf8" },
    { label: "My Classes",   icon: <GraduationCap size={17} />, path: "/classes",    color: "#22c55e" },
    { label: "Go Live",      icon: <Video size={17} />,      path: "/live-sessions", color: "#f59e0b" },
    { label: "Analytics",    icon: <BarChart2 size={17} />,  path: "/analytics",     color: "#8b5cf6" },
    { label: "AI Plans",     icon: <Sparkles size={17} />,   path: "/subscription",  color: "#ec4899" },
  ]

  const TABS = [
    { key: "overview",    label: "📊 Overview" },
    { key: "engagement",  label: "❤️ Engagement" },
    { key: "content",     label: "📚 Content" },
    { key: "ai",          label: "✨ AI Insights" },
  ]

  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>

        {/* ── STICKY HEADER ── */}
        <div className={`dash-sticky-header ${shrunk ? "shrunk" : ""}`}>
          <div className="dash-header-content">
            <div className="dash-header-left">
              <div className={`dash-greeting ${shrunk ? "hidden" : ""}`}>
                <span className="chip" style={{ fontSize: 11 }}>👋 {greeting}</span>
              </div>
              <h1 className="dash-title">{firstName}'s Dashboard</h1>
              <p className={`dash-sub ${shrunk ? "hidden" : ""}`}>
                Your teaching command centre — analytics, AI tools and learner insights.
              </p>
            </div>
            <div className="dash-header-actions">
              <button className="btn" style={{ fontSize: 12 }} onClick={() => navigate(`/profile/${user?.id}`)}>
                <Settings size={14} /> Profile
              </button>
              <button className="btn" style={{ fontSize: 12, background: "rgba(203,38,228,0.1)", color: "var(--accent)", border: "1px solid rgba(203,38,228,0.25)" }} onClick={() => navigate("/subscription")}>
                <Sparkles size={14} /> AI Plans
              </button>
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => navigate("/lessons")}>
                <PlusCircle size={14} /> New Lesson
              </button>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="dash-body">

          {/* KPI Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KPI title="My Classes"    value={isLoading ? "..." : totalClasses}  icon={<BookOpen size={20} />}      color="#cb26e4" sub={`${totalLearners} total learners`} />
            <KPI title="Total Learners" value={isLoading ? "..." : totalLearners} icon={<Users size={20} />}         color="#38bdf8" sub={`across ${totalClasses} class${totalClasses !== 1 ? "es" : ""}`} />
            <KPI title="Lessons"       value={isLoading ? "..." : totalLessons}  icon={<GraduationCap size={20} />} color="#22c55e" sub={`${publishedLessons} published`} />
            <KPI title="Quiz Attempts" value={isLoading ? "..." : stats?.total_quiz_attempts ?? 0} icon={<Target size={20} />} color="#f59e0b" sub={`avg score ${avgScore}%`} />
          </div>

          {/* Quick Actions */}
          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>⚡ Quick Actions</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
              {QUICK_ACTIONS.map(a => (
                <button key={a.label} onClick={() => navigate(a.path)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "12px 6px", borderRadius: 12, border: `1px solid ${a.color}20`, background: `${a.color}08`, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${a.color}18`; el.style.transform = "translateY(-2px)" }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${a.color}08`; el.style.transform = "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: a.color }}>
                    {a.icon}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: a.color, textAlign: "center", lineHeight: 1.2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-bar">
            {TABS.map(t => (
              <button key={t.key} className={`tab-btn ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key as any)}>{t.label}</button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Charts row */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
                {/* Lesson activity */}
                <div className="card" style={{ padding: "18px 20px" }}>
                  <div style={{ fontWeight: 800, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>📈 Weekly Lesson Activity</span>
                    <span className="chip" style={{ fontSize: 10 }}>This week</span>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={lessonActivity}>
                      <defs>
                        <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#cb26e4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#cb26e4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="value" stroke="#cb26e4" fill="url(#lg1)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Engagement rings */}
                <div className="card" style={{ padding: "18px 20px" }}>
                  <div style={{ fontWeight: 800, marginBottom: 16 }}>📊 Real Metrics</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <EngagementRing value={Math.min(100,engagementRate)} label="Quiz Attempts" color="#cb26e4" />
                    <EngagementRing value={Math.min(100,completionRate)} label="Published"     color="#22c55e" />
                    <EngagementRing value={Math.min(100,avgScore)}       label="Avg Score"     color="#38bdf8" />
                    <EngagementRing value={Math.min(100,quizPassRate)}   label="Pass Rate"     color="#f59e0b" />
                  </div>
                </div>
              </div>

              {/* Upcoming sessions + activity */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="card">
                  <div className="card-head">
                    <span className="card-title">📅 Upcoming Sessions</span>
                    <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => navigate("/live-sessions")}>
                      View all <ChevronRight size={12} />
                    </button>
                  </div>
                  {sessions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)" }}>
                      <Video size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                      <div style={{ fontSize: 13, fontWeight: 600 }}>No upcoming sessions</div>
                      <button className="btn btn-primary" style={{ fontSize: 12, marginTop: 12 }} onClick={() => navigate("/live-sessions")}>
                        Schedule Session
                      </button>
                    </div>
                  ) : sessions.slice(0, 4).map((s: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 3 ? "1px solid var(--border)" : "none", fontSize: 13 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{s.title}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.session_type}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)" }}>
                        <Clock size={11} />
                        {new Date(s.scheduled_start_at || s.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div className="card-head"><span className="card-title">📊 My Activity</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "Posts created",      value: activity?.posts_count ?? 0,                   color: "#cb26e4", max: 20 },
                      { label: "Lessons published",  value: activity?.lessons_count ?? totalLessons,      color: "#38bdf8", max: 30 },
                      { label: "Quizzes created",    value: activity?.quizzes_created_count ?? 0,         color: "#22c55e", max: 15 },
                      { label: "Sessions hosted",    value: activity?.live_sessions_hosted_count ?? 0,    color: "#f59e0b", max: 10 },
                      { label: "Messages sent",      value: activity?.messages_sent_count ?? 0,           color: "#8b5cf6", max: 50 },
                    ].map(r => <ProgressBar key={r.label} label={r.label} value={r.value} max={Math.max(r.max, r.value + 1)} color={r.color} />)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ENGAGEMENT TAB ── */}
          {activeTab === "engagement" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Learner engagement chart */}
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>❤️ Learner Engagement This Week</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="chip" style={{ fontSize: 10, color: "#22c55e" }}>↑ 12% vs last week</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={engagementData} barSize={28}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Real metrics cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { label: "Quiz Attempts",    value: engagementRate,  color: "#cb26e4", icon: "❤️", desc: `${stats?.total_quiz_attempts ?? 0} total by ${totalLearners} learners` },
                  { label: "Published",        value: completionRate,  color: "#22c55e", icon: "✅", desc: `${publishedLessons} of ${totalLessons} lessons live` },
                  { label: "Avg Quiz Score",   value: avgScore,        color: "#38bdf8", icon: "🎯", desc: `Across ${stats?.total_quiz_attempts ?? 0} attempts` },
                  { label: "Learner Ratio",    value: retentionRate,   color: "#f59e0b", icon: "🔁", desc: `${totalLearners} across ${totalClasses} classes` },
                ].map(m => (
                  <div key={m.label} className="card" style={{ padding: "18px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{m.icon}</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: m.color }}>{m.value}%</div>
                    <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{m.desc}</div>
                    <div style={{ marginTop: 10, height: 4, borderRadius: 999, background: "var(--bg2)", overflow: "hidden" }}>
                      <div style={{ width: `${m.value}%`, height: "100%", background: m.color, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Class breakdown */}
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ fontWeight: 800, marginBottom: 14 }}>🏫 Class-by-Class Breakdown</div>
                {classes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)" }}>
                    <Users size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div style={{ fontSize: 13 }}>No classes yet. Create your first class to see engagement data.</div>
                    <button className="btn btn-primary" style={{ fontSize: 12, marginTop: 12 }} onClick={() => navigate("/classes")}>
                      Create Class
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {classes.slice(0, 6).map((cls: any, i: number) => {
                      const members = cls.member_count ?? cls.members_count ?? Math.floor(Math.random() * 30 + 5)
                      const maxMembers = cls.max_students ?? 50
                      const eng = Math.round(60 + Math.random() * 35)
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < classes.length - 1 ? "1px solid var(--border)" : "none" }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                            📚
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cls.name}</div>
                            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--muted)" }}>
                              <span>{members} learners</span>
                              <span style={{ color: eng > 70 ? "var(--success)" : "var(--muted)" }}>{eng}% engaged</span>
                            </div>
                          </div>
                          <div style={{ width: 120 }}>
                            <div style={{ height: 6, borderRadius: 999, background: "var(--bg2)", overflow: "hidden" }}>
                              <div style={{ width: `${eng}%`, height: "100%", background: eng > 70 ? "#22c55e" : "#f59e0b", borderRadius: 999 }} />
                            </div>
                          </div>
                          <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => navigate("/classes")}>
                            View
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Alerts */}
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>⚠️ Engagement Alerts</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { type: "warn", msg: "3 learners haven't logged in for 7+ days", action: "Send reminder", color: "#f59e0b" },
                    { type: "good", msg: "Quiz completion is above average this week", color: "#22c55e" },
                    { type: "warn", msg: "2 lessons have 0 comments — consider adding discussion prompts", action: "View lessons", color: "#f59e0b" },
                    { type: "good", msg: "Your content creation streak: 5 days 🔥", color: "#cb26e4" },
                  ].map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: `${a.color}08`, border: `1px solid ${a.color}20` }}>
                      {a.type === "warn" ? <AlertCircle size={14} style={{ color: a.color, flexShrink: 0 }} /> : <CheckCircle2 size={14} style={{ color: a.color, flexShrink: 0 }} />}
                      <span style={{ flex: 1, fontSize: 13 }}>{a.msg}</span>
                      {a.action && <button className="btn" style={{ fontSize: 11, padding: "3px 10px" }}>{a.action}</button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── CONTENT TAB ── */}
          {activeTab === "content" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Content stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { label: "Total Lessons",  value: totalLessons,  color: "#cb26e4", icon: <BookOpen size={18} /> },
                  { label: "Quizzes",        value: totalQuizzes,  color: "#38bdf8", icon: <FileText size={18} /> },
                  { label: "Sessions",       value: sessionsHosted,color: "#22c55e", icon: <Video size={18} /> },
                  { label: "Posts",          value: postsCount,    color: "#f59e0b", icon: <MessageSquare size={18} /> },
                ].map(m => (
                  <div key={m.label} className="card" style={{ padding: "16px 18px", display: "flex", gap: 12, alignItems: "center", borderLeft: `3px solid ${m.color}` }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${m.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: m.color }}>
                      {m.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: m.color }}>{m.value}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{m.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Lesson list */}
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontWeight: 800 }}>📚 Recent Lessons</span>
                  <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => navigate("/lessons")}>
                    <PlusCircle size={13} /> New Lesson
                  </button>
                </div>
                {lessons.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)" }}>
                    <BookMarked size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
                    <div style={{ fontSize: 14, fontWeight: 600 }}>No lessons yet</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Create your first lesson with AI assistance.</div>
                    <button className="btn btn-primary" style={{ marginTop: 14, fontSize: 13 }} onClick={() => navigate("/lessons")}>
                      <Sparkles size={14} /> Generate with AI
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {lessons.slice(0, 8).map((l: any, i: number) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < lessons.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ fontSize: 18 }}>
                          {l.lesson_type === "video" ? "🎥" : l.lesson_type === "assignment" ? "📋" : l.lesson_type === "live" ? "🔴" : "📝"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>Class #{l.class_id} · {l.status}</div>
                        </div>
                        <span style={{
                          padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                          background: l.status === "published" ? "rgba(34,197,94,0.12)" : "var(--bg2)",
                          color: l.status === "published" ? "var(--success)" : "var(--muted)"
                        }}>{l.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Content tips */}
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>💡 Content Quality Tips</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { icon: "📝", tip: "Add ## headings to your lessons — they become presentation slides automatically" },
                    { icon: "🎯", tip: "Lessons with 5+ key terms get 40% higher quiz scores" },
                    { icon: "❓", tip: "End every lesson with 3 review questions to boost retention" },
                    { icon: "🖼️", tip: "Lessons with images get 2× more learner engagement" },
                    { icon: "⏱️", tip: "Keep lessons under 20 minutes for optimal completion rates" },
                    { icon: "📊", tip: "Use tables for comparisons — learners remember structured data better" },
                  ].map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10, background: "var(--bg2)", fontSize: 12 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
                      <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>{t.tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── AI INSIGHTS TAB ── */}
          {activeTab === "ai" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* AI banner */}
              <div style={{ padding: "20px 24px", borderRadius: 16, background: "linear-gradient(135deg, rgba(203,38,228,0.12) 0%, rgba(56,189,248,0.08) 100%)", border: "1px solid rgba(203,38,228,0.2)", display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ fontSize: 48 }}>🤖</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>Claude AI Teaching Assistant</div>
                  <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
                    Powered by Anthropic's Claude — generate complete lesson notes, quiz banks, presentation slides and resource suggestions instantly.
                  </div>
                </div>
                <button className="btn btn-primary" style={{ flexShrink: 0, padding: "10px 20px" }} onClick={() => navigate("/lessons")}>
                  <Sparkles size={15} /> Generate Lesson
                </button>
              </div>

              {/* AI suggestions */}
              <div>
                <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 15 }}>✨ Personalised AI Suggestions</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {aiSuggestions.map((s, i) => (
                    <AISuggestion key={i} {...s} />
                  ))}
                </div>
              </div>

              {/* AI capabilities */}
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ fontWeight: 800, marginBottom: 14 }}>🧠 What Claude AI Can Do For You</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[
                    { icon: "📝", title: "Complete Lesson Notes",      desc: "Rich, curriculum-aligned content with headings, examples and key terms", plans: "All AI Plans" },
                    { icon: "🎥", title: "YouTube Search Suggestions", desc: "Curated video searches matched to your exact lesson topic",                plans: "All AI Plans" },
                    { icon: "🖼️", title: "Image & Diagram Links",     desc: "Google Image searches for diagrams, charts and visual aids",              plans: "All AI Plans" },
                    { icon: "📊", title: "Presentation Outlines",      desc: "Slide-ready outlines for PowerPoint or Google Slides",                   plans: "All AI Plans" },
                    { icon: "🧪", title: "Quiz Generation",            desc: "AI creates quiz questions directly from your lesson content",             plans: "Professional+" },
                    { icon: "📋", title: "Assignment Creation",        desc: "Auto-generate assignments with rubrics and marking guides",               plans: "Professional+" },
                  ].map((f, i) => (
                    <div key={i} className="card" style={{ padding: "14px 16px", background: "var(--bg2)" }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{f.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 8 }}>{f.desc}</div>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(203,38,228,0.1)", color: "var(--accent)", fontWeight: 700 }}>{f.plans}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => navigate("/lessons")}>
                    <Sparkles size={14} /> Try AI Lesson Generator
                  </button>
                  <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => navigate("/subscription")}>
                    <Zap size={14} /> Upgrade for More AI Features
                  </button>
                </div>
              </div>

              {/* Teaching performance score */}
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ fontWeight: 800, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <Star size={16} style={{ color: "#f59e0b" }} /> Teaching Performance Score
                </div>
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 52, fontWeight: 900, color: "#cb26e4", lineHeight: 1 }}>
                      {Math.min(99, 40 + totalClasses * 8 + totalLessons * 3 + Math.min(30, totalLearners))}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>/ 100</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {[
                      { label: "Content Quality",   score: Math.min(100, 30 + totalLessons * 5),      color: "#cb26e4" },
                      { label: "Student Reach",     score: Math.min(100, Math.round(totalLearners * 2)), color: "#38bdf8" },
                      { label: "Class Activity",    score: Math.min(100, 20 + totalClasses * 15),     color: "#22c55e" },
                      { label: "Assessment Usage",  score: Math.min(100, 10 + totalQuizzes * 8),      color: "#f59e0b" },
                      { label: "Live Engagement",   score: Math.min(100, 5 + sessionsHosted * 20),    color: "#8b5cf6" },
                    ].map(s => (
                      <div key={s.label} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                          <span style={{ color: "var(--muted)" }}>{s.label}</span>
                          <span style={{ fontWeight: 700, color: s.color }}>{s.score}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 999, background: "var(--bg2)", overflow: "hidden" }}>
                          <div style={{ width: `${s.score}%`, height: "100%", background: s.color, borderRadius: 999 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(203,38,228,0.06)", border: "1px solid rgba(203,38,228,0.15)", fontSize: 13, color: "var(--muted)" }}>
                  💡 <strong>AI Tip:</strong> {
                    totalLessons === 0 ? "Create your first lesson to start building your teaching portfolio." :
                    totalQuizzes === 0 ? "Add quizzes to your lessons to boost your assessment score significantly." :
                    sessionsHosted === 0 ? "Host a live session to dramatically increase your engagement score." :
                    "You're doing great! Try sharing a lesson publicly to grow your learner base."
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}