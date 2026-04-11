import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useConversations,
  useConversation,
  useUpdateConversationCache,
  messagingKeys,
} from './useConversations'
import { useMessages, useSendMessage, useEditMessage, useDeleteMessage } from './useMessages'
import { useTotalUnread, useMarkAsRead } from './useUnreadMessages'
import { useRealtimeMessages } from './useRealtimeMessages'
import * as messagingApi from '../api/messaging'
import type { Conversation } from '../types/messaging.types'


export function useMessaging(conversationId?: number | null) {
  const queryClient = useQueryClient()
  const { resetUnreadCount } = useUpdateConversationCache()

  // Queries
  const conversations = useConversations()
  const conversation = useConversation(conversationId ?? null)
  const messages = useMessages(conversationId ?? null)
  const totalUnread = useTotalUnread()

  // Mutations
  const sendMessage = useSendMessage(conversationId!)
  const editMessage = useEditMessage(conversationId!)
  const deleteMessage = useDeleteMessage(conversationId!)
  const markAsRead = useMarkAsRead(conversationId!)

  // Realtime updates
  useRealtimeMessages({
    conversationId: conversationId!,
    enabled: !!conversationId,
    onNewMessage: (message) => {
      // Auto-mark as read if conversation is active
      if (document.hasFocus()) {
        markAsRead.mutate(message.id)
      }
    },
  })

  const startDirectConversation = useCallback(
    async (participantIds: number[]) => {
      const newConversation = await messagingApi.startDirectConversation(participantIds)
      queryClient.setQueryData(
        messagingKeys.conversations(),
        (old: Conversation[] | undefined) => 
          old ? [newConversation, ...old] : [newConversation]
      )
      return newConversation
    },
    [queryClient]
  )

  const loadMoreMessages = useCallback(() => {
    if (messages.hasNextPage && !messages.isFetchingNextPage) {
      messages.fetchNextPage()
    }
  }, [messages])

  return {
    // Data
    conversations: conversations.data,
    currentConversation: conversation.data,
    messages: messages.data?.pages.flatMap((page) => page.items) ?? [],
    totalUnread: totalUnread.data?.total_unread ?? 0,
    
    // Loading states
    isLoading: conversations.isLoading || messages.isLoading,
    isSending: sendMessage.isPending,
    isLoadingMore: messages.isFetchingNextPage,
    hasMoreMessages: messages.hasNextPage,
    
    // Actions
    sendMessage: sendMessage.mutate,
    editMessage: editMessage.mutate,
    deleteMessage: deleteMessage.mutate,
    markAsRead: markAsRead.mutate,
    loadMoreMessages,
    startDirectConversation,
    resetUnreadCount,
    
    // Errors
    error: conversations.error || messages.error,
  }
}