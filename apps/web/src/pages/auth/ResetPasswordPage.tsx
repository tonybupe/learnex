import { useState, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { api } from "@/api/client"
import { Sparkles, Eye, EyeOff, ChevronRight, CheckCircle2, AlertCircle, Lock, ArrowLeft } from "lucide-react"

const schema = z.object({
  new_password: z.string().min(6, "Password must be at least 6 characters"),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
})
type FormValues = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })
  const password = watch("new_password", "")

  // Verify token on load
  useEffect(() => {
    if (!token) { setVerifying(false); return }
    api.get(`/auth/verify-reset-token/${token}`)
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false))
      .finally(() => setVerifying(false))
  }, [token])

  const onSubmit = async (values: FormValues) => {
    setLoading(true); setError("")
    try {
      await api.post("/auth/reset-password", { token, new_password: values.new_password })
      setDone(true)
      setTimeout(() => navigate("/auth/login"), 3000)
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to reset password. Token may have expired.")
    } finally {
      setLoading(false)
    }
  }

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 8 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"]
  const strengthColors = ["", "#ef4444", "#f59e0b", "#38bdf8", "#22c55e"]

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)", fontFamily: "inherit" }}>
      {/* Left panel */}
      <div style={{ flex: "0 0 440px", display: "flex", flexDirection: "column", background: "linear-gradient(160deg, #1a0030 0%, #0d0d1a 60%, #001a2e 100%)", padding: "48px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(203,38,228,0.08)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} style={{ color: "white" }} />
          </div>
          <span style={{ color: "white", fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em" }}>Learnex</span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(203,38,228,0.15)", border: "1px solid rgba(203,38,228,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <Lock size={28} style={{ color: "#cb26e4" }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "white", margin: "0 0 12px", lineHeight: 1.2 }}>
            Create a new<br />
            <span style={{ background: "linear-gradient(90deg,#cb26e4,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              password
            </span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7, margin: "0 0 32px" }}>
            Choose a strong password to keep your Learnex account secure.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: "✅", text: "At least 6 characters" },
              { icon: "🔡", text: "Mix of uppercase & lowercase" },
              { icon: "🔢", text: "Include numbers for strength" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                <span>{item.icon}</span> {item.text}
              </div>
            ))}
          </div>
        </div>

        <div style={{ paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link to="/auth/login" style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)", fontSize: 13, textDecoration: "none" }}>
            <ArrowLeft size={14} /> Back to Sign in
          </Link>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {verifying && (
            <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
              Verifying reset link...
            </div>
          )}

          {!verifying && !token && (
            <div style={{ textAlign: "center" }}>
              <AlertCircle size={48} style={{ color: "var(--danger)", marginBottom: 16 }} />
              <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>No reset token</h2>
              <p style={{ color: "var(--muted)", marginBottom: 24 }}>Please use the link from your email.</p>
              <Link to="/auth/forgot-password" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>Request a new link →</Link>
            </div>
          )}

          {!verifying && token && !tokenValid && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <AlertCircle size={36} style={{ color: "var(--danger)" }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Link expired or invalid</h2>
              <p style={{ color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
                This reset link is no longer valid.<br />Reset links expire after 1 hour.
              </p>
              <Link to="/auth/forgot-password"
                style={{ display: "inline-block", padding: "12px 24px", borderRadius: 11, background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                Request a new link
              </Link>
            </div>
          )}

          {!verifying && tokenValid && !done && (
            <>
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 8px" }}>Set new password</h2>
                <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Make it strong and memorable.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* New Password */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7, color: "var(--text)" }}>New Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 characters" disabled={loading}
                      {...register("new_password")}
                      style={{ width: "100%", padding: "12px 44px 12px 14px", borderRadius: 10, fontSize: 14, border: `1px solid ${errors.new_password ? "var(--danger)" : "var(--border)"}`, background: "var(--bg2)", color: "var(--text)", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = errors.new_password ? "var(--danger)" : "var(--border)"} />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.new_password && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 5, fontWeight: 600 }}>{errors.new_password.message}</div>}

                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength ? strengthColors[strength] : "var(--border)", transition: "all 0.2s" }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: strengthColors[strength], fontWeight: 700 }}>
                        {strengthLabels[strength]}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7, color: "var(--text)" }}>Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showConfirm ? "text" : "password"}
                      placeholder="Repeat your password" disabled={loading}
                      {...register("confirm_password")}
                      style={{ width: "100%", padding: "12px 44px 12px 14px", borderRadius: 10, fontSize: 14, border: `1px solid ${errors.confirm_password ? "var(--danger)" : "var(--border)"}`, background: "var(--bg2)", color: "var(--text)", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = errors.confirm_password ? "var(--danger)" : "var(--border)"} />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirm_password && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 5, fontWeight: 600 }}>{errors.confirm_password.message}</div>}
                </div>

                {error && (
                  <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, transparent)", fontSize: 13, color: "var(--danger)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{ width: "100%", padding: "13px", borderRadius: 11, border: "none", background: loading ? "var(--bg2)" : "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: loading ? "var(--muted)" : "white", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 4px 20px rgba(203,38,228,0.35)" }}>
                  {loading ? (
                    <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--muted)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} /> Resetting...</>
                  ) : (
                    <>Reset Password <ChevronRight size={16} /></>
                  )}
                </button>
              </form>
            </>
          )}

          {done && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <CheckCircle2 size={36} style={{ color: "var(--success)" }} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 10px" }}>Password reset!</h2>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>
                Your password has been reset successfully.<br />
                Redirecting you to sign in...
              </p>
              <Link to="/auth/login"
                style={{ display: "inline-block", padding: "12px 24px", borderRadius: 11, background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                Sign in now →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}