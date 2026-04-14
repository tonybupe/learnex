import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useAuth } from "@/features/auth/useAuth"
import { Eye, EyeOff, ChevronRight, Sparkles, CheckCircle2, BookOpen, Users, Zap, Shield } from "lucide-react"

const registerSchema = z.object({
  full_name:    z.string().min(2, "Full name must be at least 2 characters"),
  email:        z.string().email("Enter a valid email address"),
  phone_number: z.string().min(7, "Enter a valid phone number"),
  sex:          z.enum(["male", "female", "other"], { required_error: "Please select your sex" }),
  password:     z.string().min(6, "Password must be at least 6 characters"),
  role:         z.enum(["learner", "teacher"], { required_error: "Please select a role" }),
})
type RegisterFormValues = z.infer<typeof registerSchema>

function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    const message = error.response?.data?.message
    if (typeof detail === "string") return detail
    if (typeof message === "string") return message
    if (Array.isArray(detail) && detail.length > 0) return detail[0]?.msg ?? "Registration failed"
    return "Unable to register. Please check your details."
  }
  if (error instanceof Error) return error.message
  return "Something went wrong. Please try again."
}

const STEPS = ["Account", "Personal", "Done"]

const ROLE_INFO = {
  learner: {
    icon: "🎓", color: "#38bdf8",
    title: "Learner",
    perks: ["Access class lessons & resources", "Take quizzes & track progress", "Join live sessions", "Discuss with classmates"],
  },
  teacher: {
    icon: "👩‍🏫", color: "#cb26e4",
    title: "Teacher",
    perks: ["Create & publish lessons with AI", "Manage classes & students", "Host live video sessions", "Track learner engagement"],
  },
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7, color: "var(--text)" }}>{label}</label>
      {children}
      {error && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 5, fontWeight: 600 }}>{error}</div>}
    </div>
  )
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
  border: `1px solid ${hasError ? "var(--danger)" : "var(--border)"}`,
  background: "var(--bg2)", color: "var(--text)", fontFamily: "inherit",
  outline: "none", transition: "border-color 0.15s", boxSizing: "border-box",
})

export default function RegisterPage() {
  const { register: registerUser, isLoading } = useAuth()
  const [serverError, setServerError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<"learner" | "teacher">("learner")

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: "", email: "", phone_number: "", sex: "male", password: "", role: "learner" },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    if (isLoading) return
    setServerError("")
    const result = await registerUser(values)
    if (!result.success) setServerError(extractError(result.error))
  }

  const handleRoleSelect = (role: "learner" | "teacher") => {
    setSelectedRole(role)
    setValue("role", role)
  }

  const roleData = ROLE_INFO[selectedRole]

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)", fontFamily: "inherit" }}>

      {/* ── LEFT PANEL ── */}
      <div style={{
        flex: "0 0 440px", display: "flex", flexDirection: "column",
        background: "linear-gradient(160deg, #1a0030 0%, #0d0d1a 60%, #001a2e 100%)",
        padding: "48px 40px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(203,38,228,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(56,189,248,0.06)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} style={{ color: "white" }} />
          </div>
          <span style={{ color: "white", fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em" }}>Learnex</span>
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "white", margin: "0 0 12px", lineHeight: 1.2 }}>
            Join the Social<br />
            <span style={{ background: "linear-gradient(90deg,#cb26e4,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Learning Revolution
            </span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7, margin: "0 0 36px" }}>
            Create your free account and start teaching or learning with thousands of people across Zambia.
          </p>

          {/* Dynamic role preview */}
          <div style={{ padding: "20px", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>{roleData.icon}</span>
              <div>
                <div style={{ color: "white", fontWeight: 800, fontSize: 15 }}>Joining as {roleData.title}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Select your role on the right</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {roleData.perks.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                  <CheckCircle2 size={13} style={{ color: roleData.color, flexShrink: 0 }} />
                  {p}
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: <Sparkles size={14} />, color: "#cb26e4", text: "AI-powered lesson generation with Claude" },
              { icon: <Zap size={14} />,      color: "#f59e0b", text: "Live sessions with screen sharing" },
              { icon: <Shield size={14} />,   color: "#22c55e", text: "Mobile money payments (Airtel, MTN, Kazang)" },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: f.color, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 20, marginTop: 40, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {[{ value: "Free", label: "To Join" }, { value: "5k+", label: "Users" }, { value: "AI", label: "Powered" }].map(s => (
            <div key={s.label}>
              <div style={{ color: "#cb26e4", fontWeight: 900, fontSize: 16 }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL (Form) ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 6px", color: "var(--text)" }}>Create your account</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>It's free — join as a learner or teacher</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Role selector */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>I am a</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {(["learner", "teacher"] as const).map(role => {
                  const ri = ROLE_INFO[role]
                  const isSelected = selectedRole === role
                  return (
                    <button key={role} type="button" onClick={() => handleRoleSelect(role)}
                      style={{
                        padding: "12px 14px", borderRadius: 11, border: `2px solid ${isSelected ? ri.color : "var(--border)"}`,
                        background: isSelected ? `${ri.color}10` : "var(--bg2)",
                        cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                      <span style={{ fontSize: 20 }}>{ri.icon}</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: isSelected ? ri.color : "var(--text)" }}>{ri.title}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>{role === "learner" ? "Take classes" : "Teach classes"}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
              <input type="hidden" {...register("role")} />
              {errors.role && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 5 }}>{errors.role.message}</div>}
            </div>

            {/* Full name */}
            <Field label="Full Name" error={errors.full_name?.message}>
              <input type="text" placeholder="Tony Bupe" disabled={isLoading}
                {...register("full_name")} style={inputStyle(!!errors.full_name)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                onBlur={e => e.currentTarget.style.borderColor = errors.full_name ? "var(--danger)" : "var(--border)"} />
            </Field>

            {/* Email */}
            <Field label="Email address" error={errors.email?.message}>
              <input type="email" placeholder="you@example.com" disabled={isLoading}
                {...register("email")} style={inputStyle(!!errors.email)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                onBlur={e => e.currentTarget.style.borderColor = errors.email ? "var(--danger)" : "var(--border)"} />
            </Field>

            {/* Phone + Sex row */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 10 }}>
              <Field label="Phone Number" error={errors.phone_number?.message}>
                <input type="tel" placeholder="+260971234567" disabled={isLoading}
                  {...register("phone_number")} style={inputStyle(!!errors.phone_number)}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = errors.phone_number ? "var(--danger)" : "var(--border)"} />
              </Field>
              <Field label="Sex" error={errors.sex?.message}>
                <select disabled={isLoading} {...register("sex")} style={{ ...inputStyle(!!errors.sex), padding: "11px 10px" }}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>

            {/* Password */}
            <Field label="Password" error={errors.password?.message}>
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters" disabled={isLoading}
                  {...register("password")}
                  style={{ ...inputStyle(!!errors.password), paddingRight: 44 }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = errors.password ? "var(--danger)" : "var(--border)"} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center" }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {/* Server error */}
            {serverError && (
              <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, transparent)", fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={isLoading}
              style={{
                width: "100%", padding: "13px", borderRadius: 11, border: "none",
                background: isLoading ? "var(--bg2)" : "linear-gradient(135deg,#cb26e4,#8b5cf6)",
                color: isLoading ? "var(--muted)" : "white", fontWeight: 800, fontSize: 15,
                cursor: isLoading ? "not-allowed" : "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "opacity 0.15s", boxShadow: isLoading ? "none" : "0 4px 20px rgba(203,38,228,0.35)",
                marginTop: 4,
              }}>
              {isLoading ? (
                <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--muted)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} /> Creating account...</>
              ) : (
                <>Create account <ChevronRight size={16} /></>
              )}
            </button>

            {/* Terms note */}
            <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", margin: 0 }}>
              By creating an account you agree to our{" "}
              <a href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>Terms of Service</a>
              {" "}and{" "}
              <a href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>Privacy Policy</a>
            </p>
          </form>

          {/* Login link */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)", textAlign: "center" }}>
            <span style={{ fontSize: 14, color: "var(--muted)" }}>Already have an account? </span>
            <Link to="/auth/login" style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
              Sign in →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}