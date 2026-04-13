import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "./auth.store"
import { login as loginApi, register as registerApi, getMe } from "./auth.api"
import type { LoginCredentials, RegisterData } from "./auth.api"
import { queryClient } from "@/lib/queryClient"

const ROLE_ROUTES = {
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  learner: "/learner/dashboard",
} as const

export function useAuth() {
  const navigate = useNavigate()
  const {
    accessToken, user, isAuthenticated, isLoading,
    setSession, clearSession, setLoading,
  } = useAuthStore()

  // Rehydrate user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      if (accessToken && !user && !isLoading) {
        setLoading(true)
        try {
          const userData = await getMe()
          setSession(accessToken, userData)
        } catch {
          clearSession()
          localStorage.removeItem("learnex_access_token")
        } finally {
          setLoading(false)
        }
      }
    }
    loadUser()
  }, [accessToken, user, isLoading, setSession, clearSession, setLoading])

  // LOGIN
  const login = async (credentials: LoginCredentials) => {
    setLoading(true)
    try {
      // Clear ALL cached data from previous session before loading new user
      queryClient.clear()
      const { access_token } = await loginApi(credentials)
      const userData = await getMe()
      setSession(access_token, userData)
      navigate(ROLE_ROUTES[userData.role] ?? "/")
      return { success: true }
    } catch (error) {
      clearSession()
      localStorage.removeItem("learnex_access_token")
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  // REGISTER
  const register = async (data: RegisterData) => {
    setLoading(true)
    try {
      queryClient.clear()
      await registerApi(data)
      const { access_token } = await loginApi({ email: data.email, password: data.password })
      const userData = await getMe()
      setSession(access_token, userData)
      navigate(ROLE_ROUTES[userData.role] ?? "/")
      return { success: true }
    } catch (error) {
      clearSession()
      localStorage.removeItem("learnex_access_token")
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("learnex_access_token")
    // Clear ALL query cache so next user starts fresh
    queryClient.clear()
    clearSession()
    navigate("/auth/login")
  }

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    isAdmin: user?.role === "admin",
    isTeacher: user?.role === "teacher",
    isLearner: user?.role === "learner",
    role: user?.role,
  }
}

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
}