import { NavLink } from "react-router-dom"
import {
  Home,
  BookOpen,
  Users,
  FileText,
  Video,
  MessageCircle,
  Search,
  Bookmark,
} from "lucide-react"

export default function Sidebar() {

  const menu = [
    { label: "Dashboard", icon: Home, path: "/" },
    { label: "Subjects", icon: BookOpen, path: "/subjects" },
    { label: "Classes", icon: Users, path: "/classes" },
    { label: "Lessons", icon: FileText, path: "/lessons" },
    { label: "Live Sessions", icon: Video, path: "/live-sessions" },
    { label: "Messages", icon: MessageCircle, path: "/messages" },
    { label: "Saved", icon: Bookmark, path: "/saved" },
    { label: "Discover", icon: Search, path: "/discover" },
  ]

  return (

    <aside className="sidebar">

      <nav className="sidebar-nav">

        {menu.map((item) => {

          const Icon = item.icon

          return (

            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-card ${isActive ? "active" : ""}`
              }
            >

              <div className="sidebar-card-inner">

                <Icon size={20} className="sidebar-icon" />

                <span className="sidebar-text">
                  {item.label}
                </span>

              </div>

            </NavLink>

          )

        })}

      </nav>

    </aside>

  )

}