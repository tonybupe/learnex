import AppShell from "@/components/layout/AppShell"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useAuth } from "@/features/auth/useAuth"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts"

export default function AnalyticsPage() {
  const { isTeacher, isAdmin, isLearner } = useAuth()

  const teacherQuery = useQuery({
    queryKey: ["analytics-teacher"],
    queryFn: async () => (await api.get("/analytics/dashboard/teacher")).data,
    enabled: isTeacher || isAdmin,
    retry: false,
  })

  const learnerQuery = useQuery({
    queryKey: ["analytics-learner"],
    queryFn: async () => (await api.get("/analytics/dashboard/learner")).data,
    enabled: isLearner,
    retry: false,
  })

  const data = isLearner ? learnerQuery.data : teacherQuery.data
  const isLoading = isLearner ? learnerQuery.isLoading : teacherQuery.isLoading

  const stats = isTeacher || isAdmin ? [
    { label: "Classes", value: data?.total_classes ?? 0, color: "#cb26e4" },
    { label: "Students", value: data?.total_students ?? 0, color: "#38bdf8" },
    { label: "Lessons", value: data?.total_lessons ?? 0, color: "#22c55e" },
    { label: "Quizzes", value: data?.total_quizzes ?? 0, color: "#f59e0b" },
    { label: "Sessions", value: data?.upcoming_sessions ?? 0, color: "#ef4444" },
  ] : [
    { label: "Classes", value: data?.enrolled_classes ?? 0, color: "#cb26e4" },
    { label: "Lessons", value: data?.completed_lessons ?? 0, color: "#38bdf8" },
    { label: "Quizzes", value: data?.quizzes_taken ?? 0, color: "#22c55e" },
    { label: "Avg Score", value: `${data?.average_quiz_score ?? 0}%`, color: "#f59e0b" },
  ]

  return (
    <AppShell>
      <div className="page-section">
        <div className="page-header">
          <div>
            <h1 className="page-title">📊 Analytics</h1>
            <p className="page-sub">
              {isTeacher || isAdmin ? "Track your teaching performance and class engagement." : "Track your learning progress and achievements."}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto" }} />
            <p style={{ color: "var(--muted)", marginTop: 12 }}>Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              {stats.map(s => (
                <div key={s.label} className="kpi">
                  <div className="kpi-sub">{s.label}</div>
                  <div className="kpi-value" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Bar Chart */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">Overview</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.map(s => ({ name: s.label, value: typeof s.value === "string" ? parseFloat(s.value) : s.value }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                    labelStyle={{ color: "var(--text)" }}
                  />
                  <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Activity */}
            {data?.recent_activity && data.recent_activity.length > 0 && (
              <div className="card">
                <div className="card-head"><span className="card-title">Recent Activity</span></div>
                <div className="activity-list">
                  {data.recent_activity.slice(0, 8).map((a: any, i: number) => (
                    <div key={i} className="activity-row">
                      <div className="activity-title">{a.title ?? a.action}</div>
                      <div className="activity-desc">{a.description ?? a.detail}</div>
                      {a.created_at && (
                        <div className="activity-time">{new Date(a.created_at).toLocaleDateString()}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Data (dev helper) */}
            {!data && (
              <div className="card" style={{ textAlign: "center", padding: 40 }}>
                <span style={{ fontSize: 40 }}>📊</span>
                <h3 style={{ margin: "12px 0 8px" }}>No analytics data yet</h3>
                <p style={{ color: "var(--muted)" }}>
                  {isTeacher || isAdmin
                    ? "Create classes and lessons to see analytics."
                    : "Join classes and complete lessons to see your progress."}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}