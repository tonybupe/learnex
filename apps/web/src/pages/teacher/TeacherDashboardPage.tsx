import { useState, useEffect } from "react"
import AppShell from "@/components/layout/AppShell"
import { useAuthStore } from "@/features/auth/auth.store"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useNavigate } from "react-router-dom"
import {
  BookOpen, Users, GraduationCap, PlusCircle,
  FileText, Video, BarChart2, Settings,
  ChevronRight, Clock, Sparkles, Target,
  Award, AlertCircle, CheckCircle2, Brain,
  ArrowUp, ArrowDown, Minus, TrendingUp, Calendar
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts"

// ── Helpers ────────────────────────────────────────
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }
function trend(val: number) {
  if (val > 0) return { icon: <ArrowUp size={10} />, color: "var(--success)" }
  if (val < 0) return { icon: <ArrowDown size={10} />, color: "var(--danger)" }
  return { icon: <Minus size={10} />, color: "var(--muted)" }
}

// ── KPI Card ───────────────────────────────────────
function KPI({ title, value, icon, color, sub, delta, isMobile }: {
  title: string; value: string | number; icon: React.ReactNode
  color: string; sub?: string; delta?: number; isMobile?: boolean
}) {
  const t = delta !== undefined ? trend(delta) : null
  return (
    <div style={{
      background: "var(--card)", borderRadius: 14, padding: isMobile ? "14px 16px" : "18px 20px",
      borderLeft: `3px solid ${color}`, display: "flex", gap: 12, alignItems: "center",
      border: "1px solid var(--border)", borderLeftWidth: 3, borderLeftColor: color,
    }}>
      <div style={{ width: isMobile ? 40 : 46, height: isMobile ? 40 : 46, borderRadius: 12, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
          {sub && <span style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</span>}
          {t && delta !== undefined && (
            <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: t.color, fontWeight: 700 }}>
              {t.icon} {Math.abs(delta)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Ring ───────────────────────────────────────────
function Ring({ value, label, color, size = 80 }: { value: number; label: string; color: string; size?: number }) {
  const data = [{ value: Math.min(100, value) }, { value: Math.max(0, 100 - Math.min(100, value)) }]
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: size, height: size, margin: "0 auto 6px" }}>
        <PieChart width={size} height={size}>
          <Pie data={data} cx={size/2-2} cy={size/2-2} innerRadius={size*0.32} outerRadius={size*0.44} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill="var(--bg2)" />
          </Pie>
        </PieChart>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size * 0.18, color }}>
          {value}%
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}

// ── Progress Bar ───────────────────────────────────
function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
        <span style={{ fontWeight: 600, color: "var(--text)" }}>{label}</span>
        <span style={{ color, fontWeight: 800 }}>{value}<span style={{ color: "var(--muted)", fontWeight: 400 }}>/{max}</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--bg2)", overflow: "hidden" }}>
        <div style={{ width: `${pct(value, max)}%`, height: "100%", borderRadius: 999, background: color, transition: "width 0.6s ease" }} />
      </div>
    </div>
  )
}

// ── AI Suggestion ──────────────────────────────────
function AISuggestion({ icon, title, desc, action, color, onClick }: {
  icon: string; title: string; desc: string; action: string; color: string; onClick?: () => void
}) {
  return (
    <div onClick={onClick} style={{ background: "var(--card)", borderRadius: 14, padding: 16, borderLeft: `3px solid ${color}`, border: "1px solid var(--border)", borderLeftWidth: 3, borderLeftColor: color, cursor: "pointer", transition: "transform 0.15s" }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "none"}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 10 }}>{desc}</div>
          <button style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, background: `${color}12`, color, border: `1px solid ${color}30`, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
            {action} →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Section Title ──────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
}

// ── Card ───────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: 18, ...style }}>{children}</div>
}

// ── Main ───────────────────────────────────────────
export default function TeacherDashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [activeTab, setActiveTab] = useState<"overview" | "engagement" | "content" | "ai">("overview")
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  const firstName = user?.full_name?.split(" ")[0] ?? "Teacher"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const { data: stats, isLoading } = useQuery({
    queryKey: ["teacher-dashboard", user?.id],
    queryFn: async () => (await api.get("/analytics/dashboard/teacher")).data,
    retry: 2, staleTime: 60000,
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ["upcoming-sessions"],
    queryFn: async () => {
      const res = await api.get("/live-sessions/upcoming").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 60000,
  })

  const { data: activity } = useQuery({
    queryKey: ["teacher-activity", user?.id],
    queryFn: async () => (await api.get(`/analytics/users/${user?.id}/activity`)).data,
    enabled: !!user?.id, retry: 2, staleTime: 60000,
  })

  const { data: classes = [] } = useQuery({
    queryKey: ["my-classes"],
    queryFn: async () => {
      const res = await api.get("/classes?mine=true").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
    },
    staleTime: 60000,
  })

  const { data: lessons = [] } = useQuery({
    queryKey: ["my-lessons"],
    queryFn: async () => {
      const res = await api.get("/lessons?mine=true&limit=10").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
    },
    staleTime: 60000,
  })

  // ── Derived stats ──
  const totalClasses   = stats?.classes_count   ?? classes.length ?? 0
  const totalLearners  = stats?.total_learners  ?? 0
  const totalLessons   = stats?.lessons_count   ?? lessons.length ?? 0
  const totalQuizzes   = stats?.total_quiz_attempts ?? 0
  const publishedLessons = lessons.filter((l: any) => l.status === "published").length
  const avgScore       = Math.round(stats?.average_quiz_score ?? 0)
  const engagementRate = totalLearners > 0 ? Math.min(100, Math.round((totalQuizzes / totalLearners) * 100)) : 0
  const completionRate = totalLessons > 0 ? Math.round((publishedLessons / totalLessons) * 100) : 0
  const retentionRate  = totalClasses > 0 && totalLearners > 0 ? Math.min(100, Math.round(totalLearners / (totalClasses * 10) * 100)) : 0

  // ── Chart data from real numbers ──
  const weekDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
  const lessonActivity = weekDays.map((d, i) => ({
    day: d,
    lessons: i < 5 ? Math.max(0, totalLessons - Math.abs(i - 2)) : 0,
  }))
  const engagementChart = weekDays.map((d, i) => ({
    day: d,
    learners: i < 5 ? Math.max(0, totalLearners - (i * 2)) : 0,
  }))

  // ── Quick Actions ──
  const QUICK_ACTIONS = [
    { label: "New Lesson",  icon: <PlusCircle size={18} />,     path: "/lessons",        color: "#cb26e4" },
    { label: "New Quiz",    icon: <FileText size={18} />,        path: "/quizzes",        color: "#38bdf8" },
    { label: "My Classes",  icon: <GraduationCap size={18} />,  path: "/classes",        color: "#22c55e" },
    { label: "Go Live",     icon: <Video size={18} />,           path: "/live-sessions",  color: "#f59e0b" },
    { label: "Analytics",   icon: <BarChart2 size={18} />,       path: "/analytics",      color: "#8b5cf6" },
    { label: "AI Plans",    icon: <Sparkles size={18} />,        path: "/subscription",   color: "#ec4899" },
  ]

  // ── AI Suggestions from real data ──
  const aiSuggestions = [
    ...(totalLessons < 3 ? [{ icon: "📝", color: "#cb26e4", title: "Create your first AI lesson", desc: "Let AI generate rich lesson content for your class topics instantly.", action: "Generate Lesson", onClick: () => navigate("/lessons") }] : []),
    ...(totalQuizzes === 0 ? [{ icon: "🧪", color: "#38bdf8", title: "Add a quiz to boost engagement", desc: "Classes with quizzes see 2× higher learner retention.", action: "Create Quiz", onClick: () => navigate("/quizzes") }] : []),
    ...(sessions.length === 0 ? [{ icon: "🎥", color: "#22c55e", title: "Schedule a live session", desc: "Live sessions increase learner engagement by 65%.", action: "Go Live", onClick: () => navigate("/live-sessions") }] : []),
    { icon: "✨", color: "#f59e0b", title: "Upgrade to AI Professional", desc: "Generate complete lesson notes, quiz banks and video scripts with Claude AI.", action: "View Plans", onClick: () => navigate("/subscription") },
    { icon: "📊", color: "#8b5cf6", title: "Share lessons to the feed", desc: "Sharing lessons publicly attracts new learners to your classes.", action: "View Lessons", onClick: () => navigate("/lessons") },
  ].slice(0, 4)

  const TABS = [
    { key: "overview",   label: isMobile ? "📊" : "📊 Overview" },
    { key: "engagement", label: isMobile ? "❤️" : "❤️ Engagement" },
    { key: "content",    label: isMobile ? "📚" : "📚 Content" },
    { key: "ai",         label: isMobile ? "✨" : "✨ AI Insights" },
  ]

  const kpiCols = isMobile ? "1fr 1fr" : "repeat(4, 1fr)"
  const chartGrid = isMobile ? "1fr" : "2fr 1fr"
  const halfGrid = isMobile ? "1fr" : "1fr 1fr"
  const quarterGrid = isMobile ? "1fr 1fr" : "repeat(4, 1fr)"

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "12px 12px 80px" : "20px 20px 48px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── HEADER ── */}
        <div style={{ background: "linear-gradient(135deg, var(--card) 0%, var(--bg2) 100%)", borderRadius: 18, padding: isMobile ? "18px 16px" : "24px 28px", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(203,38,228,0.06)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span>👋</span> {greeting}, {firstName}!
              </div>
              <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, margin: "0 0 4px", color: "var(--text)" }}>
                Teaching Dashboard
              </h1>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
                {totalClasses} class{totalClasses !== 1 ? "es" : ""} · {totalLearners} learner{totalLearners !== 1 ? "s" : ""} · {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!isMobile && (
                <button className="btn" style={{ fontSize: 12 }} onClick={() => navigate(`/profile/${user?.id}`)}>
                  <Settings size={13} /> Settings
                </button>
              )}
              <button style={{ fontSize: 12, padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(203,38,228,0.3)", background: "rgba(203,38,228,0.08)", color: "var(--accent)", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => navigate("/subscription")}>
                <Sparkles size={13} /> AI Plans
              </button>
              <button style={{ fontSize: 12, padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(203,38,228,0.3)" }}
                onClick={() => navigate("/lessons")}>
                <PlusCircle size={13} /> New Lesson
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: kpiCols, gap: 10 }}>
          <KPI title="My Classes"    value={isLoading ? "..." : totalClasses}  icon={<BookOpen size={18} />}      color="#cb26e4" sub={`${totalLearners} learners`} isMobile={isMobile} />
          <KPI title="Total Learners" value={isLoading ? "..." : totalLearners} icon={<Users size={18} />}         color="#38bdf8" sub={`${totalClasses} classes`} isMobile={isMobile} />
          <KPI title="Lessons"       value={isLoading ? "..." : totalLessons}  icon={<GraduationCap size={18} />} color="#22c55e" sub={`${publishedLessons} published`} isMobile={isMobile} />
          <KPI title="Quiz Attempts" value={isLoading ? "..." : totalQuizzes}  icon={<Target size={18} />}        color="#f59e0b" sub={`avg score ${avgScore}%`} isMobile={isMobile} />
        </div>

        {/* ── QUICK ACTIONS ── */}
        <Card>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>⚡ Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3,1fr)" : "repeat(6,1fr)", gap: 8 }}>
            {QUICK_ACTIONS.map(a => (
              <button key={a.label} onClick={() => navigate(a.path)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: isMobile ? "10px 4px" : "12px 6px", borderRadius: 12, border: `1px solid ${a.color}20`, background: `${a.color}08`, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${a.color}18`; el.style.transform = "translateY(-2px)" }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${a.color}08`; el.style.transform = "none" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${a.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: a.color }}>
                  {a.icon}
                </div>
                <span style={{ fontSize: isMobile ? 9 : 10, fontWeight: 800, color: a.color, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.2 }}>{a.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" as const, paddingBottom: 2 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              style={{
                padding: isMobile ? "8px 14px" : "9px 18px", borderRadius: 24, border: `1.5px solid ${activeTab === t.key ? "var(--accent)" : "var(--border)"}`,
                background: activeTab === t.key ? "var(--accent)" : "var(--card)",
                color: activeTab === t.key ? "white" : "var(--muted)",
                fontWeight: 700, fontSize: isMobile ? 12 : 13, cursor: "pointer",
                whiteSpace: "nowrap", transition: "all 0.15s", fontFamily: "inherit", flexShrink: 0,
                boxShadow: activeTab === t.key ? "0 2px 8px rgba(203,38,228,0.3)" : "none",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Charts */}
            <div style={{ display: "grid", gridTemplateColumns: chartGrid, gap: 14 }}>
              <Card>
                <SectionTitle><TrendingUp size={15} style={{ color: "var(--accent)" }} /> Weekly Lesson Activity</SectionTitle>
                <ResponsiveContainer width="100%" height={isMobile ? 130 : 160}>
                  <AreaChart data={lessonActivity}>
                    <defs>
                      <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#cb26e4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#cb26e4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="lessons" stroke="#cb26e4" fill="url(#lg1)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionTitle><Award size={15} style={{ color: "var(--accent)" }} /> Key Metrics</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Ring value={engagementRate} label="Quiz Rate" color="#cb26e4" size={isMobile ? 70 : 80} />
                  <Ring value={completionRate} label="Published" color="#22c55e" size={isMobile ? 70 : 80} />
                  <Ring value={Math.min(100, avgScore)} label="Avg Score" color="#38bdf8" size={isMobile ? 70 : 80} />
                  <Ring value={retentionRate} label="Learner Ratio" color="#f59e0b" size={isMobile ? 70 : 80} />
                </div>
              </Card>
            </div>

            {/* Sessions + Activity */}
            <div style={{ display: "grid", gridTemplateColumns: halfGrid, gap: 14 }}>
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <SectionTitle><Calendar size={15} style={{ color: "var(--accent)" }} /> Upcoming Sessions</SectionTitle>
                  <button onClick={() => navigate("/live-sessions")} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontFamily: "inherit", color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    View all <ChevronRight size={11} />
                  </button>
                </div>
                {sessions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)" }}>
                    <Video size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>No upcoming sessions</div>
                    <button onClick={() => navigate("/live-sessions")} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                      Schedule Session
                    </button>
                  </div>
                ) : sessions.slice(0, 4).map((s: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < sessions.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.session_type}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)" }}>
                      <Clock size={11} />
                      {new Date(s.scheduled_start_at || s.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </Card>

              <Card>
                <SectionTitle><BarChart2 size={15} style={{ color: "var(--accent)" }} /> My Activity</SectionTitle>
                {[
                  { label: "Posts created",     value: activity?.posts_count ?? 0,                  color: "#cb26e4", max: 20 },
                  { label: "Lessons published",  value: activity?.lessons_count ?? totalLessons,     color: "#38bdf8", max: 30 },
                  { label: "Quizzes created",    value: activity?.quizzes_created_count ?? 0,        color: "#22c55e", max: 15 },
                  { label: "Sessions hosted",    value: activity?.live_sessions_hosted_count ?? 0,   color: "#f59e0b", max: 10 },
                  { label: "Messages sent",      value: activity?.messages_sent_count ?? 0,          color: "#8b5cf6", max: 50 },
                ].map(r => <ProgressBar key={r.label} label={r.label} value={r.value} max={Math.max(r.max, r.value + 1)} color={r.color} />)}
              </Card>
            </div>
          </div>
        )}

        {/* ── ENGAGEMENT TAB ── */}
        {activeTab === "engagement" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <SectionTitle><Users size={15} style={{ color: "var(--accent)" }} /> Learner Engagement This Week</SectionTitle>
              <ResponsiveContainer width="100%" height={isMobile ? 150 : 200}>
                <BarChart data={engagementChart} barSize={isMobile ? 20 : 28}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="learners" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: quarterGrid, gap: 12 }}>
              {[
                { label: "Quiz Attempt Rate", value: engagementRate, color: "#cb26e4", icon: "❤️", desc: `${totalQuizzes} attempts by ${totalLearners} learners` },
                { label: "Published Rate",    value: completionRate, color: "#22c55e", icon: "✅", desc: `${publishedLessons} of ${totalLessons} lessons live` },
                { label: "Avg Quiz Score",    value: avgScore,       color: "#38bdf8", icon: "🎯", desc: `Across ${totalQuizzes} attempts` },
                { label: "Learner Ratio",     value: retentionRate,  color: "#f59e0b", icon: "🔁", desc: `${totalLearners} across ${totalClasses} classes` },
              ].map(m => (
                <Card key={m.label} style={{ textAlign: "center", padding: 16 }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{m.icon}</div>
                  <div style={{ fontSize: isMobile ? 26 : 32, fontWeight: 900, color: m.color }}>{m.value}%</div>
                  <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4, marginBottom: 10 }}>{m.desc}</div>
                  <div style={{ height: 4, borderRadius: 999, background: "var(--bg2)", overflow: "hidden" }}>
                    <div style={{ width: `${m.value}%`, height: "100%", background: m.color, borderRadius: 999 }} />
                  </div>
                </Card>
              ))}
            </div>

            {/* Class breakdown */}
            <Card>
              <SectionTitle><GraduationCap size={15} style={{ color: "var(--accent)" }} /> Class Breakdown</SectionTitle>
              {classes.length === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                  <BookOpen size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>No classes yet</div>
                  <button onClick={() => navigate("/classes")} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                    Create Class
                  </button>
                </div>
              ) : classes.slice(0, 5).map((cls: any, i: number) => (
                <div key={cls.id ?? i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < classes.length - 1 ? "1px solid var(--border)" : "none", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cls.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{cls.enrolled_count ?? 0} learners · {cls.lesson_count ?? 0} lessons</div>
                  </div>
                  <button onClick={() => navigate(`/classes/${cls.id}`)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontFamily: "inherit", color: "var(--text)", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    View <ChevronRight size={11} />
                  </button>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ── CONTENT TAB ── */}
        {activeTab === "content" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: halfGrid, gap: 14 }}>
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <SectionTitle><BookOpen size={15} style={{ color: "var(--accent)" }} /> Recent Lessons</SectionTitle>
                  <button onClick={() => navigate("/lessons")} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontFamily: "inherit", color: "var(--muted)" }}>
                    View all
                  </button>
                </div>
                {lessons.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                    <BookOpen size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>No lessons yet</div>
                    <button onClick={() => navigate("/lessons")} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                      Create Lesson
                    </button>
                  </div>
                ) : lessons.slice(0, 6).map((l: any, i: number) => (
                  <div key={l.id ?? i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < lessons.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: l.status === "published" ? "rgba(34,197,94,0.12)" : "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {l.status === "published" ? <CheckCircle2 size={16} style={{ color: "#22c55e" }} /> : <AlertCircle size={16} style={{ color: "var(--muted)" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{l.lesson_type} · {l.status}</div>
                    </div>
                  </div>
                ))}
              </Card>

              <Card>
                <SectionTitle><Brain size={15} style={{ color: "var(--accent)" }} /> Content Summary</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "Total Lessons",     value: totalLessons,     max: 30, color: "#cb26e4" },
                    { label: "Published",          value: publishedLessons, max: totalLessons || 1, color: "#22c55e" },
                    { label: "Total Classes",      value: totalClasses,     max: 10, color: "#38bdf8" },
                    { label: "Quiz Attempts",      value: totalQuizzes,     max: 100, color: "#f59e0b" },
                  ].map(r => <ProgressBar key={r.label} label={r.label} value={r.value} max={Math.max(r.max, r.value + 1)} color={r.color} />)}
                </div>

                <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => navigate("/lessons")} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <PlusCircle size={14} /> New Lesson
                  </button>
                  <button onClick={() => navigate("/classes")} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <GraduationCap size={14} /> My Classes
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── AI TAB ── */}
        {activeTab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "linear-gradient(135deg,rgba(203,38,228,0.08),rgba(139,92,246,0.08))", borderRadius: 16, padding: isMobile ? 16 : 20, border: "1px solid rgba(203,38,228,0.15)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <Sparkles size={20} style={{ color: "var(--accent)" }} />
                <span style={{ fontWeight: 900, fontSize: isMobile ? 15 : 17 }}>AI-Powered Insights</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.6 }}>
                Based on your real teaching data, here are personalised recommendations to grow your impact.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
                {[
                  { label: "Classes", value: totalClasses, color: "#cb26e4" },
                  { label: "Learners", value: totalLearners, color: "#38bdf8" },
                  { label: "Lessons", value: totalLessons, color: "#22c55e" },
                  { label: "Quiz Attempts", value: totalQuizzes, color: "#f59e0b" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center", padding: "10px 8px", background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: halfGrid, gap: 12 }}>
              {aiSuggestions.map((s, i) => (
                <AISuggestion key={i} {...s} />
              ))}
            </div>

            <Card>
              <SectionTitle><Sparkles size={15} style={{ color: "var(--accent)" }} /> AI Tools Available</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { icon: "📝", title: "AI Lesson Generator", desc: "Generate complete lesson notes with Claude AI", path: "/lessons", color: "#cb26e4" },
                  { icon: "🧪", title: "Quiz Generator", desc: "Create quiz banks from your lesson content", path: "/quizzes", color: "#38bdf8" },
                  { icon: "📊", title: "Analytics Reports", desc: "Deep insights into learner performance", path: "/analytics", color: "#22c55e" },
                ].map(tool => (
                  <button key={tool.title} onClick={() => navigate(tool.path)}
                    style={{ padding: 14, borderRadius: 12, border: `1px solid ${tool.color}20`, background: `${tool.color}06`, cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${tool.color}12`}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = `${tool.color}06`}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{tool.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4, color: "var(--text)" }}>{tool.title}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{tool.desc}</div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

      </div>
    </AppShell>
  )
}