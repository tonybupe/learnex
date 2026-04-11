// api/client.ts
import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig
} from "axios"

import { useAuthStore } from "@/features/auth/auth.store"

/*
=========================================
API INSTANCE
=========================================
*/

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:8000/api/v1",

  timeout: 15000,

  headers: {
    "Content-Type": "application/json"
  }
})

/*
=========================================
RETRY CONFIGURATION
=========================================
*/

const MAX_RETRIES = 3
const RETRY_DELAY = 1000

interface RetryableConfig extends InternalAxiosRequestConfig {
  retryCount?: number
  skipRetry?: boolean
}

function shouldRetry(error: AxiosError): boolean {
  const status = error.response?.status
  const code = error.code
  
  // Don't retry on these status codes
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return false
  }
  
  // Retry on network errors, timeouts, and 5xx server errors
  return !error.response || 
         code === 'ECONNABORTED' || 
         code === 'ERR_NETWORK' ||
         (status !== undefined && status >= 500)
}

/*
=========================================
CIRCUIT BREAKER CONFIGURATION
=========================================
*/

interface CircuitBreakerState {
  failures: number
  lastFailureTime: number | null
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
}

const circuitBreakers = new Map<string, CircuitBreakerState>()
const FAILURE_THRESHOLD = 5
const OPEN_TIMEOUT = 30000 // 30 seconds

function getCircuitBreakerKey(config: RetryableConfig): string {
  return `${config.method || 'GET'}:${config.url || ''}`
}

function isCircuitOpen(key: string): boolean {
  const breaker = circuitBreakers.get(key)
  if (!breaker) return false
  
  if (breaker.state === 'OPEN') {
    const now = Date.now()
    if (breaker.lastFailureTime && (now - breaker.lastFailureTime) > OPEN_TIMEOUT) {
      breaker.state = 'HALF_OPEN'
      breaker.failures = 0
      circuitBreakers.set(key, breaker)
      return false
    }
    return true
  }
  
  return false
}

function recordFailure(key: string): void {
  const breaker = circuitBreakers.get(key) || {
    failures: 0,
    lastFailureTime: null,
    state: 'CLOSED'
  }
  
  breaker.failures++
  breaker.lastFailureTime = Date.now()
  
  if (breaker.failures >= FAILURE_THRESHOLD) {
    breaker.state = 'OPEN'
    if (import.meta.env.DEV) {
      console.warn(`[Circuit Breaker] OPEN for ${key}`)
    }
  }
  
  circuitBreakers.set(key, breaker)
}

function recordSuccess(key: string): void {
  const breaker = circuitBreakers.get(key)
  if (breaker) {
    if (breaker.state === 'HALF_OPEN') {
      breaker.failures = 0
      breaker.state = 'CLOSED'
      if (import.meta.env.DEV) {
        console.info(`[Circuit Breaker] CLOSED for ${key}`)
      }
    } else {
      breaker.failures = Math.max(0, breaker.failures - 1)
    }
    circuitBreakers.set(key, breaker)
  }
}

/*
=========================================
TOKEN HELPER
=========================================
*/

function getAccessToken(): string | null {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) return accessToken
  return localStorage.getItem("learnex_access_token")
}

/*
=========================================
ERROR NORMALIZER
=========================================
*/

export interface NormalizedApiError {
  message: string
  code?: string
  status?: number
  details?: any
}

export function normalizeApiError(error: AxiosError): NormalizedApiError {
  const data: any = error.response?.data
  const status = error.response?.status

  if (!data) {
    return {
      message: error.message || "Unexpected API error",
      code: error.code,
      status,
    }
  }

  if (typeof data === "string") {
    return { message: data, status }
  }

  if (Array.isArray(data)) {
    return {
      message: data.map((e: any) => e?.msg ?? e).join(", "),
      status,
    }
  }

  if (data?.detail) {
    if (Array.isArray(data.detail)) {
      return {
        message: data.detail.map((e: any) => e?.msg ?? e).join(", "),
        status,
      }
    }
    return { message: data.detail, status }
  }

  if (data?.message) {
    return { message: data.message, status, code: data?.code }
  }

  return {
    message: error.message || "Unexpected API error",
    status,
  }
}

/*
=========================================
REQUEST INTERCEPTOR
=========================================
*/

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/*
=========================================
RESPONSE INTERCEPTOR (WITH RETRY & CIRCUIT BREAKER)
=========================================
*/

api.interceptors.response.use(
  (response: AxiosResponse) => {
    const config = response.config as RetryableConfig
    const key = getCircuitBreakerKey(config)
    recordSuccess(key)
    return response
  },
  async (error: AxiosError) => {
    // Don't retry cancelled requests
    if (error.code === "ERR_CANCELED") {
      return Promise.reject(error)
    }

    const config = error.config as RetryableConfig | undefined
    const status = error.response?.status
    
    // Record failure for circuit breaker
    if (config) {
      const key = getCircuitBreakerKey(config)
      recordFailure(key)
      
      // Check if circuit is open - don't even attempt retry
      if (isCircuitOpen(key)) {
        const normalizedError = normalizeApiError(error)
        ;(error as any).normalizedError = {
          ...normalizedError,
          message: 'Service temporarily unavailable. Please try again later.'
        }
        return Promise.reject(error)
      }
    }
    
    // Handle authentication errors
    if (status === 401 || status === 403) {
      const store = useAuthStore.getState()
      store.clearSession?.()
      localStorage.removeItem("learnex_access_token")

      if (!window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth/login"
      }
      
      return Promise.reject(error)
    }
    
    // Skip retry if marked or should not retry
    if (config?.skipRetry || !shouldRetry(error)) {
      const normalizedError = normalizeApiError(error)
      ;(error as any).normalizedError = normalizedError
      return Promise.reject(error)
    }
    
    // Retry logic
    if (config) {
      config.retryCount = config.retryCount || 0
      
      if (config.retryCount < MAX_RETRIES) {
        config.retryCount += 1
        
        const delay = RETRY_DELAY * Math.pow(2, config.retryCount - 1)
        
        if (import.meta.env.DEV) {
          console.warn(
            `[Retry] (${config.retryCount}/${MAX_RETRIES}) after ${delay}ms: ${config.method?.toUpperCase()} ${config.url}`
          )
        }
        
        await new Promise(resolve => setTimeout(resolve, delay))
        
        return api(config)
      }
    }

    const normalizedError = normalizeApiError(error)

    if (import.meta.env.DEV) {
      console.error("[API ERROR]", normalizedError.message)
    }

    ;(error as any).normalizedError = normalizedError

    return Promise.reject(error)
  }
)

/*
=========================================
UTILITY FUNCTIONS
=========================================
*/

export function createCancelToken() {
  const controller = new AbortController()
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  }
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response && error.code === 'ERR_NETWORK'
  }
  return false
}

export function isTimeoutError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.code === 'ECONNABORTED'
  }
  return false
}

export function isCancelError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.code === 'ERR_CANCELED'
  }
  return false
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    const status = error.response?.status
    return status === 401 || status === 403
  }
  return false
}

export function isServerError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    const status = error.response?.status
    return status !== undefined && status >= 500
  }
  return false
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const normalized = (error as any).normalizedError
    if (normalized?.message) {
      return normalized.message
    }
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof AxiosError) {
    return error.response?.status
  }
  return undefined
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return shouldRetry(error)
  }
  return false
}

/*
=========================================
CONVENIENCE FUNCTIONS
=========================================
*/

export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  options?: {
    showToast?: boolean
    errorMessage?: string
  }
): Promise<T> {
  try {
    return await apiCall()
  } catch (error) {
    const message = options?.errorMessage || getErrorMessage(error)
    
    if (options?.showToast) {
      console.error(message)
    }
    
    throw error
  }
}

export function withCancelToken<T>(
  apiCall: (signal: AbortSignal) => Promise<T>
): { promise: Promise<T>; cancel: () => void } {
  const { signal, cancel } = createCancelToken()
  return {
    promise: apiCall(signal),
    cancel,
  }
}