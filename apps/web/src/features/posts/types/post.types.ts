// types/post.types.ts

// =========================================
// BASE TYPES
// =========================================

export type UserRole = "admin" | "teacher" | "learner"
export type PostType = "text" | "note" | "lesson" | "image" | "video" | "link" | "announcement"
export type PostVisibility = "public" | "followers" | "class"
export type PostStatus = "draft" | "published" | "archived"
export type ReactionType = "like" | "love" | "insightful" | "celebrate"
export type AttachmentType = "image" | "video" | "file" | "link"

// =========================================
// USER
// =========================================

export type UserProfile = {
  avatar_url?: string | null
  bio?: string | null
  location?: string | null
  website?: string | null
}

export type UserMini = {
  id: number
  full_name: string
  email?: string
  role: UserRole
  profile?: UserProfile
}

// =========================================
// ATTACHMENTS
// =========================================

export type PostAttachment = {
  id: number
  media_file_id?: number | null
  attachment_type: AttachmentType
  file_url: string
  file_name?: string | null
  mime_type?: string | null
  created_at?: string
  updated_at?: string
  thumbnail?: string
  duration?: number
  size?: number
}

// =========================================
// POST
// =========================================

export type PostAuthor = UserMini

export type PostSubject = {
  id: number
  name: string
  code: string
}

export type PostClass = {
  id: number
  title: string
  class_code: string
  grade_level?: string | null
}

export type Post = {
  id: number
  post_type: PostType
  visibility: PostVisibility
  title?: string | null
  content: string
  status: PostStatus
  
  // Relations
  author: PostAuthor
  classroom?: PostClass | null
  subject?: PostSubject | null
  attachments: PostAttachment[]
  
  // Engagement
  reactions_count: number
  comments_count: number
  saves_count: number
  
  // User-specific state
  is_liked?: boolean
  is_saved?: boolean
  user_reaction?: ReactionType | null
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Optional for optimistic updates
  is_optimistic?: boolean
  temp_id?: string
}

// =========================================
// COMMENT
// =========================================

export type CommentAuthor = UserMini

export type Comment = {
  id: number
  post_id: number
  author_id: number
  content: string
  author: CommentAuthor
  likes_count?: number
  is_liked?: boolean
  created_at: string
  updated_at: string
  is_optimistic?: boolean
  temp_id?: string
}

// =========================================
// PAGINATION
// =========================================

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next_page: boolean
  has_prev_page: boolean
  next_page?: number | null
  prev_page?: number | null
}

export type PaginatedResponse<T> = {
  data: T[]
  metadata: PaginationMeta
}

// =========================================
// REQUEST PAYLOADS
// =========================================

export type CreatePostPayload = {
  content: string
  class_id?: number | null
  subject_id?: number | null
  post_type?: PostType
  visibility?: PostVisibility
  title?: string | null
  status?: PostStatus
  attachments?: {
    file_url: string
    attachment_type?: AttachmentType
    file_name?: string
    mime_type?: string
  }[]
}

export type UpdatePostPayload = Partial<CreatePostPayload> & {
  id: number
}

export type CreateCommentPayload = {
  content: string
}

export type CreateReactionPayload = {
  reaction_type: ReactionType
}

// =========================================
// FILTERS & QUERY PARAMS
// =========================================

export type FeedFilters = {
  page?: number
  limit?: number
  sort_by?: 'latest' | 'popular' | 'following'
  class_id?: number
  subject_id?: number
  user_id?: number
  from_date?: string
  to_date?: string
  post_type?: PostType
  status?: PostStatus
}

export type FeedQueryParams = FeedFilters // Export as same type for compatibility

export type CommentFilters = {
  page?: number
  limit?: number
  sort_by?: 'latest' | 'oldest'
}

// =========================================
// API RESPONSE TYPES
// =========================================

export type ApiError = {
  code: string
  message: string
  details?: Record<string, unknown>
  status?: number
}

export type ApiResponse<T> = {
  data: T
  message?: string
  status: number
}

// =========================================
// UPLOAD TYPES
// =========================================

export type UploadMediaResponse = {
  url: string
  file_id?: number
  attachment_type?: AttachmentType
  file_name?: string
  mime_type?: string
}

// =========================================
// STATE MANAGEMENT TYPES
// =========================================

export type PostState = {
  posts: Post[]
  selectedPost: Post | null
  loading: boolean
  error: string | null
  hasMore: boolean
  page: number
  total: number
}

export type CommentState = {
  comments: Comment[]
  loading: boolean
  error: string | null
  hasMore: boolean
  page: number
  total: number
}

// =========================================
// EVENT TYPES
// =========================================

export type PostEventType = 
  | 'post_created'
  | 'post_updated'
  | 'post_deleted'
  | 'post_liked'
  | 'post_unliked'
  | 'comment_added'
  | 'comment_deleted'

export type PostEvent = {
  type: PostEventType
  post_id: number
  data: Partial<Post> | Partial<Comment>
  timestamp: string
  user_id: number
}

// =========================================
// UTILITY FUNCTIONS
// =========================================

export function hasMedia(post: Post): boolean {
  return post.attachments && post.attachments.length > 0
}

export function isImageAttachment(attachment: PostAttachment): boolean {
  return attachment.attachment_type === 'image' || 
         (attachment.mime_type?.startsWith('image/') ?? false)
}

export function isVideoAttachment(attachment: PostAttachment): boolean {
  return attachment.attachment_type === 'video' || 
         (attachment.mime_type?.startsWith('video/') ?? false)
}

export function getPostPreview(post: Post, maxLength: number = 150): string {
  if (!post.content) return ''
  if (post.content.length <= maxLength) return post.content
  return post.content.slice(0, maxLength).trim() + '...'
}

export function formatPostDate(date: string): string {
  const postDate = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - postDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  
  return postDate.toLocaleDateString()
}

export function canEditPost(post: Post, userId: number, userRole: UserRole): boolean {
  return userRole === 'admin' || (userRole === 'teacher' && post.author.id === userId)
}

export function canDeletePost(post: Post, userId: number, userRole: UserRole): boolean {
  return userRole === 'admin' || post.author.id === userId
}

export function canDeleteComment(comment: Comment, userId: number, userRole: UserRole): boolean {
  return userRole === 'admin' || comment.author.id === userId
}

// =========================================
// CONSTANTS
// =========================================

export const POST_TYPES: Record<PostType, { label: string; icon: string }> = {
  text: { label: 'Text', icon: '📝' },
  note: { label: 'Note', icon: '📓' },
  lesson: { label: 'Lesson', icon: '📚' },
  image: { label: 'Image', icon: '🖼️' },
  video: { label: 'Video', icon: '🎥' },
  link: { label: 'Link', icon: '🔗' },
  announcement: { label: 'Announcement', icon: '📢' }
}

export const REACTION_TYPES: Record<ReactionType, { label: string; icon: string }> = {
  like: { label: 'Like', icon: '👍' },
  love: { label: 'Love', icon: '❤️' },
  insightful: { label: 'Insightful', icon: '💡' },
  celebrate: { label: 'Celebrate', icon: '🎉' }
}

export const POST_VISIBILITY: Record<PostVisibility, { label: string; description: string }> = {
  public: { label: 'Public', description: 'Visible to everyone' },
  followers: { label: 'Followers', description: 'Visible to followers only' },
  class: { label: 'Class', description: 'Visible to class members only' }
}

export const DEFAULT_POST_LIMIT = 20
export const MAX_COMMENT_LENGTH = 500
export const MAX_POST_CONTENT_LENGTH = 5000
export const MAX_POST_TITLE_LENGTH = 200
export const MAX_ATTACHMENTS_PER_POST = 10
export const MAX_FILE_SIZE_IMAGE = 10 * 1024 * 1024
export const MAX_FILE_SIZE_VIDEO = 50 * 1024 * 1024