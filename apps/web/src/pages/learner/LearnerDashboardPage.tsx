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
      <div className="stat-icon" style={{ color: color || "var(--accent)" }}>{icon}</div>
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
    queryFn: async () => {
      const res = await api.get("/analytics/dashboard/learner")
      return res.data
    },
    retry: false,
    staleTime: 60000,
  })

  return (
    <AppShell>
      <div className="dashboard-stack">
        <LearnerDashboardHeader />

        {/* Stats */}
        <div className="stats-grid">
          <StatCard title="Enrolled Classes" value={isLoading ? "..." : data?.enrolled_classes ?? 0} icon={<BookOpen size={20} />} color="var(--accent)" />
          <StatCard title="Lessons Completed" value={isLoading ? "..." : data?.completed_lessons ?? 0} icon={<GraduationCap size={20} />} color="var(--accent2)" />
          <StatCard title="Quizzes Taken" value={isLoading ? "..." : data?.quizzes_taken ?? 0} icon={<CheckSquare size={20} />} color="var(--success)" />
          <StatCard title="Avg. Quiz Score" value={isLoading ? "..." : `${data?.average_quiz_score ?? 0}%`} icon={<Star size={20} />} color="#f59e0b" />
        </div>

        <LearnerQuickActions />

        <div className="dashboard-grid">
          <div className="dashboard-main">
            <div className="card">
              <div className="card-head"><span className="card-title">📚 Class Feed</span></div>
              <FeedSection />
            </div>
          </div>
          <div className="dashboard-sidebar">
            <LearnerUpcoming />
            <LearnerActivity />
          </div>
        </div>
      </div>
    </AppShell>
  )
}