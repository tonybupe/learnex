// features/messaging/hooks/useUnreadMessages.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as messagingApi from '../api/messaging'
import { messagingKeys } from './useConversations'

export function useTotalUnread() {
  return useQuery({
    queryKey: messagingKeys.unread(),
    queryFn: messagingApi.getTotalUnreadCount,
    refetchInterval: 30000,
  })
}

export function useConversationUnread(conversationId: number) {
  return useQuery({
    queryKey: [...messagingKeys.unread(), conversationId],
    queryFn: () => messagingApi.getConversationUnreadCount(conversationId),
    enabled: !!conversationId,
    refetchInterval: 10000,
  })
}

export function useMarkAsRead(conversationId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (lastReadMessageId?: number) =>
      messagingApi.markConversationRead(conversationId, lastReadMessageId),
    onSuccess: () => {
      queryClient.setQueryData(
        messagingKeys.conversations(),
        (old: any) =>
          old?.map((conv: any) =>
            conv.id === conversationId 
              ? { ...conv, unread_count: 0 }
              : conv
          )
      )
      
      queryClient.invalidateQueries({ 
        queryKey: messagingKeys.unread() 
      })
    },
  })
}

// Add a combined hook for Topbar usage
export function useUnreadMessages() {
  const { data, isLoading, error } = useTotalUnread()
  
  return {
    totalUnread: data?.total_unread ?? 0,
    isLoading,
    error,
  }
}