import { X } from "lucide-react"
import RightPanel from "./RightPanel"
import { useEffect } from "react"

export default function MobileRightPanel({ open, onClose }: { open: boolean; onClose: () => void }) {

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 800, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>

      {/* Overlay */}
      <div onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }} />

      {/* Drawer */}
      <div style={{ position: "relative", background: "var(--bg)", borderRadius: "20px 20px 0 0", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.25)", border: "1px solid var(--border)", borderBottom: "none" }}>

        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: "var(--border)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Activity</div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ overflowY: "auto", flex: 1, scrollbarWidth: "none" as const }}>
          <RightPanel />
        </div>
      </div>
    </div>
  )
}