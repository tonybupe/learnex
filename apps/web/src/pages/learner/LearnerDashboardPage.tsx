import AppShell from "@/components/layout/AppShell"
import FeedSection from "@/pages/shared/FeedSection"
import LearnerDashboardHeader from "./LearnerDashboardHeader"
import LearnerQuickActions from "./LearnerQuickActions"
import LearnerUpcoming from "./LearnerUpcoming"
import LearnerActivity from "./LearnerActivity"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { BookOpen, GraduationCap, CheckSquare, Star } from "lucide-react"

function StatCard({ title, value, icon, color }: {
  title: string; value: string | number; icon: React.ReactNode; color?: string
}) {
  return (
    <div className="kpi stat-card">
      <div className="stat-icon" style={{ color: color || "var(--accent)", background: `${color || "var(--accent)"}18`, borderRadius: 10, padding: 10 }}>
        {icon}
      </div>
      <div>
        <div className="kpi-sub">{title}</div>
        <div className="kpi-value">{value}</div>
      </div>
    </div>
  )
}

export default function LearnerDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["learner-dashboard"],
    queryFn: async () => (await api.get("/analytics/dashboard/learner")).data,
    retry: false,
    staleTime: 60000,
  })

  return (
    <AppShell>
      <div className="dashboard-stack">

        {/* Header */}
        <LearnerDashboardHeader />

        {/* Stats */}
        <div className="stats-grid">
          <StatCard title="Enrolled Classes"   value={isLoading ? "..." : data?.enrolled_classes ?? 0}   icon={<BookOpen size={20} />}     color="#cb26e4" />
          <StatCard title="Lessons Completed"  value={isLoading ? "..." : data?.completed_lessons ?? 0}  icon={<GraduationCap size={20} />} color="#38bdf8" />
          <StatCard title="Quizzes Taken"      value={isLoading ? "..." : data?.quizzes_taken ?? 0}      icon={<CheckSquare size={20} />}   color="#22c55e" />
          <StatCard title="Avg. Quiz Score"    value={isLoading ? "..." : `${data?.average_quiz_score ?? 0}%`} icon={<Star size={20} />}  color="#f59e0b" />
        </div>

        {/* Quick Actions */}
        <LearnerQuickActions />

        {/* Upcoming + Activity side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <LearnerUpcoming />
          <LearnerActivity />
        </div>

        {/* Feed — full width */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="card-head" style={{ padding: "14px 18px" }}>
            <span className="card-title">📚 Class Feed</span>
          </div>
          <div style={{ padding: "0 18px 18px" }}>
            <FeedSection />
          </div>
        </div>

      </div>
    </AppShell>
  )
}