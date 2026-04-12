import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import type { AuthUser } from "@/types/api"

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  full_name: string
  email: string
  phone_number: string
  sex: "male" | "female" | "other"
  password: string
  role: "learner" | "teacher" | "admin"
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

// Register returns the created user (201) - no token
export type RegisterResponse = AuthUser

// =========================================================
// LOGIN
// =========================================================
export async function loginUser(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>(endpoints.auth.login, credentials)
  localStorage.setItem("learnex_access_token", response.data.access_token)
  return response.data
}

// =========================================================
// REGISTER
// =========================================================
export async function registerUser(data: RegisterData): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>(endpoints.auth.register, data)
  return response.data
}

// =========================================================
// GET CURRENT USER
// =========================================================
export async function getMe(): Promise<AuthUser> {
  const response = await api.get<AuthUser>(endpoints.users.me)
  return response.data
}

export const login = loginUser
export const register = registerUser