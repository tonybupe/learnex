// utils/error-handling.ts
import { AxiosError } from 'axios'
import { ApiError } from '../features/posts/types/post.types'

export function handleApiError(error: unknown, defaultMessage: string): ApiError {
  if (error instanceof AxiosError) {
    const response = error.response
    const responseData = response?.data as any
    const status = response?.status
    
    // Network errors (no response)
    if (!response) {
      if (error.code === 'ECONNABORTED') {
        return {
          code: 'TIMEOUT_ERROR',
          message: 'Request timeout. Please try again.',
          status: undefined
        }
      }
      if (error.code === 'ERR_NETWORK') {
        return {
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection.',
          status: undefined
        }
      }
      return {
        code: 'CONNECTION_ERROR',
        message: 'Failed to connect to the server. Please try again.',
        status: undefined
      }
    }
    
    // Backend validation errors
    if (status === 400) {
      return {
        code: 'VALIDATION_ERROR',
        message: responseData?.message || 'Invalid request',
        details: responseData?.details,
        status
      }
    }
    
    // Authentication errors
    if (status === 401) {
      return {
        code: 'UNAUTHORIZED',
        message: 'Please login to continue',
        status
      }
    }
    
    // Permission errors
    if (status === 403) {
      return {
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
        status
      }
    }
    
    // Not found
    if (status === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        status
      }
    }
    
    // Rate limiting
    if (status === 429) {
      return {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        status
      }
    }
    
    // Server errors
    if (status && status >= 500) {
      return {
        code: 'SERVER_ERROR',
        message: 'Server error. Please try again later.',
        status
      }
    }
    
    // Use backend message if available
    if (responseData?.message) {
      return {
        code: responseData.code || 'BACKEND_ERROR',
        message: responseData.message,
        details: responseData.details,
        status
      }
    }
    
    if (responseData?.detail) {
      return {
        code: 'BACKEND_ERROR',
        message: responseData.detail,
        status
      }
    }
    
    return {
      code: 'API_ERROR',
      message: defaultMessage,
      status
    }
  }
  
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message
    }
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: defaultMessage
  }
}

export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export function getErrorCode(error: unknown): string {
  if (isApiError(error)) {
    return error.code
  }
  return 'UNKNOWN_ERROR'
}

export function getErrorStatus(error: unknown): number | undefined {
  if (isApiError(error)) {
    return error.status
  }
  if (error instanceof AxiosError) {
    return error.response?.status
  }
  return undefined
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