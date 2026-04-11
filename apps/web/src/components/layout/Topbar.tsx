import { MessageCircle, LayoutList, Search, LogOut, Menu } from "lucide-react"
import { useState } from "react"
import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"

import MobileSidebar from "./MobileSidebar"
import MobileRightPanel from "./MobileRightPanel"
import ThemeToggle from "@/components/theme/ThemeToggle"
import NotificationBell from "@/features/notifications/components/NotificationBell"
import { useUnreadMessages } from "@/features/messaging/hooks/useUnreadMessages"
import type { AuthUser } from "@/types/api"

export default function Topbar() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user) as AuthUser | null

  const [menuOpen, setMenuOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const { totalUnread } = useUnreadMessages()

  const handleLogout = () => {
    localStorage.removeItem("learnex_access_token")
    logout()
    navigate("/auth/login", { replace: true })
  }

  const handleProfileClick = () => {
    if (user) {
      navigate(`/profile/${user.id}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleProfileClick()
    }
  }

  // Get display name - safely handle both 'name' and 'full_name' fields
  const getDisplayName = (): string => {
    if (!user) return "User";
    
    // Safely check for full_name property
    const extendedUser = user as AuthUser & { full_name?: string };
    return extendedUser.full_name || user.name || "User";
  }

  // Get user role with proper formatting
  const getFormattedRole = (): string => {
    if (!user?.role) return "";
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }

  return (
    <>
      <header className="topbar" role="banner">
        {/* LEFT SIDE */}
        <div className="topbar-left">
          {/* Mobile Menu */}
          <button
            className="icon-btn mobile-only"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          {/* BRAND */}
          <div className="brand-card">
            <div className="logo-wrapper">
              <img
                src="/Learnex.png"
                alt="Learnex"
                className="logo"
                onClick={() => navigate("/dashboard")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate("/dashboard")}
                aria-label="Go to dashboard"
              />
            </div>
          </div>

          {/* SEARCH */}
          <div className="topbar-search desktop-only" role="search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search lessons, classes, teachers..."
              className="audit-control"
              aria-label="Search"
            />
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="topbar-right">
          {/* Mobile Search */}
          <button 
            className="icon-btn mobile-only"
            aria-label="Search"
          >
            <Search size={20} aria-hidden="true" />
          </button>

          {/* Messages */}
          <button
            className="icon-btn message-bell"
            onClick={() => navigate("/messages")}
            aria-label="Messages"
            aria-describedby={totalUnread > 0 ? "unread-count" : undefined}
          >
            <MessageCircle size={20} aria-hidden="true" />
            {totalUnread > 0 && (
              <span 
                className="message-badge" 
                id="unread-count"
                aria-label={`${totalUnread} unread messages`}
              >
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Combined User Profile - Clickable to profile */}
          <div 
            className="user-profile-mini clickable"
            onClick={handleProfileClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`View profile for ${getDisplayName()}`}
            title="View profile"
          >
            <img
              src={user?.avatar || "/avatar.png"}
              alt=""
              className="avatar"
              aria-hidden="true"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/avatar.png"
              }}
            />
            <div className="user-info">
              <span className="user-name">
                {getDisplayName()}
              </span>
              <span className="user-role">
                {getFormattedRole()}
              </span>
            </div>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="btn btn-danger"
            aria-label="Logout"
          >
            <LogOut size={16} aria-hidden="true" />
            <span className="desktop-only">Logout</span>
          </button>

          {/* Right Panel Toggle */}
          <button
            className="icon-btn mobile-only"
            onClick={() => setRightPanelOpen(true)}
            aria-label="Open right panel"
            aria-expanded={rightPanelOpen}
          >
            <LayoutList size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <MobileSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      {/* Mobile Right Panel */}
      <MobileRightPanel
        open={rightPanelOpen}
        onClose={() => setRightPanelOpen(false)}
      />
    </>
  )
}