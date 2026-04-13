import Topbar from "./Topbar"
import Sidebar from "./Sidebar"
import RightPanel from "./RightPanel"
import "./layout.css"

type Props = { children: React.ReactNode }

export default function AppShell({ children }: Props) {
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
    </div>
  )
}