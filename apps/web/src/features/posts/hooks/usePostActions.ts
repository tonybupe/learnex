// hooks/usePostActions.ts
import { useState, useCallback, useRef, useEffect } from "react" // Add useEffect
import {
  reactToPost,
  removeReaction,
  deletePost,
  toggleReaction,
  type ReactionType,
} from "../api/posts.api"
import { useToast } from "@/features/posts/hooks/useToast"

interface UsePostActionsOptions {
  onSuccess?: (action: string, postId: number) => void
  onError?: (action: string, postId: number, error: Error) => void
  optimisticUpdates?: boolean
}

interface UsePostActionsReturn {
  toggleLike: (postId: number, isLiked: boolean, reactionType?: ReactionType) => Promise<boolean>
  deletePost: (postId: number) => Promise<boolean>
  loading: boolean
  loadingPostId: number | null
  batchToggleLike: (posts: Array<{ id: number; isLiked: boolean }>) => Promise<void>
  clearError: () => void
}

export function usePostActions(options: UsePostActionsOptions = {}): UsePostActionsReturn {
  const { 
    onSuccess, 
    onError, 
    optimisticUpdates = true 
  } = options
  
  const [loading, setLoading] = useState(false)
  const [loadingPostId, setLoadingPostId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const debounceRef = useRef<Map<number, NodeJS.Timeout>>(new Map())
  const pendingActionsRef = useRef<Map<number, boolean>>(new Map())
  
  const toast = useToast()
  
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  const debounce = useCallback((postId: number, fn: () => Promise<void>, delay: number = 300) => {
    const existingTimeout = debounceRef.current.get(postId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    const timeout = setTimeout(async () => {
      try {
        await fn()
      } finally {
        debounceRef.current.delete(postId)
        pendingActionsRef.current.delete(postId)
      }
    }, delay)
    
    debounceRef.current.set(postId, timeout)
  }, [])
  
  const toggleLike = useCallback(async (
    postId: number,
    isLiked: boolean,
    reactionType: ReactionType = 'like'
  ): Promise<boolean> => {
    if (pendingActionsRef.current.get(postId)) {
      return false
    }
    
    pendingActionsRef.current.set(postId, true)
    setLoadingPostId(postId)
    setLoading(true)
    
    if (optimisticUpdates) {
      debounce(postId, async () => {
        try {
          await toggleReaction(postId, isLiked)
          onSuccess?.('like', postId)
          setError(null)
        } catch (err: any) {
          const errorMessage = err.normalizedError?.message || err.message || 'Failed to update like'
          setError(errorMessage)
          onError?.('like', postId, err)
          toast.error(errorMessage)
          throw err
        } finally {
          setLoadingPostId(null)
          setLoading(false)
          pendingActionsRef.current.delete(postId)
        }
      }, 300)
      
      return true
    }
    
    try {
      if (isLiked) {
        await removeReaction(postId)
      } else {
        await reactToPost(postId, reactionType)
      }
      
      onSuccess?.('like', postId)
      setError(null)
      return true
    } catch (err: any) {
      const errorMessage = err.normalizedError?.message || err.message || 'Failed to update like'
      setError(errorMessage)
      onError?.('like', postId, err)
      toast.error(errorMessage)
      return false
    } finally {
      setLoadingPostId(null)
      setLoading(false)
      pendingActionsRef.current.delete(postId)
    }
  }, [optimisticUpdates, debounce, onSuccess, onError, toast])
  
  const deletePostHandler = useCallback(async (postId: number): Promise<boolean> => {
    setLoadingPostId(postId)
    setLoading(true)
    
    try {
      await deletePost(postId)
      
      onSuccess?.('delete', postId)
      setError(null)
      
      toast.success('Post deleted successfully')
      return true
    } catch (err: any) {
      const errorMessage = err.normalizedError?.message || err.message || 'Failed to delete post'
      setError(errorMessage)
      onError?.('delete', postId, err)
      toast.error(errorMessage)
      return false
    } finally {
      setLoadingPostId(null)
      setLoading(false)
    }
  }, [onSuccess, onError, toast])
  
  const batchToggleLike = useCallback(async (
    posts: Array<{ id: number; isLiked: boolean }>
  ): Promise<void> => {
    setLoading(true)
    
    try {
      const promises = posts.map(({ id, isLiked }) => 
        toggleReaction(id, isLiked)
      )
      
      await Promise.all(promises)
      onSuccess?.('batch_like', 0)
      toast.success('Likes updated successfully')
    } catch (err: any) {
      const errorMessage = err.normalizedError?.message || err.message || 'Failed to update likes'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [onSuccess, toast])
  
  // ✅ Fix: Use useEffect instead of useState for cleanup
  useEffect(() => {
    return () => {
      debounceRef.current.forEach((timeout) => {
        clearTimeout(timeout)
      })
      debounceRef.current.clear()
      pendingActionsRef.current.clear()
    }
  }, [])
  
  return {
    toggleLike,
    deletePost: deletePostHandler,
    loading,
    loadingPostId,
    batchToggleLike,
    clearError,
  }
}