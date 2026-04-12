import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"

import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import TextInput from "@/components/forms/TextInput"
import { useAuth } from "@/features/auth/useAuth"

/* -----------------------------------------------
   Validation Schema
----------------------------------------------- */

const registerSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  phone_number: z.string().min(7, "Enter a valid phone number"),
  sex: z.enum(["male", "female", "other"], { required_error: "Please select your sex" }),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["learner", "teacher"], { required_error: "Please select a role" }),
})

type RegisterFormValues = z.infer<typeof registerSchema>

/* -----------------------------------------------
   Error Extraction
----------------------------------------------- */

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

/* -----------------------------------------------
   Register Page
----------------------------------------------- */

export default function RegisterPage() {
  const { register: registerUser, isLoading } = useAuth()
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      sex: "male",
      password: "",
      role: "learner",
    },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    if (isLoading) return
    setServerError("")
    const result = await registerUser(values)
    if (!result.success) {
      setServerError(extractError(result.error))
    }
  }

  return (
    <div
      className="login-page"
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--grad)",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "40px",
          width: "100%",
          maxWidth: "1200px",
        }}
      >
        {/* ── Marketing Section ── */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ maxWidth: "500px" }}>
            <div className="chip" style={{ marginBottom: "16px" }}>
              🚀 Learnex v2.0
            </div>

            <h1 style={{ fontSize: "42px", marginTop: 0, marginBottom: "16px", fontWeight: 900, lineHeight: 1.2 }}>
              Join the Social<br />Learning Revolution
            </h1>

            <p style={{ marginTop: "10px", marginBottom: "30px", color: "var(--muted)", fontSize: "18px", lineHeight: 1.6 }}>
              Create your free account and start teaching or learning with thousands of people around the world.
            </p>

            <div className="grid-2" style={{ gap: "16px" }}>
              <Card className="hover-lift">
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>📚</div>
                <div className="card-title" style={{ fontSize: "18px", marginBottom: "8px" }}>For Learners</div>
                <p className="card-sub" style={{ margin: 0 }}>
                  Follow classes, access lessons, join discussions and take quizzes.
                </p>
              </Card>

              <Card className="hover-lift">
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>👩‍🏫</div>
                <div className="card-title" style={{ fontSize: "18px", marginBottom: "8px" }}>For Teachers</div>
                <p className="card-sub" style={{ margin: 0 }}>
                  Publish lessons, manage classes and track student engagement.
                </p>
              </Card>
            </div>

            <div style={{ marginTop: "30px", display: "flex", gap: "16px" }}>
              <div className="chip">⭐ 5k+ active users</div>
              <div className="chip">🏆 98% satisfaction</div>
            </div>
          </div>
        </div>

        {/* ── Register Card ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Card style={{ width: "100%", maxWidth: "440px", padding: "32px", boxShadow: "var(--shadow-lg)" }}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div className="logo-wrapper" style={{ justifyContent: "center" }}>
                <img src="/logo.png" alt="Learnex" className="logo" />
                <span className="brand-name">Learnex</span>
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "16px 0 8px" }}>
                Create your account
              </h2>
              <p className="card-sub" style={{ margin: 0 }}>
                Join as a learner or teacher — it's free
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {/* Full Name */}
              <TextInput
                label="Full Name"
                type="text"
                placeholder="Tony Bupe"
                error={errors.full_name?.message}
                disabled={isLoading}
                {...register("full_name")}
              />

              {/* Email */}
              <TextInput
                label="Email address"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                disabled={isLoading}
                {...register("email")}
              />

              {/* Phone */}
              <TextInput
                label="Phone Number"
                type="tel"
                placeholder="+260971234567"
                error={errors.phone_number?.message}
                disabled={isLoading}
                {...register("phone_number")}
              />

              {/* Sex + Role row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-field">
                  <label className="form-label">Sex</label>
                  <select
                    className={`audit-control select ${errors.sex ? "input-error" : ""}`}
                    disabled={isLoading}
                    {...register("sex")}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.sex && <span className="form-error">{errors.sex.message}</span>}
                </div>

                <div className="form-field">
                  <label className="form-label">I am a</label>
                  <select
                    className={`audit-control select ${errors.role ? "input-error" : ""}`}
                    disabled={isLoading}
                    {...register("role")}
                  >
                    <option value="learner">Learner</option>
                    <option value="teacher">Teacher</option>
                  </select>
                  {errors.role && <span className="form-error">{errors.role.message}</span>}
                </div>
              </div>

              {/* Password */}
              <TextInput
                label="Password"
                type="password"
                placeholder="Min. 6 characters"
                error={errors.password?.message}
                disabled={isLoading}
                {...register("password")}
              />

              {/* Server Error */}
              {serverError && (
                <div style={{
                  border: "1px solid var(--danger)",
                  background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                  padding: "12px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  color: "var(--danger)",
                  fontWeight: 600,
                }}>
                  {serverError}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ width: "100%", padding: "14px", marginTop: "4px" }}
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            {/* Footer */}
            <div style={{
              marginTop: "24px",
              paddingTop: "24px",
              borderTop: "1px solid var(--border)",
              textAlign: "center",
            }}>
              <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}>
                Already have an account?{" "}
                <Link
                  to="/auth/login"
                  style={{ fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}
                >
                  Sign in
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}