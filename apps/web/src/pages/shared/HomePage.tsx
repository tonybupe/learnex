import AppShell from "@/components/layout/AppShell"
import FeedSection from "@/pages/shared/FeedSection"
import { useAuthStore } from "@/features/auth/auth.store"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useNavigate } from "react-router-dom"
import {
  PlusCircle, Sparkles, BookOpen, Video,
  TrendingUp, FileText, LayoutDashboard, Target
} from "lucide-react"

export default function HomePage() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const isTeacher = user?.role === "teacher"
  const isAdmin   = user?.role === "admin"
  const firstName = user?.full_name?.split(" ")[0] ?? "there"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const { data: stats } = useQuery({
    queryKey: ["home-stats", user?.id, user?.role],
    queryFn: async () => {
      const ep = isAdmin ? "/analytics/dashboard/admin"
        : isTeacher ? "/analytics/dashboard/teacher"
        : "/analytics/dashboard/learner"
      const res = await api.get(ep).catch(() => ({ data: {} }))
      return res.data
    },
    staleTime: 0, retry: 2, enabled: !!user?.id,
  })

  const teacherLinks = [
    { label: "New Lesson",   icon: <PlusCircle size={14} />,      path: "/lessons",           color: "#cb26e4" },
    { label: "New Quiz",     icon: <FileText size={14} />,        path: "/quizzes",           color: "#38bdf8" },
    { label: "Go Live",      icon: <Video size={14} />,           path: "/live-sessions",     color: "#ef4444" },
    { label: "AI Generate",  icon: <Sparkles size={14} />,        path: "/lessons",           color: "#f59e0b" },
    { label: "My Dashboard", icon: <LayoutDashboard size={14} />, path: "/teacher/dashboard", color: "#8b5cf6" },
  ]
  const adminLinks = [
    { label: "Dashboard",    icon: <LayoutDashboard size={14} />, path: "/admin/dashboard",   color: "#ef4444" },
    { label: "Analytics",    icon: <TrendingUp size={14} />,      path: "/analytics",         color: "#cb26e4" },
    { label: "Classes",      icon: <BookOpen size={14} />,        path: "/classes",           color: "#38bdf8" },
  ]
  const learnerLinks = [
    { label: "My Classes",   icon: <BookOpen size={14} />,        path: "/classes",           color: "#cb26e4" },
    { label: "Lessons",      icon: <FileText size={14} />,        path: "/lessons",           color: "#38bdf8" },
    { label: "Quizzes",      icon: <Target size={14} />,          path: "/quizzes",           color: "#22c55e" },
    { label: "Discover",     icon: <TrendingUp size={14} />,      path: "/discover",          color: "#f59e0b" },
  ]

  const quickLinks = isAdmin ? adminLinks : isTeacher ? teacherLinks : learnerLinks

  // API field mapping:
  // Teacher analytics: classes_count, lessons_count, total_learners, quizzes_count
  // Admin analytics:   total_users, total_classes, total_lessons
  // Learner analytics: enrolled_classes, completed_lessons, average_quiz_score
  const miniStats = isTeacher ? [
    { label: "Classes",  value: stats?.classes_count  ?? stats?.total_classes  ?? "—", color: "#cb26e4" },
    { label: "Students", value: stats?.total_learners ?? stats?.total_students ?? "—", color: "#38bdf8" },
    { label: "Lessons",  value: stats?.lessons_count  ?? stats?.total_lessons  ?? "—", color: "#22c55e" },
    { label: "Quizzes",  value: stats?.quizzes_count  ?? stats?.total_quizzes  ?? "—", color: "#f59e0b" },
  ] : isAdmin ? [
    { label: "Users",    value: stats?.total_users   ?? "—",                          color: "#ef4444" },
    { label: "Classes",  value: stats?.total_classes ?? stats?.classes_count ?? "—",  color: "#cb26e4" },
    { label: "Lessons",  value: stats?.total_lessons ?? stats?.lessons_count ?? "—",  color: "#38bdf8" },
  ] : [
    { label: "Enrolled",  value: stats?.enrolled_classes_count ?? 0,                                                               color: "#cb26e4" },
    { label: "Lessons",   value: stats?.lesson_count ?? 0,                                                                         color: "#38bdf8" },
    { label: "Avg Score", value: stats?.average_quiz_score != null ? (Number(stats.average_quiz_score).toFixed(1) + "%") : "—", color: "#22c55e" },
  ]

  return (
    <AppShell>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px 48px" }}>

        {/* Greeting + mini stats */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>
              👋 {greeting}, {firstName}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px", lineHeight: 1.2 }}>
              What's happening in your classes
            </h1>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </div>

          {/* Mini stats */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {miniStats.map(s => (
              <div key={s.label} style={{ padding: "8px 14px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)", textAlign: "center", minWidth: 64 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick action strip */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {quickLinks.map(a => (
            <button key={a.label} onClick={() => navigate(a.path)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, border: `1px solid ${a.color}30`, background: `${a.color}10`, color: a.color, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", transition: "all 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${a.color}22`}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = `${a.color}10`}>
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