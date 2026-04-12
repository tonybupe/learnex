// hooks/useComments.ts
import { useEffect, useState, useCallback, useRef } from "react"
import { getComments, postComment, deleteComment } from "../api/posts.api"
import type { Comment, PaginatedResponse } from "../types/post.types"
import { useToast } from "@/features/posts/hooks/useToast" // Fixed import path

interface UseCommentsOptions {
  initialPage?: number
  initialLimit?: number
  autoLoad?: boolean
  enablePolling?: boolean
  pollingInterval?: number
}

interface UseCommentsReturn {
  comments: Comment[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  page: number
  total: number
  addComment: (content: string) => Promise<boolean>
  deleteComment: (commentId: number) => Promise<boolean>
  reload: () => Promise<void>
  loadMore: () => Promise<void>
  updateComment: (commentId: number, updatedComment: Comment) => void
}

export function useComments(
  postId: number,
  options: UseCommentsOptions = {}
): UseCommentsReturn {
  const {
    initialPage = 1,
    initialLimit = 20,
    autoLoad = true,
    enablePolling = false,
    pollingInterval = 30000,
  } = options

  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(initialPage)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const currentRequestRef = useRef<AbortController | null>(null)
  const pendingCommentsRef = useRef<Map<number, boolean>>(new Map())
  const isMountedRef = useRef(true)
  const initialLoadDoneRef = useRef(false) 
  
  const toast = useToast()
  
  // ✅ Set mounted flag
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      initialLoadDoneRef.current = false
      isMountedRef.current = false
    }
  }, [])
  
  // Reset state when postId changes
  const resetState = useCallback(() => {
    if (!isMountedRef.current) return
    setComments([])
    setPage(initialPage)
    setHasMore(true)
    setTotal(0)
    setError(null)
  }, [initialPage])
  
  // Load comments
  const loadComments = useCallback(async (pageToLoad: number, isLoadMore = false) => {
    // Cancel previous request
    if (currentRequestRef.current) {
      currentRequestRef.current.abort()
    }
    
    const controller = new AbortController()
    currentRequestRef.current = controller
    
    try {
      if (!isLoadMore) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)
      
      const response: PaginatedResponse<Comment> = await getComments(postId, {
        page: pageToLoad,
        limit: initialLimit,
      })
      
      if (controller.signal.aborted || !isMountedRef.current) return
      
      setComments(prev => isLoadMore ? [...prev, ...response.data] : response.data)
      setTotal(response.metadata.total)
      setHasMore(response.metadata.has_next_page)
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return
      }
      
      if (!isMountedRef.current) return
      
      const errorMessage = err.normalizedError?.message || err.message || 'Failed to load comments'
      setError(errorMessage)
      
      // ✅ Don't show toast for circuit breaker errors to avoid spam
      if (!errorMessage.includes('temporarily unavailable')) {
        toast.error(errorMessage)
      }
    } finally {
      if (!controller.signal.aborted && isMountedRef.current) {
        if (!isLoadMore) {
          setLoading(false)
        } else {
          setLoadingMore(false)
        }
      }
      if (currentRequestRef.current === controller) {
        currentRequestRef.current = null
      }
    }
  }, [postId, initialLimit, toast])
  
  // Reload comments (reset to first page)
  const reload = useCallback(async () => {
    if (!isMountedRef.current) return
    resetState()
    await loadComments(initialPage, false)
  }, [resetState, loadComments, initialPage])
  
  // Load more comments (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return
    const nextPage = page + 1
    setPage(nextPage)
    await loadComments(nextPage, true)
  }, [loadingMore, hasMore, loading, page, loadComments])
  
  // Add comment with optimistic update
  const addComment = useCallback(async (content: string): Promise<boolean> => {
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      toast.warning('Comment cannot be empty')
      return false
    }
    
    // Prevent duplicate submissions
    const pendingKey = Date.now()
    if (pendingCommentsRef.current.get(pendingKey)) {
      return false
    }
    
    pendingCommentsRef.current.set(pendingKey, true)
    
    // Get current user for optimistic comment
    const currentUser = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.user
    
    // Create optimistic comment with temporary ID
    const tempComment: Comment = {
      id: Date.now() * -1,
      post_id: postId,
      author_id: currentUser?.id || 0,
      content: trimmedContent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: currentUser?.id || 0,
        full_name: currentUser?.full_name || "You",
        role: currentUser?.role || "learner",
        profile: {
          avatar_url: currentUser?.profile?.avatar_url || null,
        },
      },
    }
    
    // Add optimistic comment to UI immediately
    setComments(prev => [tempComment, ...prev])
    setTotal(prev => prev + 1)
    
    try {
      // Make API call
      const saved = await postComment(postId, trimmedContent)
      
      // Replace optimistic comment with real one
      setComments(prev => 
        prev.map(comment => 
          comment.id === tempComment.id ? saved : comment
        )
      )
      
      toast.success('Comment added', { duration: 2000 })
      return true
    } catch (err: any) {
      // Rollback optimistic update
      setComments(prev => prev.filter(comment => comment.id !== tempComment.id))
      setTotal(prev => prev - 1)
      
      const errorMessage = err.normalizedError?.message || err.message || 'Failed to add comment'
      setError(errorMessage)
      toast.error(errorMessage)
      
      return false
    } finally {
      pendingCommentsRef.current.delete(pendingKey)
    }
  }, [postId, toast])
  
  // Delete comment
  const deleteCommentHandler = useCallback(async (commentId: number): Promise<boolean> => {
    // Store the comment for potential rollback
    const deletedComment = comments.find(c => c.id === commentId)
    if (!deletedComment) return false
    
    // Prevent double deletion
    if (pendingCommentsRef.current.get(commentId)) {
      return false
    }
    
    pendingCommentsRef.current.set(commentId, true)
    
    // Optimistic removal
    setComments(prev => prev.filter(comment => comment.id !== commentId))
    setTotal(prev => prev - 1)
    
    try {
      await deleteComment(postId, commentId)
      
      toast.success('Comment deleted', { duration: 2000 })
      return true
    } catch (err: any) {
      // Rollback optimistic removal
      setComments(prev => [...prev, deletedComment].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
      setTotal(prev => prev + 1)
      
      const errorMessage = err.normalizedError?.message || err.message || 'Failed to delete comment'
      setError(errorMessage)
      toast.error(errorMessage)
      
      return false
    } finally {
      pendingCommentsRef.current.delete(commentId)
    }
  }, [postId, comments, toast])
  
  // Update comment (for editing)
  const updateComment = useCallback((commentId: number, updatedComment: Comment) => {
    setComments(prev => 
      prev.map(comment => 
        comment.id === commentId ? updatedComment : comment
      )
    )
  }, [])
  
  // Setup polling for real-time updates
  useEffect(() => {
    if (!enablePolling) return
    
    pollingRef.current = setInterval(() => {
      if (!loading && !loadingMore && isMountedRef.current) {
        loadComments(initialPage, false)
      }
    }, pollingInterval)
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [enablePolling, pollingInterval, loading, loadingMore, loadComments, initialPage])
  
  // ✅ FIX: Initial load - only once with proper cleanup
  useEffect(() => {
    if (autoLoad && postId && !initialLoadDoneRef.current && isMountedRef.current) {
      initialLoadDoneRef.current = true
      reload()
    }
    
    return () => {
      // Cancel any ongoing request on unmount
      if (currentRequestRef.current) {
        currentRequestRef.current.abort()
      }
      // Clear polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [autoLoad, postId, reload]) 
  
  return {
    comments,
    loading,
    loadingMore,
    error,
    hasMore,
    page,
    total,
    addComment,
    deleteComment: deleteCommentHandler,
    reload,
    loadMore,
    updateComment,
  }
}
