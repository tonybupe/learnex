// api/posts.api.ts
import { api } from "@/api/client"
import type { 
  Post, 
  Comment, 
  FeedFilters, 
  PaginatedResponse,
  CreatePostPayload,
  UpdatePostPayload,
  FeedQueryParams,
  ReactionType,
  UploadMediaResponse,
  ApiError
} from "../types/post.types"
import { 
  transformPost, 
  transformComment, 
  transformPaginatedResponse,
  transformApiError
} from "../types/post.transformers"
import { handleApiError, isApiError } from "@/utils/error-handling"

// =========================================
// CONSTANTS
// =========================================

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const DEFAULT_SORT = 'latest'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// =========================================
// RE-EXPORT TYPES
// =========================================

export type { 
  CreatePostPayload, 
  UpdatePostPayload, 
  FeedQueryParams, 
  ReactionType,
  UploadMediaResponse
}

// =========================================
// CACHE MANAGEMENT
// =========================================

interface CacheEntry<T> {
  data: T
  timestamp: number
}

class PostCache {
  private cache = new Map<number, CacheEntry<Post>>()
  private ttl: number

  constructor(ttl: number = CACHE_TTL) {
    this.ttl = ttl
  }

  get(postId: number): Post | null {
    const entry = this.cache.get(postId)
    if (!entry) return null
    
    const isExpired = Date.now() - entry.timestamp > this.ttl
    if (isExpired) {
      this.cache.delete(postId)
      return null
    }
    
    return entry.data
  }

  set(postId: number, data: Post): void {
    this.cache.set(postId, { data, timestamp: Date.now() })
  }

  delete(postId?: number): void {
    if (postId) {
      this.cache.delete(postId)
    } else {
      this.cache.clear()
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

const postCache = new PostCache()

// =========================================
// POSTS API
// =========================================

/**
 * Get paginated feed with filters
 */
export async function getFeed(
  params?: FeedQueryParams
): Promise<PaginatedResponse<Post>> {
  try {
    console.log('[API] 🔵 getFeed CALLED with params:', params)
    
    const response = await api.get("/posts/feed", {
      params: {
        page: params?.page ?? DEFAULT_PAGE,
        limit: params?.limit ?? DEFAULT_LIMIT,
        sort_by: params?.sort_by ?? DEFAULT_SORT,
        class_id: params?.class_id,
        subject_id: params?.subject_id,
        user_id: params?.user_id,
      },
    })
    
    console.log('[API] 🟢 getFeed SUCCESS')
    console.log('[API] 🟢 Response status:', response.status)
    console.log('[API] 🟢 Response data type:', typeof response.data)
    console.log('[API] 🟢 Is response.data an array?', Array.isArray(response.data))
    console.log('[API] 🟢 Response data keys:', response.data ? Object.keys(response.data) : 'null')
    console.log('[API] 🟢 Response data sample:', JSON.stringify(response.data).substring(0, 500))
    
    const transformed = transformPaginatedResponse(response.data, transformPost)
    console.log('[API] 🟢 Transformed data length:', transformed.data.length)
    console.log('[API] 🟢 Transformed first item:', transformed.data[0])
    
    return transformed
  } catch (error) {
    console.error('[API] 🔴 getFeed ERROR:', error)
    const apiError = handleApiError(error, 'Failed to load feed')
    throw transformApiError(apiError)
  }
}

/**
 * Get all posts (with pagination)
 */
export async function getPosts(
  params?: Omit<FeedQueryParams, 'sort_by'>
): Promise<PaginatedResponse<Post>> {
  try {
    const response = await api.get("/posts", {
      params: {
        page: params?.page ?? DEFAULT_PAGE,
        limit: params?.limit ?? DEFAULT_LIMIT,
        class_id: params?.class_id,
        subject_id: params?.subject_id,
        user_id: params?.user_id,
      },
    })
    
    return transformPaginatedResponse(response.data, transformPost)
  } catch (error) {
    const apiError = handleApiError(error, 'Failed to load posts')
    throw transformApiError(apiError)
  }
}

/**
 * Get single post by ID
 */
export async function getPost(postId: number): Promise<Post> {
  if (!postId || postId <= 0) {
    throw new Error('Invalid post ID')
  }

  try {
    const response = await api.get(`/posts/${postId}`)
    return transformPost(response.data)
  } catch (error) {
    const apiError = handleApiError(error, 'Failed to load post')
    throw transformApiError(apiError)
  }
}

// =========================================
// CREATE / UPDATE / DELETE
// =========================================

/**
 * Create new post
 */
export async function createPost(payload: CreatePostPayload): Promise<Post> {
  if (!payload.content?.trim() && !payload.attachments?.length) {
    throw new Error('Post must have content or attachments')
  }

  try {
    const response = await api.post("/posts", {
      content: payload.content.trim(),
      class_id: payload.class_id ?? null,
      subject_id: payload.subject_id ?? null,
      post_type: payload.post_type ?? 'text',
      visibility: payload.visibility ?? 'public',
      title: payload.title?.trim() ?? null,
      status: payload.status ?? 'published',
      attachments: payload.attachments?.map(att => ({
        file_url: att.file_url,
        attachment_type: att.attachment_type ?? 'file',
        file_name: att.file_name?.trim(),
        mime_type: att.mime_type,
      })),
    })
    
    const post = transformPost(response.data)
    
    // Cache the new post
    postCache.set(post.id, post)
    
    return post
  } catch (error) {
    const apiError = handleApiError(error, 'Failed to create post')
    throw transformApiError(apiError)
  }
}

/**
 * Update existing post
 */
export async function updatePost(payload: UpdatePostPayload): Promise<Post> {
  if (!payload.id || payload.id <= 0) {
    throw new Error('Invalid post ID')
  }

  try {
    const { id, ...updateData } = payload
    const response = await api.patch(`/posts/${id}`, updateData)
    
    const post = transformPost(response.data)
    
    // Update cache
    postCache.set(id, post)
    
    return post
  } catch (error) {
    const apiError = handleApiError(error, 'Failed to update post')
    throw transformApiError(apiError)
  }
}

/**
 * Delete post
 */
export async function deletePost(postId: number): Promise<void> {
  if (!postId || postId <= 0) {
    throw new Error('Invalid post ID')
  }

  try {
    await api.delete(`/posts/${postId}`)
    
    // Remove from cache
    postCache.delete(postId)
  } catch (error) {
    const apiError = handleApiError(error, 'Failed to delete post')
    throw transformApiError(apiError)
  }
}

// =========================================
// MEDIA UPLOAD
// =========================================

/**
 * Upload media file
 */
export async function uploadMedia(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadMediaResponse> {
  if (!file) {
    throw new Error('No file provided')
  }

  // Validate file size (10MB for images, 50MB for videos)
  const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error(`File too large. Max ${maxSize / (1024 * 1024)}MB`)
  }

  try {
    const formData = new FormData()
    formData.append("file", file)

    const response = await api.post("/posts/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(percentCompleted)
        }
      },
    })

    // Determine attachment type from file
    let attachmentType: 'image' | 'video' | 'file' = 'file'
    if (file.type.startsWith('image/')) {
      attachmentType = 'image'
    } else if (file.type.startsWith('video/')) {
      attachmentType = 'video'
    }

    return {
      url: response.data.url,
      file_id: response.data.file_id,
      attachment_type: response.data.attachment_type || attachmentType,
      file_name: response.data.file_name || file.name,
      mime_type: response.data.mime_type || file.type,
    }
  } catch (error) {
    const apiError = handleApiError(error, 'Failed to upload media')
    throw transformApiError(apiError)
  }
}

/**
 * Upload multiple media files
 */
export async function uploadMultipleMedia(
  files: File[],
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<UploadMediaResponse[]> {
  if (!files?.length) {
    return []
  }

  const uploadPromises = files.map(async (file, index) => {
    return uploadMedia(file, (progress) => {
      onProgress?.(index, progress)
    })
  })
  
  return Promise.all(uploadPromises)
}



// =========================================
// REACTIONS
// =========================================

/**
 * React to post
 */
export async function reactToPost(
  postId: number,
  reactionType: ReactionType = 'like'
): Promise<void> {
  if (!postId || postId <= 0) {
    throw new Error('Invalid post ID')
  }

  try {
    await api.post(`/posts/${postId}/reactions`, {
      reaction_type: reactionType,
    })
    
    // Invalidate cache for this post
    postCache.delete(postId)
  } catch (error) {
    const apiError = handleApiError(error, 'Failed to add reaction')
    throw transformApiError(apiError)
  }
}

/**
 * Remove reaction from post
 */
export async function removeReaction(postId: number): Promise<void> {
  if (!postId || postId <= 0) {
    throw new Error('Invalid post ID')
  }

  try {
    await api.delete(`/posts/${postId}/reactions`)
    
    // Invalidate cache for this post
    postCache.delete(postId)
  } catch (error) {
    const apiError = handleApiError(error, 'Failed to remove reaction')
    throw transformApiError(apiError)
  }
}

/**
 * Toggle reaction (like/unlike)
 */
export async function toggleReaction(
  postId: number,
  isLiked: boolean
): Promise<void> {
  if (isLiked) {
    await removeReaction(postId)
  } else {
    await reactToPost(postId)
  }
}

// =========================================
// COMMENTS
// =========================================

/**
 * Get comments for a post
 */
export async function getComments(
  postId: number,
  params?: { page?: number; limit?: number }
): Promise<PaginatedResponse<Comment>> {
  if (!postId || postId <= 0) {
    throw new Error('Invalid post ID')
  }

  try {
    const response = await api.get(`/posts/${postId}/comments`, {
      params: {
        page: params?.page ?? DEFAULT_PAGE,
        limit: params?.limit ?? DEFAULT_LIMIT,
      },
    })
    // API returns plain array
    const raw = Array.isArray(response.data) ? response.data : (response.data?.data ?? [])
    const data = raw.map((c: any) => transformComment(c))
    return {
      data,
      metadata: { page: params?.page ?? 1, limit: params?.limit ?? 20, total: data.length, total_pages: 1, has_next_page: false, prev_page: null },
    }
  } catch (error) {
    const apiError = handleApiError(error, "Failed to load comments")
    throw transformApiError(apiError)
  }
}

export async function postComment(
  postId: number,
  content: string
): Promise<Comment> {
  if (!postId || postId <= 0) {
    throw new Error('Invalid post ID')
  }
  
  const trimmedContent = content?.trim()
  if (!trimmedContent) {
    throw new Error('Comment cannot be empty')
  }

  try {
    const response = await api.post(`/posts/${postId}/comments`, {
      content: trimmedContent,
    })
    
    const comment = transformComment(response.data)
    
    // Invalidate cache for this post (comments count changed)
    postCache.delete(postId)
    
    return comment
  } catch (error) {
    const apiError = handleApiError(error, 'Failed to post comment')
    throw transformApiError(apiError)
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(
  postId: number,
  commentId: number
): Promise<void> {
  if (!postId || postId <= 0) {
    throw new Error('Invalid post ID')
  }
  if (!commentId || commentId <= 0) {
    throw new Error('Invalid comment ID')
  }

  try {
    await api.delete(`/posts/${postId}/comments/${commentId}`)
    
    // Invalidate cache for this post (comments count changed)
    postCache.delete(postId)
  } catch (error) {
    const apiError = handleApiError(error, 'Failed to delete comment')
    throw transformApiError(apiError)
  }
}

// =========================================
// BATCH OPERATIONS
// =========================================

/**
 * Batch fetch posts by IDs
 */
export async function getPostsByIds(ids: number[]): Promise<Post[]> {
  if (!ids?.length) {
    return []
  }

  try {
    const promises = ids.map(id => getPost(id))
    const posts = await Promise.all(promises)
    return posts
  } catch (error) {
    const apiError = handleApiError(error, 'Failed to fetch posts')
    throw transformApiError(apiError)
  }
}

/**
 * Batch toggle likes
 */
export async function batchToggleLikes(
  posts: Array<{ id: number; isLiked: boolean }>
): Promise<void> {
  if (!posts?.length) {
    return
  }

  try {
    const promises = posts.map(({ id, isLiked }) => toggleReaction(id, isLiked))
    await Promise.all(promises)
  } catch (error) {
    const apiError = handleApiError(error, 'Failed to update likes')
    throw transformApiError(apiError)
  }
}

// =========================================
// UTILITIES
// =========================================

/**
 * Create AbortController for request cancellation
 */
export function createCancelToken() {
  const controller = new AbortController()
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  }
}

/**
 * Get post with caching
 */
export async function getPostWithCache(postId: number): Promise<Post> {
  const cached = postCache.get(postId)
  if (cached) {
    return cached
  }
  
  const post = await getPost(postId)
  postCache.set(postId, post)
  return post
}

/**
 * Clear post cache
 */
export function clearPostCache(postId?: number): void {
  postCache.delete(postId)
}

/**
 * Invalidate cache for a post
 */
export function invalidatePost(postId: number): void {
  postCache.delete(postId)
}

// =========================================
// EXPORTS
// =========================================

export default {
  getFeed,
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  uploadMedia,
  uploadMultipleMedia,
  reactToPost,
  removeReaction,
  toggleReaction,
  getComments,
  postComment,
  deleteComment,
  getPostsByIds,
  batchToggleLikes,
  createCancelToken,
  getPostWithCache,
  clearPostCache,
  invalidatePost,
}


// =========================================
// FEED BY MODE
// =========================================

import type { Post } from "../types/post.types"

export async function getFeedByMode(
  mode: "latest" | "popular" | "following" | "trending" | "classes",
  page = 1,
  limit = 20
): Promise<Post[]> {
  try {
    const res = await api.get(/feed/ + mode, { params: { page, limit } })
    const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
    return raw.map(transformPost)
  } catch (error) {
    const apiError = handleApiError(error, Failed to load feed)
    throw transformApiError(apiError)
  }
}