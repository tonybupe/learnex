import { X } from "lucide-react"
import RightPanel from "./RightPanel"

export default function MobileRightPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {

  if (!open) return null

  return (

    <div className="mobile-bottom-drawer">

      {/* Overlay */}
      <div
        className="mobile-overlay"
        onClick={onClose}
      />

      {/* Floating Card */}
      <div className="mobile-bottom-card">

        {/* Header */}
        <div className="mobile-bottom-header">

          <div className="card-title">
            Activity
          </div>

          <button
            onClick={onClose}
            className="icon-btn"
          >
            <X size={20} />
          </button>

        </div>

        {/* Content */}
        <div className="mobile-bottom-content">
          <RightPanel />
        </div>

      </div>

    </div>

  )

}