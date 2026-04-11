// types/post.transformers.ts
import { 
  Post, 
  Comment, 
  PostAttachment, 
  UserMini, 
  ApiError,
  AttachmentType,
  PostType,
  PostVisibility,
  PostStatus,
  ReactionType
} from './post.types'

// =========================================
// UTILITY FUNCTIONS
// =========================================

function safeString(value: any, defaultValue: string = ''): string {
  return value && typeof value === 'string' ? value : defaultValue
}

function safeNumber(value: any, defaultValue: number = 0): number {
  return value && typeof value === 'number' ? value : defaultValue
}

function safeBoolean(value: any, defaultValue: boolean = false): boolean {
  return value !== undefined && value !== null ? Boolean(value) : defaultValue
}

function safeDate(value: any): string {
  return value && typeof value === 'string' ? value : new Date().toISOString()
}

// =========================================
// USER TRANSFORMER
// =========================================

/**
 * Transform backend user response to frontend UserMini type
 */
export function transformUser(backendUser: any): UserMini {
  if (!backendUser) {
    throw new Error('transformUser: backendUser is required')
  }

  return {
    id: safeNumber(backendUser.id),
    full_name: safeString(backendUser.full_name, 'Unknown User'),
    role: (backendUser.role as 'admin' | 'teacher' | 'learner') || 'learner',
    email: safeString(backendUser.email),
    profile: backendUser.profile ? {
      avatar_url: safeString(backendUser.profile.avatar_url),
      bio: safeString(backendUser.profile.bio),
      location: safeString(backendUser.profile.location),
      website: safeString(backendUser.profile.website)
    } : undefined
  }
}

// =========================================
// ATTACHMENT TRANSFORMER
// =========================================

/**
 * Transform backend attachment response to frontend PostAttachment type
 */
export function transformAttachment(backendAttachment: any): PostAttachment {
  if (!backendAttachment) {
    throw new Error('transformAttachment: backendAttachment is required')
  }

  // Determine attachment type
  let attachmentType: AttachmentType = 'file'
  if (backendAttachment.attachment_type) {
    attachmentType = backendAttachment.attachment_type as AttachmentType
  } else if (backendAttachment.mime_type) {
    if (backendAttachment.mime_type.startsWith('image/')) {
      attachmentType = 'image'
    } else if (backendAttachment.mime_type.startsWith('video/')) {
      attachmentType = 'video'
    }
  }

  return {
    id: safeNumber(backendAttachment.id),
    media_file_id: backendAttachment.media_file_id ? safeNumber(backendAttachment.media_file_id) : undefined,
    attachment_type: attachmentType,
    file_url: safeString(backendAttachment.file_url),
    file_name: backendAttachment.file_name ? safeString(backendAttachment.file_name) : undefined,
    mime_type: backendAttachment.mime_type ? safeString(backendAttachment.mime_type) : undefined,
    created_at: safeDate(backendAttachment.created_at),
    updated_at: safeDate(backendAttachment.updated_at),
    thumbnail: backendAttachment.thumbnail ? safeString(backendAttachment.thumbnail) : safeString(backendAttachment.file_url),
    duration: backendAttachment.duration ? safeNumber(backendAttachment.duration) : undefined,
    size: backendAttachment.size ? safeNumber(backendAttachment.size) : undefined
  }
}

// =========================================
// POST TRANSFORMER
// =========================================

/**
 * Transform backend post response to frontend Post type
 */
export function transformPost(backendPost: any): Post {
  if (!backendPost) {
    throw new Error('transformPost: backendPost is required')
  }

  return {
    id: safeNumber(backendPost.id),
    post_type: (backendPost.post_type as PostType) || 'text',
    visibility: (backendPost.visibility as PostVisibility) || 'public',
    title: backendPost.title ? safeString(backendPost.title) : null,
    content: safeString(backendPost.content),
    status: (backendPost.status as PostStatus) || 'published',
    
    author: transformUser(backendPost.author),
    classroom: backendPost.classroom ? {
      id: safeNumber(backendPost.classroom.id),
      title: safeString(backendPost.classroom.title),
      class_code: safeString(backendPost.classroom.class_code),
      grade_level: backendPost.classroom.grade_level ? safeString(backendPost.classroom.grade_level) : undefined
    } : undefined,
    subject: backendPost.subject ? {
      id: safeNumber(backendPost.subject.id),
      name: safeString(backendPost.subject.name),
      code: safeString(backendPost.subject.code)
    } : undefined,
    
    attachments: Array.isArray(backendPost.attachments) 
      ? backendPost.attachments.map(transformAttachment)
      : [],
    
    reactions_count: safeNumber(backendPost.reactions_count),
    comments_count: safeNumber(backendPost.comments_count),
    saves_count: safeNumber(backendPost.saves_count),
    
    is_liked: safeBoolean(backendPost.is_liked),
    is_saved: safeBoolean(backendPost.is_saved),
    user_reaction: backendPost.user_reaction ? (backendPost.user_reaction as ReactionType) : null,
    
    created_at: safeDate(backendPost.created_at),
    updated_at: safeDate(backendPost.updated_at)
  }
}

// =========================================
// COMMENT TRANSFORMER
// =========================================

/**
 * Transform backend comment response to frontend Comment type
 */
export function transformComment(backendComment: any): Comment {
  if (!backendComment) {
    throw new Error('transformComment: backendComment is required')
  }

  return {
    id: safeNumber(backendComment.id),
    post_id: safeNumber(backendComment.post_id),
    author_id: safeNumber(backendComment.author_id),
    content: safeString(backendComment.content),
    author: transformUser(backendComment.author),
    likes_count: safeNumber(backendComment.likes_count),
    is_liked: safeBoolean(backendComment.is_liked),
    created_at: safeDate(backendComment.created_at),
    updated_at: safeDate(backendComment.updated_at)
  }
}

// =========================================
// PAGINATED RESPONSE TRANSFORMER
// =========================================

interface PaginatedResponseMetadata {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next_page: boolean
  has_prev_page: boolean
  next_page: number | null
  prev_page: number | null
}

interface TransformResult<T> {
  data: T[]
  metadata: PaginatedResponseMetadata
}

/**
 * Transform backend paginated response to frontend format
 * Supports multiple backend response formats:
 * - { data: [], metadata: {} }
 * - { items: [], total: number, page: number, size: number }
 * - { results: [], count: number, next: string, previous: string }
 */
export function transformPaginatedResponse<T>(
  response: any,
  transformer: (item: any) => T
): TransformResult<T> {
  if (!response) {
    console.warn('transformPaginatedResponse: Empty response received')
    return {
      data: [],
      metadata: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0,
        has_next_page: false,
        has_prev_page: false,
        next_page: null,
        prev_page: null
      }
    }
  }

  let data: any[] = []
  let metadata: Partial<PaginatedResponseMetadata> = {}

  // Format 1: { data: [], metadata: {} }
  if (Array.isArray(response.data) && response.metadata) {
    data = response.data
    metadata = {
      page: safeNumber(response.metadata.page, 1),
      limit: safeNumber(response.metadata.limit, 20),
      total: safeNumber(response.metadata.total),
      total_pages: safeNumber(response.metadata.total_pages),
      has_next_page: safeBoolean(response.metadata.has_next_page),
      has_prev_page: safeBoolean(response.metadata.has_prev_page),
      next_page: response.metadata.next_page ? safeNumber(response.metadata.next_page) : null,
      prev_page: response.metadata.prev_page ? safeNumber(response.metadata.prev_page) : null
    }
  }
  // Format 2: { items: [], total: number, page: number, size: number }
  else if (Array.isArray(response.items)) {
    data = response.items
    const page = safeNumber(response.page, 1)
    const limit = safeNumber(response.size, 20)
    const total = safeNumber(response.total)
    const totalPages = Math.ceil(total / limit)
    metadata = {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next_page: page < totalPages,
      has_prev_page: page > 1,
      next_page: page < totalPages ? page + 1 : null,
      prev_page: page > 1 ? page - 1 : null
    }
  }
  // Format 3: { results: [], count: number, next: string, previous: string }
  else if (Array.isArray(response.results)) {
    data = response.results
    const page = 1 // FastAPI-style pagination doesn't always include page number
    const limit = data.length
    const total = safeNumber(response.count)
    const totalPages = Math.ceil(total / limit)
    metadata = {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next_page: Boolean(response.next),
      has_prev_page: Boolean(response.previous),
      next_page: response.next ? page + 1 : null,
      prev_page: response.previous ? page - 1 : null
    }
  }
  // Format 4: Direct array
  else if (Array.isArray(response)) {
    data = response
    metadata = {
      page: 1,
      limit: data.length,
      total: data.length,
      total_pages: 1,
      has_next_page: false,
      has_prev_page: false,
      next_page: null,
      prev_page: null
    }
  }
  // Unknown format - try to extract any array
  else {
    console.warn('transformPaginatedResponse: Unknown response format', response)
    // Try to find the first array property
    for (const key in response) {
      if (Array.isArray(response[key])) {
        data = response[key]
        break
      }
    }
    metadata = {
      page: 1,
      limit: data.length,
      total: data.length,
      total_pages: 1,
      has_next_page: false,
      has_prev_page: false,
      next_page: null,
      prev_page: null
    }
  }

  // Transform the data
  const transformedData = data.map(item => {
    try {
      return transformer(item)
    } catch (error) {
      console.error('transformPaginatedResponse: Failed to transform item', error, item)
      return null
    }
  }).filter(Boolean) as T[]

  return {
    data: transformedData,
    metadata: {
      page: metadata.page || 1,
      limit: metadata.limit || 20,
      total: metadata.total || 0,
      total_pages: metadata.total_pages || 0,
      has_next_page: metadata.has_next_page || false,
      has_prev_page: metadata.has_prev_page || false,
      next_page: metadata.next_page ?? null,
      prev_page: metadata.prev_page ?? null
    }
  }
}

// =========================================
// ERROR TRANSFORMER
// =========================================

/**
 * Transform API error response to frontend ApiError type
 */
export function transformApiError(error: any): ApiError {
  if (!error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      status: 500
    }
  }

  // Extract error details
  let code = error.code || 'UNKNOWN_ERROR'
  let message = error.message || error.detail || 'An unexpected error occurred'
  let details = error.details
  let status = error.status || error.status_code || 500

  // Handle FastAPI validation errors
  if (error.detail && Array.isArray(error.detail)) {
    message = error.detail.map((e: any) => e.msg || e.message).join(', ')
    code = 'VALIDATION_ERROR'
    status = 400
  }

  // Handle string errors
  if (typeof error === 'string') {
    message = error
    code = 'ERROR'
  }

  return {
    code,
    message,
    details,
    status
  }
}

// =========================================
// EXPORTS
// =========================================

export default {
  transformUser,
  transformAttachment,
  transformPost,
  transformComment,
  transformPaginatedResponse,
  transformApiError
}