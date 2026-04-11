import React from "react"

type StatCardProps = {
  icon: React.ReactNode
  title: string
  value: string
  tone?: "accent" | "accent2" | "success" | "danger"
}

export default function StatCard({
  icon,
  title,
  value,
  tone = "accent",
}: StatCardProps) {

  const toneColor =
    tone === "accent"
      ? "var(--accent)"
      : tone === "accent2"
      ? "var(--accent2)"
      : tone === "success"
      ? "var(--success)"
      : "var(--danger)"

  return (

    <div className="card stat-card">

      <div
        className="stat-icon"
        style={{ background: `color-mix(in srgb, ${toneColor} 15%, transparent)`, color: toneColor }}
      >
        {icon}
      </div>

      <div>

        <div className="stat-title">
          {title}
        </div>

        <div className="stat-value">
          {value}
        </div>

      </div>

    </div>

  )

}