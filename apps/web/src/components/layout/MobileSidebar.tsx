import { X } from "lucide-react"
import Sidebar from "./Sidebar"

export default function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {

  if (!open) return null

  return (

    <div className="mobile-drawer">

      {/* Overlay */}
      <div
        className="mobile-overlay"
        onClick={onClose}
      />

      {/* Card Drawer */}
      <div className="mobile-sidebar-card">

        {/* Header */}
        <div className="mobile-sidebar-header">

          <div className="brand-card">

          <div className="logo-wrapper">

            <img
              src="/Learnex.png"
              alt="Learnex"
              className="logo"
            />

          </div>

        </div>

          <button
            onClick={onClose}
            className="icon-btn"
          >
            <X size={20} />
          </button>

        </div>

        {/* Sidebar Content */}
        <div className="mobile-sidebar-content">
          <Sidebar />
        </div>

      </div>

    </div>

  )

}