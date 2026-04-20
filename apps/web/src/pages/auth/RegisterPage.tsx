import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { register as registerApi, getMe } from "@/features/auth/auth.api"
import { useAuthStore } from "@/features/auth/auth.store"
import { Eye, EyeOff, Sparkles, GraduationCap, BookOpen, Shield } from "lucide-react"

const registerSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  phone_number: z.string().min(9, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string(),
  role: z.enum(["learner", "teacher"]),
}).refine(d => d.password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
})
type RegisterFormValues = z.infer<typeof registerSchema>

function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    const message = error.response?.data?.message
    if (typeof detail === "string") return detail
    if (typeof message === "string") return message
    if (Array.isArray(detail) && detail.length > 0) return detail[0]?.msg ?? "Registration failed"
    return "Registration failed. Please try again."
  }
  if (error instanceof Error) return error.message
  return "Something went wrong. Please try again."
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore(s => s.setSession)
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: "", email: "", phone_number: "", password: "", confirm_password: "", role: "learner" },
  })

  const selectedRole = watch("role")

  const onSubmit = async (values: RegisterFormValues) => {
    if (loading) return
    setLoading(true)
    setServerError("")
    try:
      const { access_token } = await registerApi(values)
      const me = await getMe(access_token)
      setSession(access_token, me)
      navigate("/home", { replace: true })
    } catch (err) {
      setServerError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (hasError: boolean) => ({
    width: "100%", padding: "13px 14px", borderRadius: 10, fontSize: 14,
    border: `1.5px solid ${hasError ? "var(--danger)" : "var(--border)"}`,
    background: "var(--card)", color: "var(--text)", outline: "none",
    transition: "border-color 0.15s", boxSizing: "border-box" as const,
  })

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)", fontFamily: "inherit" }}>

      {/* LEFT PANEL - desktop only */}
      {!isMobile && (
        <div style={{
          flex: "0 0 420px", display: "flex", flexDirection: "column",
          background: "linear-gradient(160deg, #1a0030 0%, #0d0d1a 60%, #001a2e 100%)",
          padding: "48px 44px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(203,38,228,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(56,189,248,0.06)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={18} style={{ color: "white" }} />
            </div>
            <span style={{ color: "white", fontWeight: 900, fontSize: 20 }}>Learnex</span>
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: "white", margin: "0 0 16px", lineHeight: 1.2 }}>
              Join thousands of<br />
              <span style={{ background: "linear-gradient(90deg,#cb26e4,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                educators & learners
              </span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.7, margin: "0 0 36px" }}>
              Create your free account and start teaching or learning with AI-powered tools built for Zambia.
            </p>

            {/* Role cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: 16, borderRadius: 14, background: "rgba(203,38,228,0.1)", border: "1px solid rgba(203,38,228,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <GraduationCap size={18} style={{ color: "#cb26e4" }} />
                  <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>For Teachers</span>
                </div>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>Create classes, generate AI lessons, host live sessions and track learner progress.</p>
              </div>
              <div style={{ padding: 16, borderRadius: 14, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <BookOpen size={18} style={{ color: "#38bdf8" }} />
                  <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>For Learners</span>
                </div>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>Join classes, access lessons, take quizzes and collaborate with classmates.</p>
              </div>
              <div style={{ padding: 16, borderRadius: 14, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Shield size={18} style={{ color: "#22c55e" }} />
                  <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>Always Free to Start</span>
                </div>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>No credit card needed. Pay with Airtel Money, MTN or Kazang when you upgrade.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT PANEL - form */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-start",
        padding: isMobile ? "24px 16px 48px" : "40px",
        overflowY: "auto", minHeight: "100vh",
      }}>
        {/* Mobile logo */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, marginTop: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={19} style={{ color: "white" }} />
            </div>
            <span style={{ fontWeight: 900, fontSize: 22, background: "linear-gradient(90deg,#cb26e4,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Learnex</span>
          </div>
        )}

        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 900, margin: "0 0 6px", color: "var(--text)" }}>Create your account</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Join Learnex — it&apos;s free to get started</p>
          </div>

          {serverError && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: 13, marginBottom: 20, fontWeight: 600 }}>
              {serverError}
            </div>
          )}

          {/* Role selector */}
          <div style={{ display: "flex", gap: 10, marginBottom: 22, padding: 5, borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)" }}>
            {[
              { value: "learner", label: "I am a Learner", icon: <BookOpen size={15} /> },
              { value: "teacher", label: "I am a Teacher", icon: <GraduationCap size={15} /> },
            ].map(r => (
              <label key={r.value} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "10px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: selectedRole === r.value ? "var(--card)" : "transparent",
                color: selectedRole === r.value ? "var(--accent)" : "var(--muted)",
                boxShadow: selectedRole === r.value ? "var(--shadow2)" : "none",
                transition: "all 0.15s",
              }}>
                <input type="radio" value={r.value} {...register("role")} style={{ display: "none" }} />
                {r.icon} {r.label}
              </label>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Full Name */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Full Name</label>
              <input type="text" autoComplete="name" placeholder="e.g. John Banda"
                disabled={loading} {...register("full_name")} style={inputStyle(!!errors.full_name)} />
              {errors.full_name && <p style={{ color: "var(--danger)", fontSize: 12, margin: "4px 0 0", fontWeight: 600 }}>{errors.full_name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Email Address</label>
              <input type="email" autoComplete="email" placeholder="you@example.com"
                disabled={loading} {...register("email")} style={inputStyle(!!errors.email)} />
              {errors.email && <p style={{ color: "var(--danger)", fontSize: 12, margin: "4px 0 0", fontWeight: 600 }}>{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Phone Number</label>
              <input type="tel" autoComplete="tel" placeholder="e.g. 0971234567"
                disabled={loading} {...register("phone_number")} style={inputStyle(!!errors.phone_number)} />
              {errors.phone_number && <p style={{ color: "var(--danger)", fontSize: 12, margin: "4px 0 0", fontWeight: 600 }}>{errors.phone_number.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters"
                  disabled={loading} {...register("password")} style={{ ...inputStyle(!!errors.password), padding: "13px 44px 13px 14px" }} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 0 }}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p style={{ color: "var(--danger)", fontSize: 12, margin: "4px 0 0", fontWeight: 600 }}>{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input type={showConfirm ? "text" : "password"} autoComplete="new-password" placeholder="Repeat your password"
                  disabled={loading} {...register("confirm_password")} style={{ ...inputStyle(!!errors.confirm_password), padding: "13px 44px 13px 14px" }} />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 0 }}>
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.confirm_password && <p style={{ color: "var(--danger)", fontSize: 12, margin: "4px 0 0", fontWeight: 600 }}>{errors.confirm_password.message}</p>}
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
              {loading ? "Creating account..." : `Join as ${selectedRole === "teacher" ? "Teacher" : "Learner"}`}
            </button>
          </form>

          <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
            By creating an account you agree to our{" "}
            <Link to="/terms" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Terms of Service</Link>
            {" "}and{" "}
            <Link to="/privacy" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Privacy Policy</Link>
          </p>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link to="/auth/login" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}