import { Users, BookOpen, GraduationCap, Calendar } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"

function StatCard({ title, value, icon, color }: {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: string
}) {
  return (
    <div className="kpi stat-card">
      <div className="stat-icon" style={{ color: color || "var(--accent)" }}>
        {icon}
      </div>
      <div>
        <div className="kpi-sub">{title}</div>
        <div className="kpi-value">{value}</div>
      </div>
    </div>
  )
}

export default function TeacherStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["teacher-dashboard"],
    queryFn: async () => {
      const res = await api.get("/analytics/dashboard/teacher")
      return res.data
    },
    retry: false,
    staleTime: 60000,
  })

  return (
    <div className="stats-grid">
      <StatCard
        title="My Classes"
        value={isLoading ? "..." : data?.total_classes ?? 0}
        icon={<BookOpen size={20} />}
        color="var(--accent)"
      />
      <StatCard
        title="Students"
        value={isLoading ? "..." : data?.total_students ?? 0}
        icon={<Users size={20} />}
        color="var(--accent2)"
      />
      <StatCard
        title="Lessons Published"
        value={isLoading ? "..." : data?.total_lessons ?? 0}
        icon={<GraduationCap size={20} />}
        color="var(--success)"
      />
      <StatCard
        title="Upcoming Sessions"
        value={isLoading ? "..." : data?.upcoming_sessions ?? 0}
        icon={<Calendar size={20} />}
        color="#f59e0b"
      />
    </div>
  )
}