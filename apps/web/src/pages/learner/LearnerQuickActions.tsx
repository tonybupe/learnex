import { useNavigate } from "react-router-dom"
import { BookOpen, Users, MessageCircle, Video, FileText, Search } from "lucide-react"

const ACTIONS = [
  { label: "My Classes",    icon: Users,          path: "/classes",          color: "#cb26e4" },
  { label: "Lessons",       icon: BookOpen,        path: "/lessons",          color: "#38bdf8" },
  { label: "Live Sessions", icon: Video,           path: "/live-sessions",    color: "#22c55e" },
  { label: "Quizzes",       icon: FileText,        path: "/quizzes",          color: "#f59e0b" },
  { label: "Messages",      icon: MessageCircle,   path: "/messages",         color: "#ef4444" },
  { label: "Discover",      icon: Search,          path: "/classes/discover", color: "#8b5cf6" },
]

export default function LearnerQuickActions() {
  const navigate = useNavigate()

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">⚡ Quick Actions</span>
      </div>
      <div className="actions-grid">
        {ACTIONS.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              className="action-card"
              onClick={() => navigate(action.path)}
            >
              <div className="action-icon" style={{ color: action.color, background: `${action.color}18` }}>
                <Icon size={18} />
              </div>
              <span className="action-title">{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}