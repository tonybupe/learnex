import { useState, useEffect } from "react"
import AppShell from "@/components/layout/AppShell"
import FeedSection from "@/pages/shared/FeedSection"
import { useAuthStore } from "@/features/auth/auth.store"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useNavigate } from "react-router-dom"
import {
  PlusCircle, Sparkles, BookOpen, Video,
  TrendingUp, FileText, LayoutDashboard, Target,
  Users, GraduationCap, Brain, BarChart2, Zap
} from "lucide-react"

export default function HomePage() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const isTeacher = user?.role === "teacher"
  const isAdmin   = user?.role === "admin"
  const isLearner = user?.role === "learner"
  const firstName = user?.full_name?.split(" ")[0] ?? "there"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  const { data: stats } = useQuery({
    queryKey: ["home-stats", user?.id, user?.role],
    queryFn: async () => {
      const ep = isAdmin ? "/analytics/dashboard/admin"
        : isTeacher ? "/analytics/dashboard/teacher"
        : "/analytics/dashboard/learner"
      const res = await api.get(ep).catch(() => ({ data: {} }))
      return res.data
    },
    staleTime: 60000, retry: 2, enabled: !!user?.id,
  })

  const teacherLinks = [
    { label: "New Lesson",   icon: <PlusCircle size={15} />,      path: "/lessons",           color: "#cb26e4" },
    { label: "New Quiz",     icon: <FileText size={15} />,        path: "/quizzes",           color: "#38bdf8" },
    { label: "Go Live",      icon: <Video size={15} />,           path: "/live-sessions",     color: "#ef4444" },
    { label: "AI Generate",  icon: <Sparkles size={15} />,        path: "/lessons",           color: "#f59e0b" },
    { label: "Dashboard",    icon: <LayoutDashboard size={15} />, path: "/teacher/dashboard", color: "#8b5cf6" },
    { label: "My Classes",   icon: <GraduationCap size={15} />,   path: "/classes",           color: "#22c55e" },
  ]
  const adminLinks = [
    { label: "Dashboard",    icon: <LayoutDashboard size={15} />, path: "/admin/dashboard",   color: "#ef4444" },
    { label: "Analytics",    icon: <BarChart2 size={15} />,       path: "/analytics",         color: "#cb26e4" },
    { label: "Classes",      icon: <BookOpen size={15} />,        path: "/classes",           color: "#38bdf8" },
    { label: "Users",        icon: <Users size={15} />,           path: "/admin/users",       color: "#22c55e" },
  ]
  const learnerLinks = [
    { label: "My Classes",   icon: <BookOpen size={15} />,        path: "/classes",           color: "#cb26e4" },
    { label: "Lessons",      icon: <FileText size={15} />,        path: "/lessons",           color: "#38bdf8" },
    { label: "Quizzes",      icon: <Brain size={15} />,           path: "/quizzes",           color: "#22c55e" },
    { label: "Discover",     icon: <TrendingUp size={15} />,      path: "/discover",          color: "#f59e0b" },
    { label: "Dashboard",    icon: <LayoutDashboard size={15} />, path: "/learner/dashboard", color: "#8b5cf6" },
  ]

  const quickLinks = isAdmin ? adminLinks : isTeacher ? teacherLinks : learnerLinks

  const miniStats = isTeacher ? [
    { label: "Classes",  value: stats?.classes_count  ?? "—", color: "#cb26e4", icon: <GraduationCap size={14} /> },
    { label: "Learners", value: stats?.total_learners ?? "—", color: "#38bdf8", icon: <Users size={14} /> },
    { label: "Lessons",  value: stats?.lessons_count  ?? "—", color: "#22c55e", icon: <BookOpen size={14} /> },
    { label: "Quizzes",  value: stats?.total_quiz_attempts ?? "—", color: "#f59e0b", icon: <Brain size={14} /> },
  ] : isAdmin ? [
    { label: "Users",    value: stats?.total_users   ?? "—", color: "#ef4444", icon: <Users size={14} /> },
    { label: "Classes",  value: stats?.total_classes ?? "—", color: "#cb26e4", icon: <GraduationCap size={14} /> },
    { label: "Lessons",  value: stats?.total_lessons ?? "—", color: "#38bdf8", icon: <BookOpen size={14} /> },
  ] : [
    { label: "Enrolled",  value: stats?.enrolled_classes_count ?? 0, color: "#cb26e4", icon: <GraduationCap size={14} /> },
    { label: "Lessons",   value: stats?.lesson_count ?? 0,           color: "#38bdf8", icon: <BookOpen size={14} /> },
    { label: "Avg Score", value: stats?.average_quiz_score != null ? (Number(stats.average_quiz_score).toFixed(0) + "%") : "—", color: "#22c55e", icon: <Target size={14} /> },
  ]

  const roleColor = isTeacher ? "#cb26e4" : isAdmin ? "#ef4444" : "#38bdf8"
  const roleLabel = isTeacher ? "Teacher" : isAdmin ? "Admin" : "Learner"

  return (
    <AppShell>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "12px 12px 80px" : "20px 20px 48px" }}>

        {/* Hero greeting */}
        <div style={{
          background: "linear-gradient(135deg, var(--card) 0%, var(--bg2) 100%)",
          borderRadius: 18, padding: isMobile ? "16px" : "22px 24px",
          border: "1px solid var(--border)", marginBottom: 16, position: "relative", overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: `${roleColor}08`, pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: roleColor, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={11} /> {greeting}, {firstName}!
              </div>
              <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, margin: "0 0 4px", color: "var(--text)" }}>
                What's happening in your classes
              </h1>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
            </div>
            {/* Role badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: `${roleColor}12`, border: `1px solid ${roleColor}25` }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: roleColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 12 }}>
                {firstName[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: roleColor }}>{roleLabel}</span>
            </div>
          </div>

          {/* Mini stats */}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {miniStats.map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)", flex: isMobile ? "1 1 calc(50% - 4px)" : "0 0 auto" }}>
                <div style={{ color: s.color }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", scrollbarWidth: "none" as const, paddingBottom: 4 }}>
          {quickLinks.map(a => (
            <button key={a.label} onClick={() => navigate(a.path)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 24, border: `1.5px solid ${a.color}25`, background: `${a.color}08`, color: a.color, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", transition: "all 0.15s", flexShrink: 0, whiteSpace: "nowrap" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${a.color}18`; el.style.transform = "translateY(-1px)" }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${a.color}08`; el.style.transform = "none" }}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        <FeedSection />
      </div>
    </AppShell>
  )
}