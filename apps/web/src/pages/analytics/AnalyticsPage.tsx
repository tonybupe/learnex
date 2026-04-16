import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useAuth } from "@/features/auth/useAuth"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell
} from "recharts"
import { BookOpen, Users, FileText, Star, TrendingUp, Award, GraduationCap } from "lucide-react"

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const COLORS = ["#cb26e4", "#38bdf8", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"]

export default function AnalyticsPage() {
  const { isTeacher, isAdmin, isLearner, user } = useAuth()

  // Teacher analytics
  const { data: tData, isLoading: tLoading, error: tError } = useQuery({
    queryKey: ["analytics-teacher"],
    queryFn: async () => {
      const res = await api.get("/analytics/dashboard/teacher")
      return res.data
    },
    enabled: !!(isTeacher || isAdmin),
    retry: false,
  })

  // Fallback: fetch real counts if analytics fails
  const { data: myClasses = [] } = useQuery({
    queryKey: ["analytics-my-classes"],
    queryFn: async () => {
      const res = await api.get("/classes?mine=true").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: !!(isTeacher || isAdmin),
  })

  const { data: myLessons = [] } = useQuery({
    queryKey: ["analytics-my-lessons"],
    queryFn: async () => {
      const res = await api.get("/lessons?mine=true").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: !!(isTeacher || isAdmin),
  })

  const { data: myPosts = [] } = useQuery({
    queryKey: ["analytics-my-posts"],
    queryFn: async () => {
      const res = await api.get("/posts/mine").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: !!(isTeacher || isAdmin),
  })

  // Learner analytics
  const { data: lData, isLoading: lLoading } = useQuery({
    queryKey: ["analytics-learner"],
    queryFn: async () => (await api.get("/analytics/dashboard/learner")).data,
    enabled: !!isLearner,
    retry: false,
  })

  const isLoading = isLearner ? lLoading : tLoading

  // Normalize teacher stats - map API fields to display fields
  const teacherStats = {
    total_classes:   tData?.classes_count      ?? myClasses.length,
    total_lessons:   tData?.lessons_count      ?? myLessons.length,
    total_students:  tData?.total_learners     ?? 0,
    total_quizzes:   tData?.quizzes_count      ?? 0,
    total_posts:     tData?.posts_count        ?? myPosts.length,
    live_sessions:   tData?.live_sessions_count ?? 0,
    avg_quiz_score:  tData?.average_quiz_score ?? 0,
  }

  // Lesson breakdown by type
  const lessonByType = myLessons.reduce((acc: any, l: any) => {
    acc[l.lesson_type] = (acc[l.lesson_type] ?? 0) + 1
    return acc
  }, {})
  const lessonTypeData = Object.entries(lessonByType).map(([name, value]) => ({ name, value }))

  // Lesson status breakdown
  const lessonByStatus = myLessons.reduce((acc: any, l: any) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})
  const lessonStatusData = Object.entries(lessonByStatus).map(([name, value]) => ({ name, value }))

  // Class enrollment data
  const classEnrollData = myClasses.slice(0, 6).map((c: any) => ({
    name: c.title.length > 14 ? c.title.slice(0, 14) + "…" : c.title,
    students: c.member_count ?? 0,
    lessons: myLessons.filter((l: any) => l.class_id === c.id).length,
  }))

  // Weekly activity (last 7 days from lessons)
  const weekDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
  const weeklyData = weekDays.map((day, i) => ({
    day,
    lessons: myLessons.filter((l: any) => {
      const d = new Date(l.created_at)
      return d.getDay() === (i + 1) % 7
    }).length,
    posts: myPosts.filter((p: any) => {
      const d = new Date(p.created_at)
      return d.getDay() === (i + 1) % 7
    }).length,
  }))

  const teacherKPIs = [
    { label: "My Classes",   value: teacherStats.total_classes,  icon: <GraduationCap size={18} />, color: "#cb26e4" },
    { label: "Lessons",      value: teacherStats.total_lessons,   icon: <BookOpen size={18} />,      color: "#38bdf8" },
    { label: "Students",     value: teacherStats.total_students,  icon: <Users size={18} />,         color: "#22c55e" },
    { label: "Quizzes",      value: teacherStats.total_quizzes,   icon: <FileText size={18} />,      color: "#f59e0b" },
    { label: "Posts",        value: teacherStats.total_posts,     icon: <Star size={18} />,          color: "#8b5cf6" },
    { label: "Avg Score",    value: `${teacherStats.avg_quiz_score.toFixed(1)}%`, icon: <Award size={18} />, color: "#ef4444" },
  ]

  const learnerKPIs = [
    { label: "Enrolled",     value: lData?.enrolled_classes  ?? 0, icon: <GraduationCap size={18} />, color: "#cb26e4" },
    { label: "Lessons Done", value: lData?.completed_lessons ?? 0, icon: <BookOpen size={18} />,      color: "#38bdf8" },
    { label: "Quizzes",      value: lData?.quizzes_taken     ?? 0, icon: <FileText size={18} />,      color: "#22c55e" },
    { label: "Avg Score",    value: `${lData?.average_quiz_score ?? 0}%`, icon: <Award size={18} />, color: "#f59e0b" },
  ]

  const kpis = isLearner ? learnerKPIs : teacherKPIs

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 60px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px" }}>📊 Analytics</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            {isTeacher || isAdmin ? "Your teaching performance and class engagement." : "Your learning progress and achievements."}
          </p>
        </div>

        {isLoading ? (
          <div className="card" style={{ padding: 60, textAlign: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: "var(--muted)" }}>Loading analytics...</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, gap: 12 }}>
              {kpis.map((k, i) => (
                <div key={i} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${k.color}15`, border: `1px solid ${k.color}25`, display: "flex", alignItems: "center", justifyContent: "center", color: k.color, flexShrink: 0 }}>
                    {k.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 2 }}>{k.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{k.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Teacher charts */}
            {(isTeacher || isAdmin) && (
              <>
                {/* Weekly activity */}
                <div className="card">
                  <div className="card-head" style={{ marginBottom: 16 }}>
                    <span className="card-title">📈 Weekly Activity</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Lessons & posts this week</span>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                      <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} labelStyle={{ color: "var(--text)" }} />
                      <Line type="monotone" dataKey="lessons" stroke="#cb26e4" strokeWidth={2} dot={{ fill: "#cb26e4", r: 4 }} name="Lessons" />
                      <Line type="monotone" dataKey="posts" stroke="#38bdf8" strokeWidth={2} dot={{ fill: "#38bdf8", r: 4 }} name="Posts" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* Class students bar chart */}
                  <div className="card">
                    <div className="card-head" style={{ marginBottom: 16 }}>
                      <span className="card-title">🎓 Classes Overview</span>
                    </div>
                    {classEnrollData.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "30px 0", color: "var(--muted)", fontSize: 13 }}>
                        No classes yet. <a href="/classes" style={{ color: "var(--accent)" }}>Create one →</a>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={classEnrollData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                          <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} allowDecimals={false} />
                          <YAxis dataKey="name" type="category" tick={{ fill: "var(--muted)", fontSize: 11 }} width={80} />
                          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                          <Bar dataKey="students" fill="#cb26e4" radius={[0,4,4,0]} name="Students" />
                          <Bar dataKey="lessons" fill="#38bdf8" radius={[0,4,4,0]} name="Lessons" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Lesson type pie */}
                  <div className="card">
                    <div className="card-head" style={{ marginBottom: 16 }}>
                      <span className="card-title">📚 Lesson Types</span>
                    </div>
                    {lessonTypeData.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "30px 0", color: "var(--muted)", fontSize: 13 }}>
                        No lessons yet. <a href="/lessons" style={{ color: "var(--accent)" }}>Create one →</a>
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie data={lessonTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                              {lessonTypeData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
                          {lessonTypeData.map((d: any, i: number) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                              <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                              <span style={{ color: "var(--muted)" }}>{d.name}</span>
                              <span style={{ fontWeight: 700 }}>{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Lesson status breakdown */}
                {lessonStatusData.length > 0 && (
                  <div className="card">
                    <div className="card-head" style={{ marginBottom: 16 }}>
                      <span className="card-title">📋 Lesson Status</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {lessonStatusData.map((d: any, i: number) => (
                        <div key={i} style={{ flex: 1, minWidth: 120, padding: "14px 18px", borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)", textAlign: "center" }}>
                          <div style={{ fontSize: 24, fontWeight: 900, color: COLORS[i % COLORS.length] }}>{d.value}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginTop: 2, textTransform: "capitalize" }}>{d.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent lessons list */}
                {myLessons.length > 0 && (
                  <div className="card">
                    <div className="card-head" style={{ marginBottom: 12 }}>
                      <span className="card-title">🕐 Recent Lessons</span>
                      <a href="/lessons" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}>View all →</a>
                    </div>
                    {myLessons.slice(0, 6).map((l: any, i: number) => (
                      <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 5 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.status === "published" ? "var(--success)" : l.status === "draft" ? "var(--muted)" : "#f59e0b", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{l.title}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.lesson_type} · Class #{l.class_id}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: l.status === "published" ? "rgba(34,197,94,0.1)" : "var(--bg2)", color: l.status === "published" ? "var(--success)" : "var(--muted)", fontWeight: 700 }}>{l.status}</span>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>{timeAgo(l.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Learner view */}
            {isLearner && (
              <div className="card">
                <div className="card-head"><span className="card-title">📈 Learning Overview</span></div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={learnerKPIs.map(k => ({ name: k.label, value: typeof k.value === "string" ? parseFloat(k.value) : k.value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                    <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="value" fill="var(--accent)" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && kpis.every(k => k.value === 0 || k.value === "0.0%") && (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                <h3 style={{ margin: "0 0 8px", fontWeight: 900 }}>No data yet</h3>
                <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 20px" }}>
                  {isTeacher || isAdmin ? "Create classes and lessons to see analytics." : "Join classes and complete lessons to see your progress."}
                </p>
                <a href={isTeacher || isAdmin ? "/classes" : "/classes"} style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                  {isTeacher || isAdmin ? "Create a Class" : "Discover Classes"}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}