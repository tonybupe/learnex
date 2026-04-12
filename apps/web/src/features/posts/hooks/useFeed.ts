// hooks/useFeed.ts
import { useEffect, useState, useCallback, useRef } from "react"
import { getFeed, type FeedQueryParams } from "../api/posts.api"
import type { Post, PaginatedResponse } from "../types/post.types"
import { useToast } from "@/features/posts/hooks/useToast" 

interface UseFeedOptions {
  initialPage?: number
  initialLimit?: number
  sortBy?: 'latest' | 'popular' | 'following'
  autoLoad?: boolean
  enablePolling?: boolean
  pollingInterval?: number
  debounceMs?: number
}

interface UseFeedReturn {
  posts: Post[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  page: number
  total: number
  reload: () => Promise<void>
  loadMore: () => Promise<void>
  addPost: (post: Post) => void
  updatePost: (postId: number, updatedPost: Post) => void
  removePost: (postId: number) => void
  setSortBy: (sort: 'latest' | 'popular' | 'following') => void
}

export function useFeed(options: UseFeedOptions = {}): UseFeedReturn {
  const {
    initialPage = 1,
    initialLimit = 20,
    sortBy = 'latest',
    autoLoad = true,
    enablePolling = false,
    pollingInterval = 30000,
    debounceMs = 300,
  } = options

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(initialPage)
  const [total, setTotal] = useState(0)
  const [currentSortBy, setCurrentSortBy] = useState(sortBy)
  const [hasMore, setHasMore] = useState(true)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const currentRequestRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingRef = useRef(false)
  const initialLoadDoneRef = useRef(false)

  const toast = useToast()

  // Monitor posts changes for debugging
  useEffect(() => {
    console.log('[useFeed] POSTS UPDATED:', posts.length, 'posts')
    if (posts.length > 0) {
      console.log('[useFeed] First post:', posts[0].id, posts[0].content?.substring(0, 50))
    }
  }, [posts])

  // Set mounted flag
  useEffect(() => {
    isMountedRef.current = true
    console.log('[useFeed] Component mounted')
    return () => {
      console.log('[useFeed] Component unmounting')
      initialLoadDoneRef.current = false
      isMountedRef.current = false
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (currentRequestRef.current) {
        currentRequestRef.current.abort()
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  // Reset state when sort changes
  const resetState = useCallback(() => {
    if (!isMountedRef.current) return
    console.log('[useFeed] Resetting state')
    setPosts([])
    setPage(initialPage)
    setHasMore(true)
    setTotal(0)
    setError(null)
  }, [initialPage])

  // Load feed with current params
  const loadFeed = useCallback(async (pageToLoad: number, isLoadMore = false) => {
    console.log(`[useFeed] loadFeed: page=${pageToLoad}, isLoadMore=${isLoadMore}`)
    
    // Prevent concurrent loads
    if (isLoadingRef.current) {
      console.log('[useFeed] Already loading, skipping')
      return
    }
    
    // Cancel previous request if exists
    if (currentRequestRef.current) {
      console.log('[useFeed] Cancelling previous request')
      currentRequestRef.current.abort()
    }

    isLoadingRef.current = true
    const controller = new AbortController()
    currentRequestRef.current = controller

    try {
      if (!isLoadMore) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      const params: FeedQueryParams = {
        page: pageToLoad,
        limit: initialLimit,
        sort_by: currentSortBy,
      }

      console.log('[useFeed] Fetching feed...')
      const response: PaginatedResponse<Post> = await getFeed(params)
      
      // Check if request was aborted or component unmounted
      if (controller.signal.aborted || !isMountedRef.current) {
        console.log('[useFeed] Request aborted or component unmounted')
        return
      }

      console.log('[useFeed] Response received:', {
        dataLength: response.data?.length,
        total: response.metadata?.total
      })

      // Update state
      if (response.data) {
        if (isLoadMore) {
          setPosts(prev => {
            const ids = new Set(prev.map((p: any) => p.id))
            const fresh = response.data.filter((p: any) => !ids.has(p.id))
            return [...prev, ...fresh]
          })
        } else {
          setPosts(response.data)
          console.log('[useFeed] Setting posts, count:', response.data.length)
        }
        setTotal(response.metadata.total)
        setHasMore(response.metadata.has_next_page)
      }

      return response
    } catch (err: any) {
      console.error('[useFeed] Error:', err)
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        console.log('[useFeed] Request cancelled')
        return
      }
      
      if (!isMountedRef.current) return
      
      const errorMessage = err.normalizedError?.message || err.message || 'Failed to load feed'
      setError(errorMessage)
      toast.error(errorMessage)
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
      isLoadingRef.current = false
    }
  }, [currentSortBy, initialLimit, toast]) // ✅ REMOVED posts.length from dependencies

  // Debounced load function
  const debouncedLoadFeed = useCallback((pageToLoad: number, isLoadMore = false) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      loadFeed(pageToLoad, isLoadMore)
      debounceTimeoutRef.current = null
    }, debounceMs)
  }, [loadFeed, debounceMs])

  // Initial load or reload
  const reload = useCallback(async () => {
    console.log('[useFeed] Reload triggered')
    if (!isMountedRef.current) return
    resetState()
    await debouncedLoadFeed(initialPage, false)
  }, [resetState, debouncedLoadFeed, initialPage])

  // Load more posts (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading || isLoadingRef.current) return
    const nextPage = page + 1
    console.log(`[useFeed] Loading more: page ${nextPage}`)
    setPage(nextPage)
    await loadFeed(nextPage, true)
  }, [loadingMore, hasMore, loading, page, loadFeed])

  // Add new post to the beginning of feed
  const addPost = useCallback((post: Post) => {
    console.log('[useFeed] Adding new post:', post.id)
    setPosts(prev => [post, ...prev.filter((p: any) => p.id !== post.id)])
    setTotal(prev => prev + 1)
  }, [])

  // Update existing post
  const updatePost = useCallback((postId: number, updatedPost: Post) => {
    console.log('[useFeed] Updating post:', postId)
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, ...updatedPost } : post
    ))
  }, [])

  // Remove post from feed
  const removePost = useCallback((postId: number) => {
    console.log('[useFeed] Removing post:', postId)
    setPosts(prev => prev.filter(post => post.id !== postId))
    setTotal(prev => prev - 1)
  }, [])

  // Change sorting
  const setSortBy = useCallback((sort: 'latest' | 'popular' | 'following') => {
    if (sort === currentSortBy) return
    console.log('[useFeed] Changing sort to:', sort)
    setCurrentSortBy(sort)
    resetState()
  }, [currentSortBy, resetState])

  // Effect for loading when sort changes
  useEffect(() => {
    if (autoLoad && currentSortBy && isMountedRef.current && !initialLoadDoneRef.current) {
      console.log('[useFeed] Loading initial feed')
      initialLoadDoneRef.current = true
      debouncedLoadFeed(initialPage, false)
    }
  }, [currentSortBy, autoLoad, initialPage, debouncedLoadFeed])

  // Setup polling
  useEffect(() => {
    if (!enablePolling) return
    
    pollingRef.current = setInterval(() => {
      if (!loading && !loadingMore && !isLoadingRef.current && isMountedRef.current) {
        console.log('[useFeed] Polling refresh')
        loadFeed(initialPage, false)
      }
    }, pollingInterval)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [enablePolling, pollingInterval, loading, loadingMore, loadFeed, initialPage])

  // Initial load - ONLY ONCE
  useEffect(() => {
    if (autoLoad && !initialLoadDoneRef.current && isMountedRef.current) {
      console.log('[useFeed] Initial load triggered')
      initialLoadDoneRef.current = true
      reload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad])

  return {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    page,
    total,
    reload,
    loadMore,
    addPost,
    updatePost,
    removePost,
    setSortBy,
  }
}
