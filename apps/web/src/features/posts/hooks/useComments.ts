import { useEffect, useState, useCallback } from "react"
import { getComments, postComment, deleteComment } from "../api/posts.api"
import type { Comment } from "../types/post.types"

interface UseCommentsReturn {
  comments: Comment[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadingMore: boolean
  total: number
  page: number
  addComment: (content: string) => Promise<boolean>
  deleteComment: (commentId: number) => Promise<boolean>
  reload: () => Promise<void>
  loadMore: () => Promise<void>
  updateComment: (id: number, c: Comment) => void
}

export function useComments(
  postId: number,
  options: { initialLimit?: number; autoLoad?: boolean } = {}
): UseCommentsReturn {
  const { initialLimit = 20, autoLoad = true } = options

  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const fetchComments = useCallback(async (pageNum: number, append = false) => {
    try {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)

      const result = await getComments(postId, { page: pageNum, limit: initialLimit })
      const data = result.data ?? []

      if (append) {
        setComments(prev => [...prev, ...data])
      } else {
        setComments(data)
      }
      setTotal(result.metadata?.total ?? data.length)
      setHasMore(result.metadata?.has_next_page ?? false)
    } catch (err: any) {
      setError(err?.message ?? "Failed to load comments")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [postId, initialLimit])

  useEffect(() => {
    if (autoLoad && postId) {
      setPage(1)
      fetchComments(1, false)
    }
  }, [postId, autoLoad])

  const reload = useCallback(async () => {
    setPage(1)
    await fetchComments(1, false)
  }, [fetchComments])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    const next = page + 1
    setPage(next)
    await fetchComments(next, true)
  }, [loadingMore, hasMore, page, fetchComments])

  const addComment = useCallback(async (content: string): Promise<boolean> => {
    try {
      const saved = await postComment(postId, content)
      setComments(prev => [saved, ...prev])
      setTotal(prev => prev + 1)
      return true
    } catch (err: any) {
      return false
    }
  }, [postId])

  const deleteCommentFn = useCallback(async (commentId: number): Promise<boolean> => {
    try {
      await deleteComment(postId, commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      setTotal(prev => Math.max(0, prev - 1))
      return true
    } catch {
      return false
    }
  }, [postId])

  const updateComment = useCallback((id: number, updated: Comment) => {
    setComments(prev => prev.map(c => c.id === id ? updated : c))
  }, [])

  return {
    comments, loading, error, hasMore, loadingMore,
    total, page, addComment, deleteComment: deleteCommentFn,
    reload, loadMore, updateComment,
  }
}