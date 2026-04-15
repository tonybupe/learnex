import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { api } from "@/api/client"
import { Sparkles, Mail, ArrowLeft, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react"

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
})
type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [devToken, setDevToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    setLoading(true); setError("")
    try {
      const res = await api.post("/auth/forgot-password", { email: values.email })
      const msg: string = res.data?.message ?? ""
      // Dev mode returns token in message
      if (msg.startsWith("DEV_TOKEN:")) {
        setDevToken(msg.replace("DEV_TOKEN:", ""))
      }
      setSent(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)", fontFamily: "inherit" }}>
      {/* Left panel */}
      <div style={{ flex: "0 0 440px", display: "flex", flexDirection: "column", background: "linear-gradient(160deg, #1a0030 0%, #0d0d1a 60%, #001a2e 100%)", padding: "48px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(203,38,228,0.08)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} style={{ color: "white" }} />
          </div>
          <span style={{ color: "white", fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em" }}>Learnex</span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(203,38,228,0.15)", border: "1px solid rgba(203,38,228,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <Mail size={28} style={{ color: "#cb26e4" }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "white", margin: "0 0 12px", lineHeight: 1.2 }}>
            Forgot your<br />
            <span style={{ background: "linear-gradient(90deg,#cb26e4,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              password?
            </span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7, margin: "0 0 32px" }}>
            No worries! Enter your email and we'll send you a link to reset your password.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "🔐", text: "Secure one-time reset link" },
              { icon: "⏱️", text: "Link expires in 1 hour" },
              { icon: "📧", text: "Check your spam folder too" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.text}
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

          {!sent ? (
            <>
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 8px" }}>Reset your password</h2>
                <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
                  We'll send a reset link to your registered email.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7, color: "var(--text)" }}>
                    Email address
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input type="email" placeholder="you@example.com" disabled={loading}
                      {...register("email")}
                      style={{ width: "100%", padding: "12px 14px 12px 38px", borderRadius: 10, fontSize: 14, border: `1px solid ${errors.email ? "var(--danger)" : "var(--border)"}`, background: "var(--bg2)", color: "var(--text)", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = errors.email ? "var(--danger)" : "var(--border)"} />
                  </div>
                  {errors.email && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 5, fontWeight: 600 }}>{errors.email.message}</div>}
                </div>

                {error && (
                  <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, transparent)", fontSize: 13, color: "var(--danger)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{ width: "100%", padding: "13px", borderRadius: 11, border: "none", background: loading ? "var(--bg2)" : "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: loading ? "var(--muted)" : "white", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 4px 20px rgba(203,38,228,0.35)" }}>
                  {loading ? (
                    <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--muted)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} /> Sending...</>
                  ) : (
                    <>Send Reset Link <ChevronRight size={16} /></>
                  )}
                </button>
              </form>

              <div style={{ marginTop: 28, textAlign: "center" }}>
                <span style={{ fontSize: 14, color: "var(--muted)" }}>Remember your password? </span>
                <Link to="/auth/login" style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>Sign in →</Link>
              </div>
            </>
          ) : (
            /* Success state */
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <CheckCircle2 size={36} style={{ color: "var(--success)" }} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 10px" }}>Check your email</h2>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>
                We sent a password reset link to<br />
                <strong style={{ color: "var(--text)" }}>{getValues("email")}</strong>
              </p>

              {/* Dev mode token display */}
              {devToken && (
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", marginBottom: 20, textAlign: "left" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    🛠 Dev Mode — Reset Token
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text)", wordBreak: "break-all", marginBottom: 10 }}>
                    {devToken}
                  </div>
                  <Link to={`/auth/reset-password?token=${devToken}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#f59e0b", textDecoration: "none", padding: "6px 12px", borderRadius: 8, background: "rgba(245,158,11,0.12)" }}>
                    Use this token to reset →
                  </Link>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => { setSent(false); setDevToken("") }}
                  style={{ padding: "12px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                  Try a different email
                </button>
                <Link to="/auth/login"
                  style={{ padding: "12px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none", display: "block", boxShadow: "0 4px 20px rgba(203,38,228,0.3)" }}>
                  Back to Sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}