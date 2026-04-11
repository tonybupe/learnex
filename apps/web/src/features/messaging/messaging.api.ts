// types/messaging.types.ts
export interface UserMiniResponse {
  id: number
  name: string
  avatar_url?: string | null
  role?: 'learner' | 'teacher' | 'admin'
}

export interface ConversationParticipantResponse {
  user_id: number
  user?: UserMiniResponse
  joined_at: string
  last_read_at?: string | null
  role?: 'admin' | 'member'
}

export interface MessageAttachment {
  id: number
  media_id: number
  media_url: string
  media_type: string
  file_name: string
  file_size: number
}

export interface MessageReadReceipt {
  user_id: number
  read_at: string
}

export interface MessageResponse {
  id: number
  conversation_id: number
  sender_id: number
  sender?: UserMiniResponse
  content: string
  created_at: string
  updated_at?: string | null
  is_edited: boolean
  reply_to_id?: number | null
  reply_to?: MessageResponse
  attachments?: MessageAttachment[]
  read_by?: MessageReadReceipt[]
}

export interface ConversationResponse {
  id: number
  title?: string | null
  is_group: boolean
  created_at: string
  updated_at: string
  last_message?: MessageResponse | null
  participants?: ConversationParticipantResponse[]
  unread_count: number
  created_by_id?: number
  class_id?: number | null
  lesson_id?: number | null
}

export interface MessageCreate {
  content: string
  reply_to_id?: number
  attachments?: number[] // media IDs
}

export interface MessageUpdate {
  content: string
}

export interface MessageActionResponse {
  success: boolean
  message: string
  data?: MessageResponse
}

export interface UnreadCounterResponse {
  conversation_id: number
  unread_count: number
}

export interface TotalUnreadResponse {
  total_unread: number
}

export interface ConversationCreate {
  participant_ids: number[]
  title?: string
  class_id?: number
  lesson_id?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}