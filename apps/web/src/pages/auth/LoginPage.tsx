import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"

import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import TextInput from "@/components/forms/TextInput"

import { login, getMe } from "@/features/auth/auth.api"
import type { LoginResponse } from "@/features/auth/auth.api" // Import the correct type
import { useAuthStore } from "@/features/auth/auth.store"

/*
---------------------------------------
Validation Schema
---------------------------------------
*/

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

/*
---------------------------------------
API Types - Now imported from auth.api.ts
---------------------------------------
*/

type UserRole = "admin" | "teacher" | "learner"

/*
---------------------------------------
Error Extraction
---------------------------------------
*/

function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    const message = error.response?.data?.message

    if (typeof detail === "string") return detail
    if (typeof message === "string") return message

    if (Array.isArray(detail) && detail.length > 0) {
      return detail[0]?.msg ?? "Login failed"
    }

    return "Unable to log in. Please check your credentials."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong. Please try again."
}

/*
---------------------------------------
Role Redirect
---------------------------------------
*/

function redirectByRole(role: UserRole): string {
  const routes: Record<UserRole, string> = {
    admin: "/home",
    teacher: "/home",
    learner: "/home",
  }

  return routes[role]
}

/*
---------------------------------------
Login Page
---------------------------------------
*/

export default function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)

  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  /*
  ---------------------------------------
  Submit Handler
  ---------------------------------------
  */

  const onSubmit = async (values: LoginFormValues) => {
  if (loading) return

  try {
    setServerError("")
    setLoading(true)

    console.log("1. Login attempt:")

    // ðŸ” LOGIN
    const response = await login(values)

    const accessToken = response.access_token

    if (!accessToken) {
      throw new Error("No access token received")
    }

    console.log("2. Token received")

    // ðŸ’¾ STORE TOKEN
    localStorage.setItem("learnex_access_token", accessToken)

    console.log("3. Token stored")

    // ðŸ‘¤ FETCH USER (MANDATORY)
    const user = await getMe()

    if (import.meta.env.DEV) {
      console.log("User fetched:", {
        id: user.id,
        role: user.role
      })
    }

    if (!user) {
      throw new Error("User fetch failed")
    }

    // ðŸ§  STORE SESSION
    setSession(accessToken, user)

    // ðŸš€ REDIRECT
    navigate(redirectByRole(user.role), { replace: true })

  } catch (error) {
    console.error("Login error:", error)

    localStorage.removeItem("learnex_access_token")

    setServerError(extractError(error))
  } finally {
    setLoading(false)
  }
}

  /*
  ---------------------------------------
  UI
  ---------------------------------------
  */

  return (
    <div className="login-page" style={{ 
      display: "flex", 
      minHeight: "100vh", 
      alignItems: "center", 
      justifyContent: "center",
      background: "var(--grad)"
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "40px",
        width: "100%",
        maxWidth: "1200px",
        padding: "20px"
      }}>

        {/* Marketing Section */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          justifyContent: "center" 
        }}>
          <div style={{ maxWidth: "500px" }}>
            <div className="chip" style={{ marginBottom: "16px" }}>
              ðŸš€ Learnex v2.0
            </div>

            <h1 style={{ 
              fontSize: "42px", 
              marginTop: "0", 
              marginBottom: "16px",
              fontWeight: 900,
              lineHeight: 1.2
            }}>
              Social Learning for<br />Modern Classrooms
            </h1>

            <p style={{ 
              marginTop: "10px", 
              marginBottom: "30px",
              color: "var(--muted)",
              fontSize: "18px",
              lineHeight: 1.6
            }}>
              Teach, learn, collaborate and assess in one professional platform
              built for teachers, learners, and institutions.
            </p>

            <div className="grid-2" style={{ gap: "16px" }}>
              <Card className="hover-lift">
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>ðŸ“š</div>
                <div className="card-title" style={{ fontSize: "18px", marginBottom: "8px" }}>
                  For Learners
                </div>
                <p className="card-sub" style={{ margin: 0 }}>
                  Follow classes, access lessons, join discussions and take quizzes.
                </p>
              </Card>

              <Card className="hover-lift">
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>ðŸ‘©â€ðŸ«</div>
                <div className="card-title" style={{ fontSize: "18px", marginBottom: "8px" }}>
                  For Teachers
                </div>
                <p className="card-sub" style={{ margin: 0 }}>
                  Publish lessons, manage classes and track student engagement.
                </p>
              </Card>
            </div>

            <div style={{ marginTop: "30px", display: "flex", gap: "16px" }}>
              <div className="chip">â­ 5k+ active users</div>
              <div className="chip">ðŸ† 98% satisfaction</div>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center" 
        }}>
          <Card style={{ 
            width: "100%", 
            maxWidth: "420px",
            padding: "32px",
            boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div className="logo-wrapper" style={{ justifyContent: "center" }}>
                <img src="/logo.png" alt="Learnex" className="logo" />
                <span className="brand-name">Learnex</span>
              </div>
              <h2 style={{ 
                fontSize: "24px", 
                fontWeight: 800,
                margin: "16px 0 8px"
              }}>
                Welcome back
              </h2>
              <p className="card-sub" style={{ margin: 0 }}>
                Enter your credentials to access your account
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <TextInput
                label="Email address"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                disabled={loading}
                {...register("email")}
              />

              <TextInput
                label="Password"
                type="password"
                placeholder="Enter your password"
                error={errors.password?.message}
                disabled={loading}
                {...register("password")}
              />

              {serverError && (
                <div style={{
                  border: "1px solid var(--danger)",
                  background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                  padding: "12px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  color: "var(--danger)",
                  fontWeight: 600
                }}>
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: "100%", padding: "14px" }}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <div style={{ textAlign: "center" }}>
                <Link 
                  to="/auth/forgot-password" 
                  style={{ 
                    fontSize: "13px",
                    color: "var(--accent2)",
                    textDecoration: "none"
                  }}
                >
                  Forgot password?
                </Link>
              </div>
            </form>

            <div style={{ 
              marginTop: "24px",
              paddingTop: "24px",
              borderTop: "1px solid var(--border)",
              textAlign: "center"
            }}>
              <p style={{
                fontSize: "14px",
                color: "var(--muted)",
                margin: 0
              }}>
                Don't have an account?{" "}
                <Link 
                  to="/auth/register" 
                  style={{ 
                    fontWeight: 700,
                    color: "var(--accent)",
                    textDecoration: "none"
                  }}
                >
                  Create one
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
