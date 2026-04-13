import { useEffect, useRef, useState } from "react"
import Topbar from "./Topbar"
import Sidebar from "./Sidebar"
import RightPanel from "./RightPanel"
import "./layout.css"

type Props = { children: React.ReactNode }

export default function AppShell({ children }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  // Collapse sidebar when scrolling down, expand when scrolling up
  useEffect(() => {
    const el = mainRef.current
    if (!el) return

    const onScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          const current = el.scrollTop
          if (current > lastScrollY.current && current > 80) {
            setCollapsed(true)
          } else if (current < lastScrollY.current - 20) {
            setCollapsed(false)
          }
          lastScrollY.current = current
          ticking.current = false
        })
        ticking.current = true
      }
    }

    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="shell">
      {/* Sticky Topbar */}
      <header className="shell-topbar">
        <Topbar />
      </header>

      {/* Body */}
      <div className="shell-body">

        {/* LEFT SIDEBAR — sticky, icon-only when collapsed */}
        <aside className={`shell-sidebar ${collapsed ? "collapsed" : ""}`}>
          <div className="shell-sidebar-inner">
            <Sidebar collapsed={collapsed} />
          </div>
        </aside>

        {/* CENTER FEED — scrollable */}
        <main className="shell-main" ref={mainRef}>
          <div className="shell-content">
            {children}
          </div>
        </main>

        {/* RIGHT PANEL — sticky */}
        <aside className="shell-right">
          <div className="shell-right-inner">
            <RightPanel />
          </div>
        </aside>
      </div>
    </div>
  )
}