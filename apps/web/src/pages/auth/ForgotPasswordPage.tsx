import { useState } from "react"
import { Link } from "react-router-dom"
import { api } from "@/api/client"
import {
  Sparkles, Mail, Phone, ArrowLeft, CheckCircle2,
  AlertCircle, ChevronRight, Search, Shield
} from "lucide-react"

type Step = "lookup" | "choose" | "sent"

interface AccountInfo {
  masked_email: string
  masked_phone: string
}

function inputStyle(error?: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "12px 14px 12px 40px", borderRadius: 10, fontSize: 14,
    border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
    background: "var(--bg2)", color: "var(--text)", fontFamily: "inherit",
    outline: "none", boxSizing: "border-box" as const, transition: "border-color 0.15s",
  }
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("lookup")
  const [identifier, setIdentifier] = useState("")
  const [identifierError, setIdentifierError] = useState("")
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [chosenMethod, setChosenMethod] = useState<"email"|"phone">("email")
  const [devToken, setDevToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Step 1: Look up account
  const handleLookup = async () => {
    const val = identifier.trim()
    if (!val) { setIdentifierError("Enter your email or phone number"); return }
    setIdentifierError(""); setError(""); setLoading(true)
    try {
      const res = await api.post("/auth/lookup-account", { identifier: val })
      const data = res.data
      if (!data.found) {
        setIdentifierError("No account found with that email or phone number.")
        setLoading(false)
        return
      }
      setAccount({ masked_email: data.masked_email, masked_phone: data.masked_phone })
      setChosenMethod("email")
      setStep("choose")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Send reset via chosen method
  const handleSend = async () => {
    setError(""); setLoading(true)
    try {
      const res = await api.post("/auth/forgot-password", {
        identifier: identifier.trim(),
        method: chosenMethod,
      })
      const msg: string = res.data?.message ?? ""
      if (msg.startsWith("DEV_TOKEN:")) setDevToken(msg.replace("DEV_TOKEN:", ""))
      setStep("sent")
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to send reset instructions.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)", fontFamily: "inherit" }}>

      {/* ── LEFT PANEL ── */}
      <div style={{ flex: "0 0 440px", display: "flex", flexDirection: "column", background: "linear-gradient(160deg,#1a0030 0%,#0d0d1a 60%,#001a2e 100%)", padding: "48px 40px", position: "relative", overflow: "hidden" }}>
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
            <Shield size={28} style={{ color: "#cb26e4" }} />
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: "white", margin: "0 0 12px", lineHeight: 1.2 }}>
            Account<br />
            <span style={{ background: "linear-gradient(90deg,#cb26e4,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Recovery
            </span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7, margin: "0 0 32px" }}>
            Recover access to your Learnex account securely using your registered email or phone number.
          </p>

          {/* Steps indicator */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { n: "1", label: "Find your account", active: step === "lookup" },
              { n: "2", label: "Choose recovery method", active: step === "choose" },
              { n: "3", label: "Reset your password", active: step === "sent" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: s.active ? "rgba(203,38,228,0.3)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${s.active ? "#cb26e4" : "rgba(255,255,255,0.1)"}`,
                  fontSize: 12, fontWeight: 800, color: s.active ? "#cb26e4" : "rgba(255,255,255,0.3)",
                  flexShrink: 0, transition: "all 0.3s"
                }}>{s.n}</div>
                <span style={{ fontSize: 13, color: s.active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)", fontWeight: s.active ? 700 : 400, transition: "all 0.3s" }}>
                  {s.label}
                </span>
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

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>

          {/* ── STEP 1: LOOKUP ── */}
          {step === "lookup" && (
            <>
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 8px" }}>Find your account</h2>
                <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
                  Enter the email or phone number linked to your account.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7, color: "var(--text)" }}>
                    Email or Phone Number
                  </label>
                  <div style={{ position: "relative" }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                    <input
                      id="identifier" name="identifier"
                      value={identifier}
                      onChange={e => { setIdentifier(e.target.value); setIdentifierError("") }}
                      onKeyDown={e => e.key === "Enter" && handleLookup()}
                      placeholder="you@example.com or +260971234567"
                      autoComplete="email"
                      style={inputStyle(!!identifierError)}
                      onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                      onBlur={e => e.currentTarget.style.borderColor = identifierError ? "var(--danger)" : "var(--border)"}
                    />
                  </div>
                  {identifierError && (
                    <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                      <AlertCircle size={12} /> {identifierError}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                    Works with any email or phone number you registered with.
                  </div>
                </div>

                {error && (
                  <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, transparent)", fontSize: 13, color: "var(--danger)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <button onClick={handleLookup} disabled={loading}
                  style={{ width: "100%", padding: "13px", borderRadius: 11, border: "none", background: loading ? "var(--bg2)" : "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: loading ? "var(--muted)" : "white", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 4px 20px rgba(203,38,228,0.35)" }}>
                  {loading
                    ? <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--muted)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} /> Searching...</>
                    : <>Find Account <ChevronRight size={16} /></>}
                </button>

                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 14, color: "var(--muted)" }}>Remember your password? </span>
                  <Link to="/auth/login" style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>Sign in ÔåÆ</Link>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: CHOOSE METHOD ── */}
          {step === "choose" && account && (
            <>
              <div style={{ marginBottom: 28 }}>
                <button onClick={() => setStep("lookup")}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13, fontFamily: "inherit", marginBottom: 16, padding: 0 }}>
                  <ArrowLeft size={14} /> Change account
                </button>
                <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 8px" }}>How do you want to reset?</h2>
                <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
                  We found your account. Choose where to send the reset link.
                </p>
              </div>

              {/* Account found banner */}
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={16} style={{ color: "var(--success)", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 700 }}>Account found!</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Select a recovery method below.</span>
              </div>

              {/* Method cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                {/* Email option */}
                <button onClick={() => setChosenMethod("email")}
                  style={{
                    padding: "18px 20px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s",
                    border: `2px solid ${chosenMethod === "email" ? "#cb26e4" : "var(--border)"}`,
                    background: chosenMethod === "email" ? "rgba(203,38,228,0.06)" : "var(--bg2)",
                    display: "flex", alignItems: "center", gap: 16,
                  }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: chosenMethod === "email" ? "rgba(203,38,228,0.15)" : "var(--card)", border: `1px solid ${chosenMethod === "email" ? "#cb26e4" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Mail size={20} style={{ color: chosenMethod === "email" ? "#cb26e4" : "var(--muted)" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: chosenMethod === "email" ? "#cb26e4" : "var(--text)", marginBottom: 3 }}>
                      Reset via Email
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "monospace" }}>
                      {account.masked_email}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      Receive a secure link in your inbox
                    </div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${chosenMethod === "email" ? "#cb26e4" : "var(--border)"}`, background: chosenMethod === "email" ? "#cb26e4" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {chosenMethod === "email" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                  </div>
                </button>

                {/* Phone option */}
                <button onClick={() => setChosenMethod("phone")}
                  style={{
                    padding: "18px 20px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s",
                    border: `2px solid ${chosenMethod === "phone" ? "#38bdf8" : "var(--border)"}`,
                    background: chosenMethod === "phone" ? "rgba(56,189,248,0.06)" : "var(--bg2)",
                    display: "flex", alignItems: "center", gap: 16,
                  }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: chosenMethod === "phone" ? "rgba(56,189,248,0.15)" : "var(--card)", border: `1px solid ${chosenMethod === "phone" ? "#38bdf8" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Phone size={20} style={{ color: chosenMethod === "phone" ? "#38bdf8" : "var(--muted)" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: chosenMethod === "phone" ? "#38bdf8" : "var(--text)", marginBottom: 3 }}>
                      Reset via SMS
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "monospace" }}>
                      {account.masked_phone}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      Receive a reset link via text message
                    </div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${chosenMethod === "phone" ? "#38bdf8" : "var(--border)"}`, background: chosenMethod === "phone" ? "#38bdf8" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {chosenMethod === "phone" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                  </div>
                </button>
              </div>

              {/* SMS notice */}
              {chosenMethod === "phone" && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 12, color: "#f59e0b", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  SMS delivery requires a connected SMS gateway. In development mode, the reset link will appear on screen.
                </div>
              )}

              {error && (
                <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, transparent)", fontSize: 13, color: "var(--danger)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button onClick={handleSend} disabled={loading}
                style={{ width: "100%", padding: "13px", borderRadius: 11, border: "none", background: loading ? "var(--bg2)" : chosenMethod === "phone" ? "linear-gradient(135deg,#38bdf8,#0ea5e9)" : "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: loading ? "var(--muted)" : "white", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 4px 20px rgba(203,38,228,0.3)" }}>
                {loading
                  ? <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--muted)", borderTopColor: "white", animation: "spin 0.8s linear infinite" }} /> Sending...</>
                  : <>{chosenMethod === "phone" ? <Phone size={15} /> : <Mail size={15} />} Send Reset {chosenMethod === "phone" ? "SMS" : "Email"} <ChevronRight size={16} /></>}
              </button>
            </>
          )}

          {/* ── STEP 3: SENT ── */}
          {step === "sent" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                {chosenMethod === "phone" ? <Phone size={32} style={{ color: "var(--success)" }} /> : <Mail size={32} style={{ color: "var(--success)" }} />}
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 10px" }}>
                {chosenMethod === "phone" ? "SMS Sent!" : "Email Sent!"}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 8px", lineHeight: 1.6 }}>
                Reset instructions sent to
              </p>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", fontFamily: "monospace", marginBottom: 24 }}>
                {chosenMethod === "phone" ? account?.masked_phone : account?.masked_email}
              </div>

              {/* Dev token */}
              {devToken && (
                <div style={{ padding: "16px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", marginBottom: 20, textAlign: "left" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    ­ƒøá Dev Mode ÔÇö Reset Token
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text)", wordBreak: "break-all", marginBottom: 10, lineHeight: 1.5 }}>
                    {devToken}
                  </div>
                  <a href={`/auth/reset-password?token=${devToken}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#f59e0b", textDecoration: "none", padding: "6px 12px", borderRadius: 8, background: "rgba(245,158,11,0.12)" }}>
                    Click to reset password ÔåÆ
                  </a>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => { setStep("lookup"); setIdentifier(""); setAccount(null); setDevToken("") }}
                  style={{ padding: "12px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                  Try a different account
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
