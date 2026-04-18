import { NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/features/auth/auth.store"
import {
  Home, BookOpen, Users, FileText, Video,
  MessageCircle, Search, Bookmark, BarChart2,
  GraduationCap, Settings, LogOut, Sparkles, TrendingUp, LayoutDashboard
} from "lucide-react"

const BASE_MENU = [
  { label: "Home",          icon: Home,             path: "/home",          roles: ["admin","teacher","learner"] },
  { label: "Classes",       icon: GraduationCap,    path: "/classes",       roles: ["admin","teacher","learner"] },
  { label: "Subjects",      icon: BookOpen,         path: "/subjects",      roles: ["admin","teacher","learner"] },
  { label: "Lessons",       icon: FileText,         path: "/lessons",       roles: ["admin","teacher","learner"] },
  { label: "Live Sessions", icon: Video,            path: "/live-sessions", roles: ["admin","teacher","learner"] },
  { label: "Messages",      icon: MessageCircle,    path: "/messages",      roles: ["admin","teacher","learner"] },
  { label: "Discover",      icon: Search,           path: "/discover",      roles: ["admin","teacher","learner"] },
  { label: "Saved",         icon: Bookmark,         path: "/saved",         roles: ["admin","teacher","learner"] },
  { label: "Analytics",     icon: BarChart2,        path: "/analytics",     roles: ["admin","teacher"] },
  { label: "My Dashboard",  icon: LayoutDashboard,  path: "/learner/dashboard", roles: ["learner"] },
  { label: "My Dashboard",  icon: LayoutDashboard,  path: "/teacher/dashboard", roles: ["teacher"] },
  { label: "My Dashboard",  icon: LayoutDashboard,  path: "/admin/dashboard",   roles: ["admin"] },
  { label: "AI Plans",      icon: Sparkles,         path: "/subscription",  roles: ["admin","teacher"] },
]

export default function Sidebar() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)
  const MENU = BASE_MENU.filter(item => !user?.role || item.roles.includes(user.role))

  const roleColor: Record<string, string> = {
    admin: "#ef4444", teacher: "#cb26e4", learner: "#38bdf8"
  }
  const color = roleColor[user?.role ?? "learner"] ?? "var(--accent)"
  const initials = user?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"

  return (
    <div className="sidebar-wrap">
      {/* User Profile Card */}
      <div className="sidebar-profile-card" onClick={() => navigate(`/profile/${user?.id}`)}>
        <div className="sidebar-avatar" style={{ background: color }}>{initials}</div>
        <div className="sidebar-profile-info">
          <div className="sidebar-profile-name">{user?.full_name ?? "User"}</div>
          <div className="sidebar-profile-role" style={{ color }}>{user?.role ?? ""}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">NAVIGATION</div>
        {MENU.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.label}
              to={item.path}
              title={item.label}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            >
              <span className="sidebar-icon"><Icon size={18} /></span>
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <button className="sidebar-link" onClick={() => navigate("/settings")} style={{ width: "100%", border: "none", cursor: "pointer", background: "transparent" }}>
          <span className="sidebar-icon"><Settings size={18} /></span>
          <span className="sidebar-label">Settings</span>
        </button>
        <button className="sidebar-link danger" onClick={() => { logout(); navigate("/auth/login") }} style={{ width: "100%", border: "none", cursor: "pointer", background: "transparent" }}>
          <span className="sidebar-icon"><LogOut size={18} /></span>
          <span className="sidebar-label">Logout</span>
        </button>
      </div>
    </div>
  )
}