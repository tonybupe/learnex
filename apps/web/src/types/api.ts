/* =======================================
   AUTH TYPES
======================================= */

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  full_name: string
  email: string
  password: string
  role?: 'learner' | 'teacher'
}

export type TokenResponse = {
  access_token: string
  token_type: string
}

/* =======================================
   BASE USER (CORE MODEL)
======================================= */

export type BaseUser = {
  id: number
  full_name: string
  email: string

  phone_number?: string | null
  sex?: 'male' | 'female' | 'other' | null

  role: 'admin' | 'teacher' | 'learner'

  is_active: boolean
  is_verified: boolean

  created_at: string
  updated_at: string
}

/* =======================================
   USER PROFILE DETAILS (EXTENDED)
======================================= */

// types/api.ts
export type UserProfileDetails = {   
  avatar_url?: string | null 
  bio?: string | null
  date_of_birth?: string | null
  location?: string | null
  country?: string | null
  profession?: string | null
  organization?: string | null
  website?: string | null
  skills?: Record<string, unknown> | null
  interests?: Record<string, unknown> | null
  social_links?: Record<string, unknown> | null
}

/* =======================================
   FULL USER PROFILE (PUBLIC)
======================================= */

export type UserProfile = BaseUser & {
  followers_count: number
  following_count: number
  name?: string
  avatar_url?: string | null
  profile?: UserProfileDetails | null
}

/* =======================================
   AUTH USER (CURRENT USER)
======================================= */

export type AuthUser = BaseUser & {
  profile?: UserProfileDetails | null
  access_token?: string
}

/* =======================================
   UPDATE TYPES
======================================= */

export type UpdateUserData = {
  full_name?: string
  phone_number?: string | null
  sex?: 'male' | 'female' | 'other' | null
}

export type UpdateUserProfileData = {
  avatar_url?: string | null
  bio?: string | null

  // ✅ CORE USER FIELDS (NOW MERGED INTO PROFILE UPDATE)
  full_name?: string
  phone_number?: string | null
  sex?: 'male' | 'female' | 'other' | null

  // ✅ EXTENDED PROFILE
  date_of_birth?: string | null
  location?: string | null
  country?: string | null

  profession?: string | null
  organization?: string | null
  website?: string | null

  skills?: Record<string, any> | null
  interests?: Record<string, any> | null
  social_links?: Record<string, any> | null
}

/* =======================================
   DELETE RESPONSE
======================================= */

export type DeleteAccountResponse = {
  message: string
}

/* =======================================
   SOCIAL TYPES
======================================= */

export type FollowStats = {
  followers_count: number
  following_count: number
  is_following: boolean
}

export type Follower = {
  id: number
  follower_id: number
  following_id: number
  created_at: string
  follower: AuthUser
}

export type Following = {
  id: number
  follower_id: number
  following_id: number
  created_at: string
  following: AuthUser
}

export type FollowActionResponse = {
  success: boolean
  message: string
  stats: FollowStats
}

/* =======================================
   POSTS
======================================= */

export type PostAuthor = Pick<
  AuthUser,
  'id' | 'full_name' | 'profile' | 'role'
>

export type Post = {
  id: number
  content: string
  author: PostAuthor

  subject_id?: number
  class_id?: number

  attachments?: PostAttachment[]

  likes_count: number
  comments_count: number

  is_liked: boolean
  is_saved: boolean

  created_at: string
  updated_at: string
}

export type PostAttachment = {
  id: number
  media_id: number
  media_url: string
  media_type: string
  file_name: string
  file_size: number
}

export type PostComment = {
  id: number
  post_id: number
  author: PostAuthor
  content: string
  created_at: string
  updated_at: string
}

/* =======================================
   CLASS & SUBJECT
======================================= */

export type Class = {
  id: number
  name: string
  description?: string
  subject_id: number
  teacher_id: number
  teacher?: AuthUser
  members_count: number
  created_at: string
  updated_at: string
}

export type Subject = {
  id: number
  name: string
  description?: string
  icon?: string
  classes_count?: number
  created_at: string
}

/* =======================================
   LESSONS
======================================= */

export type Lesson = {
  id: number
  title: string
  description?: string
  content?: string
  class_id: number
  subject_id: number
  order: number
  attachments?: LessonResource[]
  created_at: string
  updated_at: string
}

export type LessonResource = {
  id: number
  lesson_id: number
  media_id: number
  media_url: string
  title: string
  type: 'video' | 'pdf' | 'link' | 'file'
  created_at: string
}

/* =======================================
   QUIZ
======================================= */

export type Quiz = {
  id: number
  title: string
  description?: string
  class_id?: number
  lesson_id?: number
  time_limit?: number
  passing_score: number
  questions_count: number
  attempts_count?: number
  created_at: string
}

/* =======================================
   LIVE SESSION
======================================= */

export type LiveSession = {
  id: number
  title: string
  description?: string
  class_id?: number
  teacher_id: number
  teacher?: AuthUser
  start_time: string
  end_time?: string
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  meeting_url?: string
  attendees_count?: number
  created_at: string
}

/* =======================================
   NOTIFICATIONS
======================================= */

export type Notification = {
  id: number
  user_id: number
  type:
    | 'follow'
    | 'like'
    | 'comment'
    | 'class_invite'
    | 'quiz_grade'
    | 'live_session'

  title: string
  message: string

  data?: Record<string, unknown>

  is_read: boolean
  is_seen: boolean

  created_at: string
}

/* =======================================
   PAGINATION
======================================= */

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

/* =======================================
   ERROR
======================================= */

export type ApiError = {
  detail?: string
  message?: string
  status_code?: number
}
// Follow response types
export type FollowersResponse = { items: UserProfile[]; page: number; pages: number; total: number }
export type FollowingResponse = { items: UserProfile[]; page: number; pages: number; total: number }
