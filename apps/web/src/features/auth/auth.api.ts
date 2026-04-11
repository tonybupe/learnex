import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import type { AuthUser } from "@/types/api"

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  role?: "learner" | "teacher"
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface RegisterResponse {
  access_token: string
  token_type: string
  user: AuthUser
}


// =========================================================
// 🔐 LOGIN
// =========================================================

export async function loginUser(
  credentials: LoginCredentials
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>(
    endpoints.auth.login,
    credentials
  )

  const data = response.data

  // 🔥 SAVE TOKEN IMMEDIATELY
  localStorage.setItem("learnex_access_token", data.access_token)

  return data
}


// =========================================================
// 📝 REGISTER
// =========================================================

export async function registerUser(
  data: RegisterData
): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>(
    endpoints.auth.register,
    data
  )

  const res = response.data

  // 🔥 SAVE TOKEN
  localStorage.setItem("token", res.access_token)

  return res
}


// =========================================================
// 👤 GET CURRENT USER
// =========================================================

export async function getMe(): Promise<AuthUser> {
  try {
    const response = await api.get<AuthUser>(
      endpoints.users.me
    )

    return response.data

  } catch (error: any) {
    console.error("❌ getMe failed:", error?.response?.data || error.message)

    // 🔥 REMOVE INVALID TOKEN
    localStorage.removeItem("token")

    throw new Error("Failed to fetch current user")
  }
}


// =========================================================
// 🔁 ALIASES
// =========================================================

export const login = loginUser
export const register = registerUser