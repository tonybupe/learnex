// hooks/useRealtimeFeed.ts
import { useEffect, useRef, useCallback } from "react"
import { useAuthStore } from "@/features/auth/auth.store"

interface UseRealtimeFeedOptions {
  onUpdate?: () => void
  onConnect?: () => void
  onDisconnect?: () => void
  onNewPost?: (post: any) => void
  onNewComment?: (comment: any) => void
  onReactionUpdate?: (data: any) => void
  onInit?: (data: { user_id: number; user_name: string; user_role: string; subscribed_classes: number[] }) => void
  enabled?: boolean
  classIds?: number[]
  delayConnection?: boolean // Add this to delay connection until after login
}

export function useRealtimeFeed({
  onUpdate,
  onConnect,
  onDisconnect,
  onNewPost,
  onNewComment,
  onReactionUpdate,
  onInit,
  enabled = true,
  classIds = [],
  delayConnection = true // Default to true to wait for stable auth
}: UseRealtimeFeedOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isMountedRef = useRef(true)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectionAttemptedRef = useRef(false) // Prevent multiple connection attempts
  
  const { accessToken, user, isAuthenticated } = useAuthStore()

  const connect = useCallback(() => {
    // Prevent connection if already attempted or not ready
    if (connectionAttemptedRef.current) {
      console.log("[WebSocket] Connection already attempted, skipping")
      return
    }
    
    if (!enabled) {
      console.log("[WebSocket] Disabled, skipping")
      return
    }
    
    if (!accessToken || !isAuthenticated) {
      console.log("[WebSocket] Waiting for authentication...")
      return
    }
    
    if (!isMountedRef.current) return
    
    connectionAttemptedRef.current = true
    
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws?token=${accessToken}`
    console.log("[WebSocket] Connecting to:", wsUrl)
    
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log("[WebSocket] Connected")
      reconnectAttemptsRef.current = 0
      onConnect?.()
      
      // Start heartbeat ping
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "ping",
            timestamp: Date.now()
          }))
        }
      }, 30000)
      
      // Subscribe to classes after connection
      classIds.forEach(classId => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "join_class",
            class_id: classId,
            user_id: user?.id
          }))
        }
      })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case "connection":
            console.log("[WebSocket] Connection established:", data)
            break
            
          case "init":
            console.log("[WebSocket] Initialized:", data)
            onInit?.(data)
            break
            
          case "new_post":
            console.log("[WebSocket] New post received")
            onNewPost?.(data)
            onUpdate?.()
            break
            
          case "new_comment":
            console.log("[WebSocket] New comment received")
            onNewComment?.(data)
            onUpdate?.()
            break
            
          case "reaction_update":
            console.log("[WebSocket] Reaction update received")
            onReactionUpdate?.(data)
            break
            
          case "pong":
            break
            
          case "class_joined":
            console.log("[WebSocket] Joined class:", data.class_id)
            break
            
          case "error":
            console.error("[WebSocket] Server error:", data.message)
            break
            
          default:
            console.log("[WebSocket] Unknown message type:", data.type, data)
        }
      } catch (error) {
        console.error("[WebSocket] Failed to parse message:", error)
      }
    }

    ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error)
      connectionAttemptedRef.current = false // Allow retry on error
    }

    ws.onclose = (event) => {
      console.log(`[WebSocket] Disconnected: ${event.code} - ${event.reason}`)
      onDisconnect?.()
      connectionAttemptedRef.current = false // Allow reconnection
      
      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
      
      // Reconnect with exponential backoff (only if not a normal closure)
      if (isMountedRef.current && reconnectAttemptsRef.current < 5 && event.code !== 1000) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
        reconnectAttemptsRef.current++
        
        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/5)`)
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectionAttemptedRef.current = false
          connect()
        }, delay)
      }
    }
  }, [enabled, accessToken, user?.id, isAuthenticated, classIds, onConnect, onDisconnect, onInit, onNewPost, onNewComment, onReactionUpdate, onUpdate])

  // Single effect for connection - only runs when auth state is ready
  useEffect(() => {
    // Don't connect until we have a valid token and are authenticated
    if (!accessToken || !isAuthenticated) {
      console.log("[WebSocket] Waiting for authentication...")
      return
    }
    
    // Small delay to ensure auth store is fully updated
    const timer = setTimeout(() => {
      if (isMountedRef.current && !wsRef.current) {
        connect()
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [accessToken, isAuthenticated, connect]) // Only run when auth changes

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting")
      }
    }
  }, [])

  return {
    disconnect: () => {
      if (wsRef.current) {
        wsRef.current.close(1000, "Manual disconnect")
        wsRef.current = null
      }
      connectionAttemptedRef.current = false
    },
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    subscribeToClass: (classId: number) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "join_class",
          class_id: classId,
          user_id: user?.id
        }))
      }
    },
    unsubscribeFromClass: (classId: number) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "leave_class",
          class_id: classId,
          user_id: user?.id
        }))
      }
    }
  }
}