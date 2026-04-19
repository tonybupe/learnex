import { NavLink } from "react-router-dom"
import { useAuthStore } from "@/features/auth/auth.store"
import Topbar from "./Topbar"
import Sidebar from "./Sidebar"
import RightPanel from "./RightPanel"
import { Home, GraduationCap, FileText, MessageCircle, LayoutDashboard } from "lucide-react"
import "./layout.css"

type Props = { children: React.ReactNode }

export default function AppShell({ children }: Props) {
  const user = useAuthStore(s => s.user)

  const dashPath = user?.role === "teacher" ? "/teacher/dashboard"
    : user?.role === "admin" ? "/admin/dashboard"
    : "/learner/dashboard"

  return (
    <div className="shell">
      <header className="shell-topbar"><Topbar /></header>
      <div className="shell-body">
        <aside className="shell-sidebar">
          <div className="shell-sidebar-inner"><Sidebar /></div>
        </aside>
        <main className="shell-main">
          <div className="shell-content">{children}</div>
        </main>
        <aside className="shell-right">
          <div className="shell-right-inner"><RightPanel /></div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav" role="navigation" aria-label="Mobile navigation">
        <NavLink to="/home" className={({ isActive }) => `mobile-nav-item${isActive ? " active" : ""}`}>
          <Home size={20} />
          Home
        </NavLink>
        <NavLink to="/classes" className={({ isActive }) => `mobile-nav-item${isActive ? " active" : ""}`}>
          <GraduationCap size={20} />
          Classes
        </NavLink>
        <NavLink to="/lessons" className={({ isActive }) => `mobile-nav-item${isActive ? " active" : ""}`}>
          <FileText size={20} />
          Lessons
        </NavLink>
        <NavLink to="/messages" className={({ isActive }) => `mobile-nav-item${isActive ? " active" : ""}`}>
          <MessageCircle size={20} />
          Messages
        </NavLink>
        <NavLink to={dashPath} className={({ isActive }) => `mobile-nav-item${isActive ? " active" : ""}`}>
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>
      </nav>
    </div>
  )
}