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
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [])

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

  // ── Icon button style ──
  const iconBtn = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: isMobile ? 36 : 38,
    height: isMobile ? 36 : 38,
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg2)",
    color: "var(--muted)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    position: "relative",
    transition: "all 0.15s",
    ...extra,
  })

  return (
    <>
      {/* ── DESKTOP TOPBAR ── */}
      {!isMobile && (
        <header className="topbar" role="banner">
          <div className="topbar-left">
            <button className="brand-card" onClick={() => navigate("/home")}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles size={15} style={{ color: "white" }} />
              </div>
              <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: "-0.02em" }}>Learnex</span>
            </button>
            <div className="topbar-search">
              <GlobalSearch />
            </div>
          </div>
          <div className="topbar-right">
            <button className="icon-btn" onClick={() => navigate("/messages")} aria-label="Messages" style={{ position: "relative" }}>
              <MessageCircle size={20} />
              {totalUnread > 0 && (
                <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 999, background: "var(--danger)", color: "white", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: "2px solid var(--bg)" }}>
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </button>
            <NotificationBell />
            <button className="user-profile-mini clickable" onClick={() => navigate(`/profile/${user?.id}`)}
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: 24, padding: "4px 12px 4px 4px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = accentColor}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                {displayName[0]?.toUpperCase() ?? "U"}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{firstName}</div>
                <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, textTransform: "capitalize" }}>{user?.role}</div>
              </div>
            </button>
            <ThemeToggle />
            <button onClick={handleLogout} className="icon-btn" aria-label="Logout"
              style={{ color: "var(--muted)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--danger)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}>
              <LogOut size={18} />
            </button>
            <button className="icon-btn" onClick={() => setRightPanelOpen(true)} aria-label="Activity panel">
              <LayoutList size={20} />
            </button>
          </div>
        </header>
      )}

      {/* ── MOBILE TOPBAR ── */}
      {isMobile && (
        <header role="banner" style={{
          height: 52, display: "flex", alignItems: "center",
          padding: "0 8px", gap: 6,
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          position: "sticky", top: 0, zIndex: 100,
          flexShrink: 0,
        }}>
          {/* Hamburger */}
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" style={iconBtn()}>
            <Menu size={18} />
          </button>

          {/* Logo */}
          <button onClick={() => navigate("/home")}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 8, flexShrink: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={13} style={{ color: "white" }} />
            </div>
            <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: "-0.02em", background: "linear-gradient(90deg,#cb26e4,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Learnex
            </span>
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Search */}
          <button onClick={() => setMobileSearchOpen(true)} aria-label="Search" style={iconBtn()}>
            <Search size={17} />
          </button>

          {/* Messages */}
          <button onClick={() => navigate("/messages")} aria-label="Messages" style={iconBtn({ position: "relative" })}>
            <MessageCircle size={17} />
            {totalUnread > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 999, background: "var(--danger)", color: "white", fontSize: 8, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: "2px solid var(--card)", zIndex: 1 }}>
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>

          {/* Notifications */}
          <div style={{ flexShrink: 0 }}>
            <NotificationBell />
          </div>

          {/* Theme */}
          <div style={{ flexShrink: 0 }}>
            <ThemeToggle />
          </div>

          {/* Avatar */}
          <button onClick={() => navigate(`/profile/${user?.id}`)} aria-label="Profile"
            style={{ width: 34, height: 34, borderRadius: "50%", background: accentColor, border: `2px solid ${accentColor}30`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 13, flexShrink: 0, cursor: "pointer" }}>
            {displayName[0]?.toUpperCase() ?? "U"}
          </button>

          {/* Right panel */}
          <button onClick={() => setRightPanelOpen(true)} aria-label="Activity" style={iconBtn()}>
            <LayoutList size={17} />
          </button>
        </header>
      )}

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 700, display: "flex", alignItems: "flex-start", padding: "12px 12px 0" }}
          onClick={e => { if (e.target === e.currentTarget) setMobileSearchOpen(false) }}>
          <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", padding: 16, border: "1px solid var(--border)", boxShadow: "0 16px 48px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Search Learnex</span>
              <button onClick={() => setMobileSearchOpen(false)}
                style={{ background: "var(--bg2)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                <X size={16} />
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