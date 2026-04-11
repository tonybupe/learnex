// hooks/useToast.tsx (NOTE: .tsx extension is REQUIRED)
import React, { 
  useState, 
  useCallback, 
  useRef, 
  useEffect, 
  createContext, 
  useContext 
} from "react"
import type { ReactNode } from "react"

// =========================================
// TYPES
// =========================================

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export type Toast = {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export type ToastOptions = {
  type?: ToastType
  title?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export type ToastContextValue = {
  toasts: Toast[]
  show: (message: string, options?: ToastOptions) => string
  success: (message: string, options?: Omit<ToastOptions, 'type'>) => string
  error: (message: string, options?: Omit<ToastOptions, 'type'>) => string
  warning: (message: string, options?: Omit<ToastOptions, 'type'>) => string
  info: (message: string, options?: Omit<ToastOptions, 'type'>) => string
  dismiss: (id: string) => void
  dismissAll: () => void
  update: (id: string, options: Partial<Toast>) => void
}

// =========================================
// DEFAULT CONFIGURATION
// =========================================

const DEFAULT_DURATION = 5000
const MAX_TOASTS = 5

// =========================================
// TOAST HOOK
// =========================================

export function useToast(): ToastContextValue {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
    
    const timeout = timeoutsRef.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeoutsRef.current.delete(id)
    }
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
    
    timeoutsRef.current.forEach((timeout) => {
      clearTimeout(timeout)
    })
    timeoutsRef.current.clear()
  }, [])

  const show = useCallback((message: string, options: ToastOptions = {}): string => {
    const {
      type = 'info',
      title,
      duration = DEFAULT_DURATION,
      action
    } = options

    const id = generateId()
    const newToast: Toast = {
      id,
      type,
      message,
      title,
      duration,
      action
    }

    setToasts(prev => {
      const updated = [newToast, ...prev]
      if (updated.length > MAX_TOASTS) {
        updated.pop()
      }
      return updated
    })

    if (duration > 0) {
      const timeout = setTimeout(() => {
        dismiss(id)
      }, duration)
      
      timeoutsRef.current.set(id, timeout)
    }

    return id
  }, [generateId, dismiss])

  const success = useCallback((message: string, options?: Omit<ToastOptions, 'type'>): string => {
    return show(message, { ...options, type: 'success' })
  }, [show])

  const error = useCallback((message: string, options?: Omit<ToastOptions, 'type'>): string => {
    return show(message, { ...options, type: 'error' })
  }, [show])

  const warning = useCallback((message: string, options?: Omit<ToastOptions, 'type'>): string => {
    return show(message, { ...options, type: 'warning' })
  }, [show])

  const info = useCallback((message: string, options?: Omit<ToastOptions, 'type'>): string => {
    return show(message, { ...options, type: 'info' })
  }, [show])

  const update = useCallback((id: string, options: Partial<Toast>) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id ? { ...toast, ...options } : toast
      )
    )
  }, [])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout)
      })
      timeoutsRef.current.clear()
    }
  }, [])

  return {
    toasts,
    show,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
    update
  }
}

// =========================================
// TOAST ITEM COMPONENT
// =========================================

type ToastItemProps = {
  toast: Toast
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { id, type, title, message, duration = 5000, action } = toast

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(id)
    }, 300)
  }, [id, onDismiss])

  const handleAction = useCallback(() => {
    action?.onClick()
    handleDismiss()
  }, [action, handleDismiss])

  useEffect(() => {
    if (duration <= 0) return

    const startTime = Date.now()

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, ((duration - elapsed) / duration) * 100)
      setProgress(remaining)
      
      if (elapsed >= duration) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
      }
    }, 50)

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [duration])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '📢'
    }
  }

  return (
    <div 
      className={`toast toast-${type} ${isExiting ? 'exiting' : 'entering'}`}
      role="alert"
      aria-live="polite"
    >
      <div className="toast-content">
        <div className="toast-icon">{getIcon()}</div>
        <div className="toast-message">
          {title && <div className="toast-title">{title}</div>}
          <div className="toast-text">{message}</div>
        </div>
        {action && (
          <button 
            type="button"
            className="toast-action" 
            onClick={handleAction}
          >
            {action.label}
          </button>
        )}
        <button 
          type="button"
          className="toast-close" 
          onClick={handleDismiss}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
      {duration > 0 && (
        <div 
          className="toast-progress" 
          style={{ width: `${progress}%` }}
        />
      )}
    </div>
  )
}

// =========================================
// TOAST CONTAINER
// =========================================

type ToastContainerProps = {
  toasts: Toast[]
  dismiss: (id: string) => void
}

function ToastContainer({ toasts, dismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  )
}

// =========================================
// TOAST PROVIDER
// =========================================

const ToastContext = createContext<ToastContextValue | null>(null)

export type ToastProviderProps = {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const toast = useToast()

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
    </ToastContext.Provider>
  )
}

// =========================================
// HOOK FOR USING TOAST CONTEXT
// =========================================

export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider')
  }
  return context
}

// =========================================
// EXPORT DEFAULT
// =========================================

export default useToast