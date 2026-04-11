import Topbar from "./Topbar"
import Sidebar from "./Sidebar"
import RightPanel from "./RightPanel"

type Props = {
  children: React.ReactNode
}

export default function AppShell({ children }: Props) {

  return (

    <div className="app-shell">

      {/* Topbar */}
      <Topbar />

      {/* Main Layout */}
      <div className="app-layout">

        {/* Sidebar */}

        <aside className="app-sidebar">
          <Sidebar />
        </aside>

        {/* Main Content */}

        <main className="app-main">
          {children}
        </main>

        {/* Right Panel */}

        <aside className="app-right-panel">
          <RightPanel />
        </aside>

      </div>

    </div>

  )

}