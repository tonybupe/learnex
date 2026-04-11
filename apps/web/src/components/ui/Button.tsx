import React from "react"

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline"
type ButtonSize = "sm" | "md" | "lg"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {

  const variantClassMap: Record<ButtonVariant, string> = {
    primary: "btn-primary",
    secondary: "btn-secondary", // ✅ NEW
    danger: "btn-danger",
    ghost: "btn-ghost",
    outline: "btn-outline",
  }

  const sizeClassMap: Record<ButtonSize, string> = {
    sm: "btn-sm",
    md: "btn-md",
    lg: "btn-lg",
  }

  const isDisabled = disabled || loading

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`btn ${variantClassMap[variant]} ${sizeClassMap[size]} ${isDisabled ? "btn-disabled" : ""} ${className}`}
    >
      {loading ? "Loading..." : children}
    </button>
  )
}