// Core user type (re-exported from your main types or defined here)
export interface UserMini {
  id: number
  name: string
  avatar_url?: string | null
  role?: 'learner' | 'teacher' | 'admin'
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error'

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

export interface Message {
  id: number
  conversation_id: number
  sender_id: number
  sender?: UserMini
  content: string
  created_at: string
  updated_at?: string | null
  is_edited: boolean
  reply_to_id?: number | null
  reply_to?: Message
  attachments?: MessageAttachment[]
  read_by?: MessageReadReceipt[]
  status?: MessageStatus // For optimistic updates
  temp_id?: string // For temporary messages
}

export interface ConversationParticipant {
  user_id: number
  user?: UserMini
  joined_at: string
  last_read_at?: string | null
  role?: 'admin' | 'member'
}

export interface Conversation {
  id: number
  title?: string | null
  is_group: boolean
  created_at: string
  updated_at: string
  last_message?: Message | null
  participants?: ConversationParticipant[]
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
  data?: Message
}

export interface UnreadCounter {
  conversation_id: number
  unread_count: number
}

export interface TotalUnread {
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

// WebSocket event types
export type RealtimeMessageEvent = {
  type: 'new_message' | 'message_updated' | 'message_deleted' | 'read_receipt'
  conversation_id: number
  data: any
}