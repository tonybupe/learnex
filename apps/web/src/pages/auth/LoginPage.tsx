import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { login, getMe } from "@/features/auth/auth.api"
import { useAuthStore } from "@/features/auth/auth.store"
import { Eye, EyeOff, Sparkles, BookOpen, Users, Zap, Shield } from "lucide-react"

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
  { icon: <BookOpen size={16} />, color: "#cb26e4", title: "AI-Powered Lessons" },
  { icon: <Users size={16} />, color: "#38bdf8", title: "Live Classrooms" },
  { icon: <Zap size={16} />, color: "#22c55e", title: "Smart Analytics" },
  { icon: <Shield size={16} />, color: "#f59e0b", title: "Mobile Payments" },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore(s => s.setSession)
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (values: LoginFormValues) => {
    if (loading) return
    setLoading(true)
    setServerError("")
    try {
      const { access_token } = await login({ email: values.email, password: values.password })
      const me = await getMe()
      setSession(access_token, me)
      navigate("/home", { replace: true })
    } catch (err) {
      setServerError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)", fontFamily: "inherit" }}>

      {/* LEFT PANEL - desktop only */}
      {!isMobile && (
        <div style={{
          flex: "0 0 480px", display: "flex", flexDirection: "column",
          background: "linear-gradient(160deg, #1a0030 0%, #0d0d1a 60%, #001a2e 100%)",
          padding: "48px 44px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(203,38,228,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(56,189,248,0.06)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 56 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={18} style={{ color: "white" }} />
            </div>
            <span style={{ color: "white", fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em" }}>Learnex</span>
          </div>

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
              Teach, learn, collaborate and assess in one professional platform built for Zambia.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${f.color}18`, border: `1px solid ${f.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: f.color, flexShrink: 0 }}>
                    {f.icon}
                  </div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{f.title}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {[{ value: "5k+", label: "Users" }, { value: "98%", label: "Satisfaction" }, { value: "AI", label: "Powered" }].map(s => (
              <div key={s.label}>
                <div style={{ color: "#cb26e4", fontWeight: 900, fontSize: 18 }}>{s.value}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RIGHT PANEL - form */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: isMobile ? "24px 16px 40px" : "48px 40px",
        overflowY: "auto", minHeight: "100vh",
      }}>
        {/* Mobile logo */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={20} style={{ color: "white" }} />
            </div>
            <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", background: "linear-gradient(90deg,#cb26e4,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Learnex</span>
          </div>
        )}

        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: isMobile ? 26 : 30, fontWeight: 900, margin: "0 0 8px", color: "var(--text)" }}>Welcome back</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Sign in to your Learnex account</p>
          </div>

          {serverError && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: 13, marginBottom: 20, fontWeight: 600 }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7, color: "var(--text)" }}>Email address</label>
              <input id="email" type="email" autoComplete="email"
                placeholder="you@example.com"
                disabled={loading}
                {...register("email")}
                style={{
                  width: "100%", padding: "13px 14px", borderRadius: 10, fontSize: 14,
                  border: `1.5px solid ${errors.email ? "var(--danger)" : "var(--border)"}`,
                  background: "var(--card)", color: "var(--text)", outline: "none",
                  transition: "border-color 0.15s", boxSizing: "border-box",
                }} />
              {errors.email && <p style={{ color: "var(--danger)", fontSize: 12, margin: "5px 0 0", fontWeight: 600 }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Password</label>
                <Link to="/auth/forgot-password" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Forgot password?</Link>
              </div>
              <div style={{ position: "relative" }}>
                <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={loading}
                  {...register("password")}
                  style={{
                    width: "100%", padding: "13px 44px 13px 14px", borderRadius: 10, fontSize: 14,
                    border: `1.5px solid ${errors.password ? "var(--danger)" : "var(--border)"}`,
                    background: "var(--card)", color: "var(--text)", outline: "none",
                    transition: "border-color 0.15s", boxSizing: "border-box",
                  }} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 0 }}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p style={{ color: "var(--danger)", fontSize: 12, margin: "5px 0 0", fontWeight: 600 }}>{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                width: "100%", padding: "14px", borderRadius: 10, border: "none",
                background: loading ? "var(--bg2)" : "linear-gradient(135deg,#cb26e4,#8b5cf6)",
                color: loading ? "var(--muted)" : "white", fontWeight: 800, fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
                boxShadow: loading ? "none" : "0 4px 14px rgba(203,38,228,0.35)",
                fontFamily: "inherit", marginTop: 4,
              }}>
              {loading ? "Signing in..." : "Sign in to Learnex"}
            </button>
          </form>

          {/* Mobile features */}
          {isMobile && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 28 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, background: `${f.color}10`, border: `1px solid ${f.color}25` }}>
                  <span style={{ color: f.color }}>{f.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: f.color }}>{f.title}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--muted)" }}>
            Don&apos;t have an account?{" "}
            <Link to="/auth/register" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>Create one free</Link>
          </div>
        </div>
      </div>
    </div>
  )
}