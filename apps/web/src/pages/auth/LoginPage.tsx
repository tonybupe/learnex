import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { login, getMe } from "@/features/auth/auth.api"
import { useAuthStore } from "@/features/auth/auth.store"
import { Eye, EyeOff, BookOpen, Users, Zap, Shield, ChevronRight, Sparkles } from "lucide-react"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})
type LoginFormValues = z.infer<typeof loginSchema>

function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    const message = error.response?.data?.message
    if (typeof detail === "string") return detail
    if (typeof message === "string") return message
    if (Array.isArray(detail) && detail.length > 0) return detail[0]?.msg ?? "Login failed"
    return "Unable to log in. Please check your credentials."
  }
  if (error instanceof Error) return error.message
  return "Something went wrong. Please try again."
}

const FEATURES = [
  { icon: <BookOpen size={18} />, color: "#cb26e4", title: "AI-Powered Lessons", desc: "Generate complete lesson notes, quizzes and slides with Claude AI in seconds." },
  { icon: <Users size={18} />, color: "#38bdf8", title: "Live Classrooms", desc: "Host live sessions with screen sharing, slides and real-time discussion." },
  { icon: <Zap size={18} />, color: "#22c55e", title: "Smart Analytics", desc: "Track learner engagement, quiz scores and class performance at a glance." },
  { icon: <Shield size={18} />, color: "#f59e0b", title: "Zambian Mobile Payments", desc: "Subscribe with Airtel Money, MTN Money or Kazang — no card needed." },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore(s => s.setSession)
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (values: LoginFormValues) => {
    if (loading) return
    try {
      setServerError(""); setLoading(true)
      const response = await login(values)
      const accessToken = response.access_token
      if (!accessToken) throw new Error("No access token received")
      localStorage.setItem("learnex_access_token", accessToken)
      const user = await getMe()
      if (!user) throw new Error("User fetch failed")
      setSession(accessToken, user)
      navigate("/home", { replace: true })
    } catch (error) {
      localStorage.removeItem("learnex_access_token")
      setServerError(extractError(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "var(--bg)",
      fontFamily: "inherit",
    }}>
      {/* ── LEFT PANEL ── */}
      <div style={{
        flex: "0 0 480px", display: "flex", flexDirection: "column",
        background: "linear-gradient(160deg, #1a0030 0%, #0d0d1a 60%, #001a2e 100%)",
        padding: "48px 44px", position: "relative", overflow: "hidden",
      }}>
        {/* Background decoration */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(203,38,228,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(56,189,248,0.06)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 56 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} style={{ color: "white" }} />
          </div>
          <span style={{ color: "white", fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em" }}>Learnex</span>
        </div>

        {/* Headline */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, background: "rgba(203,38,228,0.15)", border: "1px solid rgba(203,38,228,0.3)", marginBottom: 20 }}>
            <Sparkles size={11} style={{ color: "#d946ef" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#d946ef", letterSpacing: "0.04em" }}>AI-POWERED LEARNING</span>
          </div>

          <h1 style={{ fontSize: 36, fontWeight: 900, color: "white", margin: "0 0 16px", lineHeight: 1.2 }}>
            Social Learning for<br />
            <span style={{ background: "linear-gradient(90deg,#cb26e4,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Modern Classrooms
            </span>
          </h1>

          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, lineHeight: 1.7, margin: "0 0 40px" }}>
            Teach, learn, collaborate and assess in one professional platform built for teachers, learners, and institutions across Zambia.
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${f.color}18`, border: `1px solid ${f.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: f.color, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{f.title}</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer stats */}
        <div style={{ display: "flex", gap: 24, marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {[
            { value: "5k+", label: "Active Users" },
            { value: "98%", label: "Satisfaction" },
            { value: "AI", label: "Powered" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ color: "#cb26e4", fontWeight: 900, fontSize: 18 }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL (Form) ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px", color: "var(--text)" }}>Welcome back</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Sign in to your Learnex account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7, color: "var(--text)" }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                disabled={loading}
                {...register("email")}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 14,
                  border: `1px solid ${errors.email ? "var(--danger)" : "var(--border)"}`,
                  background: "var(--bg2)", color: "var(--text)", fontFamily: "inherit",
                  outline: "none", transition: "border-color 0.15s", boxSizing: "border-box",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                onBlur={e => e.currentTarget.style.borderColor = errors.email ? "var(--danger)" : "var(--border)"}
              />
              {errors.email && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 5, fontWeight: 600 }}>{errors.email.message}</div>}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Password</label>
                <Link to="/auth/forgot-password" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  disabled={loading}
                  {...register("password")}
                  style={{
                    width: "100%", padding: "12px 44px 12px 14px", borderRadius: 10, fontSize: 14,
                    border: `1px solid ${errors.password ? "var(--danger)" : "var(--border)"}`,
                    background: "var(--bg2)", color: "var(--text)", fontFamily: "inherit",
                    outline: "none", transition: "border-color 0.15s", boxSizing: "border-box",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = errors.password ? "var(--danger)" : "var(--border)"}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", padding: 2 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 5, fontWeight: 600 }}>{errors.password.message}</div>}
            </div>

            {/* Server error */}
            {serverError && (
              <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, transparent)", fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                width: "100%", padding: "13px", borderRadius: 11, border: "none",
                background: loading ? "var(--bg2)" : "linear-gradient(135deg,#cb26e4,#8b5cf6)",
                color: loading ? "var(--muted)" : "white", fontWeight: 800, fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "opacity 0.15s", boxShadow: loading ? "none" : "0 4px 20px rgba(203,38,228,0.35)",
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = "0.9" }}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}>
              {loading ? (
                <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--muted)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} /> Signing in...</>
              ) : (
                <>Sign in <ChevronRight size={16} /></>
              )}
            </button>
          </form>

          {/* Register link */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--border)", textAlign: "center" }}>
            <span style={{ fontSize: 14, color: "var(--muted)" }}>Don't have an account? </span>
            <Link to="/auth/register" style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
              Create one →
            </Link>
          </div>

          {/* Role hints */}
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { role: "Teacher", icon: "👩‍🏫", color: "#cb26e4" },
              { role: "Learner", icon: "🎓", color: "#38bdf8" },
            ].map(r => (
              <div key={r.role} style={{ padding: "10px 8px", borderRadius: 10, background: "var(--bg2)", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{r.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: r.color }}>{r.role}</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
            One account for all roles on Learnex
          </p>
        </div>
      </div>
    </div>
  )
}