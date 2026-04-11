import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import type {
  Conversation,
  Message,
  MessageCreate,
  MessageUpdate,
  MessageActionResponse,
  UnreadCounter,
  TotalUnread,
  ConversationCreate,
  ConversationParticipant,
  PaginatedResponse
} from "../types/messaging.types"

/**
 * List all conversations for the current user
 * GET /api/v1/messaging
 */
export const listConversations = async (): Promise<Conversation[]> => {
  const res = await api.get<Conversation[]>(endpoints.messaging.list)
  return res.data
}

/**
 * Get a specific conversation
 * GET /api/v1/messaging/{id}
 */
export const getConversation = async (
  conversationId: number
): Promise<Conversation> => {
  const res = await api.get<Conversation>(
    endpoints.messaging.conversation(conversationId)
  )
  return res.data
}

/**
 * Get messages for a specific conversation
 * GET /api/v1/messaging/{id}/messages
 */
export const getMessages = async (
  conversationId: number,
  params?: {
    before?: string
    after?: string
    limit?: number
    page?: number
  }
): Promise<PaginatedResponse<Message>> => {
  const res = await api.get<PaginatedResponse<Message>>(
    endpoints.messaging.messages(conversationId),
    { params }
  )
  return res.data
}

/**
 * Send a new message in a conversation
 * POST /api/v1/messaging/{id}/messages
 */
export const sendMessage = async (
  conversationId: number,
  data: MessageCreate
): Promise<Message> => {
  const res = await api.post<Message>(
    endpoints.messaging.sendMessage(conversationId),
    data
  )
  return res.data
}

/**
 * Edit a message
 * PATCH /api/v1/messaging/messages/{id}
 */
export const editMessage = async (
  messageId: number,
  data: MessageUpdate
): Promise<Message> => {
  const res = await api.patch<Message>(
    endpoints.messaging.editMessage(messageId),
    data
  )
  return res.data
}

/**
 * Delete a message (soft delete)
 * DELETE /api/v1/messaging/messages/{id}
 */
export const deleteMessage = async (
  messageId: number
): Promise<MessageActionResponse> => {
  const res = await api.delete<MessageActionResponse>(
    endpoints.messaging.deleteMessage(messageId)
  )
  return res.data
}

/**
 * Mark conversation as read
 * POST /api/v1/messaging/{id}/read
 */
export const markConversationRead = async (
  conversationId: number,
  lastReadMessageId?: number
): Promise<MessageActionResponse> => {
  const res = await api.post<MessageActionResponse>(
    endpoints.messaging.markRead(conversationId),
    { last_read_message_id: lastReadMessageId }
  )
  return res.data
}

/**
 * Get unread count for a conversation
 * GET /api/v1/messaging/{id}/unread-count
 */
export const getConversationUnreadCount = async (
  conversationId: number
): Promise<UnreadCounter> => {
  const res = await api.get<UnreadCounter>(
    endpoints.messaging.unreadCount(conversationId)
  )
  return res.data
}

/**
 * Get total unread count across all conversations
 * GET /api/v1/messaging/unread/total
 */
export const getTotalUnreadCount = async (): Promise<TotalUnread> => {
  const res = await api.get<TotalUnread>(
    endpoints.messaging.totalUnread
  )
  return res.data
}

/**
 * Get conversation participants
 * GET /api/v1/messaging/{id}/participants
 */
export const getConversationParticipants = async (
  conversationId: number
): Promise<ConversationParticipant[]> => {
  const res = await api.get<ConversationParticipant[]>(
    endpoints.messaging.participants(conversationId)
  )
  return res.data
}

/**
 * Start a direct conversation with other users
 * POST /api/v1/messaging/direct
 */
export const startDirectConversation = async (
  participantIds: number[]
): Promise<Conversation> => {
  const data: ConversationCreate = { participant_ids: participantIds }
  const res = await api.post<Conversation>(
    endpoints.messaging.startDirect,
    data
  )
  return res.data
}

/**
 * Start a class discussion
 * POST /api/v1/messaging/class/{classId}
 */
export const startClassDiscussion = async (
  classId: number,
  participantIds?: number[]
): Promise<Conversation> => {
  const data = participantIds ? { participant_ids: participantIds } : {}
  const res = await api.post<Conversation>(
    endpoints.messaging.classDiscussion(classId),
    data
  )
  return res.data
}

/**
 * Start a lesson discussion
 * POST /api/v1/messaging/lesson/{lessonId}
 */
export const startLessonDiscussion = async (
  lessonId: number,
  participantIds?: number[]
): Promise<Conversation> => {
  const data = participantIds ? { participant_ids: participantIds } : {}
  const res = await api.post<Conversation>(
    endpoints.messaging.lessonDiscussion(lessonId),
    data
  )
  return res.data
}