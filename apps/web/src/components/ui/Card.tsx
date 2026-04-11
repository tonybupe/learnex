import React from "react"

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode
}

export default function Card({
  children,
  className = "",
  ...props
}: CardProps) {

  return (
    <div
      className={`card ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}