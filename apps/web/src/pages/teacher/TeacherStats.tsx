import { Users, BookOpen, GraduationCap, Calendar } from "lucide-react"

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {

  return (

    <div className="kpi stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div>

        <div className="kpi-sub">
          {title}
        </div>

        <div className="kpi-value">
          {value}
        </div>

      </div>

    </div>

  )

}

export default function TeacherStats() {

  return (

    <div className="stats-grid">

      <StatCard
        title="My Classes"
        value="6"
        icon={<BookOpen size={20} />}
      />

      <StatCard
        title="Students"
        value="148"
        icon={<Users size={20} />}
      />

      <StatCard
        title="Lessons Published"
        value="34"
        icon={<GraduationCap size={20} />}
      />

      <StatCard
        title="Upcoming Sessions"
        value="3"
        icon={<Calendar size={20} />}
      />

    </div>

  )

}