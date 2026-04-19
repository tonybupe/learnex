import { useState, useEffect } from "react"
import { MessageCircle, LayoutList, Search, LogOut, Menu, X, Sparkles, Bell } from "lucide-react"
import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"
import MobileSidebar from "./MobileSidebar"
import MobileRightPanel from "./MobileRightPanel"
import ThemeToggle from "@/components/theme/ThemeToggle"
import NotificationBell from "@/features/notifications/components/NotificationBell"
import GlobalSearch from "@/components/search/GlobalSearch"
import { useUnreadMessages } from "@/features/messaging/hooks/useUnreadMessages"
import type { AuthUser } from "@/types/api"

export default function Topbar() {
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)
  const user = useAuthStore(s => s.user) as AuthUser | null
  const [menuOpen, setMenuOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const { totalUnread } = useUnreadMessages()

  // Close mobile search on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileSearchOpen(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("learnex_access_token")
    logout()
    navigate("/auth/login", { replace: true })
  }

  const displayName = (() => {
    if (!user) return "User"
    const u = user as AuthUser & { full_name?: string }
    return u.full_name || "User"
  })()

  const firstName = displayName.split(" ")[0]
  const roleColor: Record<string, string> = { admin: "#ef4444", teacher: "#cb26e4", learner: "#38bdf8" }
  const accentColor = roleColor[user?.role ?? "learner"] ?? "var(--accent)"

  return (
    <>
      <header className="topbar" role="banner">
        {/* ── LEFT ── */}
        <div className="topbar-left">
          {/* Mobile hamburger */}
          <button className="icon-btn mobile-only" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>

          {/* Brand */}
          <button className="brand-card" onClick={() => navigate("/home")}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={15} style={{ color: "white" }} />
            </div>
            <span className="brand-name desktop-only" style={{ fontWeight: 900, fontSize: 17, letterSpacing: "-0.02em" }}>Learnex</span>
          </button>

          {/* Desktop search */}
          <div className="topbar-search desktop-only">
            <GlobalSearch />
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="topbar-right">
          {/* Mobile search icon */}
          <button className="icon-btn mobile-only" onClick={() => setMobileSearchOpen(true)} aria-label="Search">
            <Search size={20} />
          </button>

          {/* Messages - desktop only */}
          <button className="icon-btn desktop-only" onClick={() => navigate("/messages")} aria-label="Messages" style={{ position: "relative" }}>
            <MessageCircle size={20} />
            {totalUnread > 0 && (
              <span style={{
                position: "absolute", top: -3, right: -3,
                minWidth: 16, height: 16, borderRadius: 999,
                background: "var(--danger)", color: "white",
                fontSize: 9, fontWeight: 900, display: "flex",
                alignItems: "center", justifyContent: "center",
                padding: "0 3px", border: "2px solid var(--bg)",
              }}>
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>

          {/* Notifications - desktop only */}
          <span className="desktop-only"><NotificationBell /></span>

          {/* User avatar + name */}
          <button className="user-profile-mini clickable" onClick={() => navigate(`/profile/${user?.id}`)}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 24, padding: "4px var(--profile-pad, 12px) 4px 4px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = accentColor}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
              {displayName[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="desktop-only" style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{firstName}</div>
              <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, textTransform: "capitalize" }}>{user?.role}</div>
            </div>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Logout */}
          <button onClick={handleLogout} className="icon-btn" aria-label="Logout"
            style={{ color: "var(--muted)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--danger)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}>
            <LogOut size={18} />
          </button>
          {/* Right panel (mobile) - after logout */}
          <button className="icon-btn mobile-only" onClick={() => setRightPanelOpen(true)} aria-label="Activity panel">
            <LayoutList size={20} />
          </button>

        </div>
      </header>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="gsearch-mobile-overlay" onClick={e => { if (e.target === e.currentTarget) setMobileSearchOpen(false) }}>
          <div className="gsearch-mobile-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Search Learnex</span>
              <button onClick={() => setMobileSearchOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                <X size={20} />
              </button>
            </div>
            <GlobalSearch onClose={() => setMobileSearchOpen(false)} />
          </div>
        </div>
      )}

      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <MobileRightPanel open={rightPanelOpen} onClose={() => setRightPanelOpen(false)} />
    </>
  )
}