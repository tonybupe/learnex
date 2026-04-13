import { NavLink } from "react-router-dom"
import {
  Home, BookOpen, Users, FileText, Video,
  MessageCircle, Search, Bookmark, BarChart2, GraduationCap
} from "lucide-react"

const MENU = [
  { label: "Dashboard",     icon: Home,          path: "/" },
  { label: "Classes",       icon: GraduationCap, path: "/classes" },
  { label: "Subjects",      icon: BookOpen,      path: "/subjects" },
  { label: "Lessons",       icon: FileText,      path: "/lessons" },
  { label: "Live Sessions", icon: Video,         path: "/live-sessions" },
  { label: "Messages",      icon: MessageCircle, path: "/messages" },
  { label: "Discover",      icon: Search,        path: "/discover" },
  { label: "Saved",         icon: Bookmark,      path: "/saved" },
  { label: "Analytics",     icon: BarChart2,     path: "/analytics" },
]

type Props = { collapsed?: boolean }

export default function Sidebar({ collapsed = false }: Props) {
  return (
    <nav className="sidebar-nav">
      {MENU.map(item => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.label}
            to={item.path}
            title={item.label}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""} ${collapsed ? "icon-only" : ""}`
            }
          >
            <span className="sidebar-icon"><Icon size={20} /></span>
            {!collapsed && <span className="sidebar-label">{item.label}</span>}
          </NavLink>
        )
      })}
    </nav>
  )
}