import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as messagingApi from '../api/messaging'
import type { Conversation, Message } from '../types/messaging.types'

export const messagingKeys = {
  all: ['messaging'] as const,
  conversations: () => [...messagingKeys.all, 'conversations'] as const,
  conversation: (id: number) => [...messagingKeys.conversations(), id] as const,
  messages: (conversationId: number) => 
    [...messagingKeys.conversation(conversationId), 'messages'] as const,
  unread: () => [...messagingKeys.all, 'unread'] as const,
}

export function useConversations() {
  return useQuery({
    queryKey: messagingKeys.conversations(),
    queryFn: messagingApi.listConversations,
    refetchInterval: 30000, // Poll every 30 seconds for updates
  })
}

export function useConversation(conversationId: number | null) {
  return useQuery({
    queryKey: messagingKeys.conversation(conversationId!),
    queryFn: () => messagingApi.getConversation(conversationId!),
    enabled: !!conversationId,
  })
}

export function useUpdateConversationCache() {
  const queryClient = useQueryClient()

  const updateConversationLastMessage = (
    conversationId: number,
    message: Message
  ) => {
    queryClient.setQueryData<Conversation[]>(
      messagingKeys.conversations(),
      (old) => 
        old?.map((conv) =>
          conv.id === conversationId
            ? { 
                ...conv, 
                last_message: message,
                updated_at: message.created_at,
                unread_count: conv.unread_count + 1 
              }
            : conv
        )
    )
  }

  const resetUnreadCount = (conversationId: number) => {
    queryClient.setQueryData<Conversation[]>(
      messagingKeys.conversations(),
      (old) =>
        old?.map((conv) =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
    )
  }

  return {
    updateConversationLastMessage,
    resetUnreadCount,
  }
}