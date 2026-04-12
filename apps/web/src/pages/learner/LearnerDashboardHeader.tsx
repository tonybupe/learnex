import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"
import { Settings } from "lucide-react"

export default function LearnerDashboardHeader() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const firstName = user?.full_name?.split(" ")[0] ?? "Learner"

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="dashboard-header">
      <div>
        <div className="chip" style={{ marginBottom: 8 }}>👋 {greeting}</div>
        <h1 className="dashboard-title">{firstName}!</h1>
        <p className="dashboard-sub">
          Stay on top of your classes, lessons and discussions.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" onClick={() => navigate("/classes/discover")}>
          🔍 Discover Classes
        </button>
        <button className="btn" onClick={() => navigate("/settings")}>
          <Settings size={16} />
        </button>
      </div>
    </div>
  )
}