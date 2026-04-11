import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as messagingApi from '../api/messaging'
import { messagingKeys } from './useConversations'
import type { Message, MessageCreate } from '../types/messaging.types'

export function useMessages(conversationId: number | null) {
  return useInfiniteQuery({
    queryKey: messagingKeys.messages(conversationId!),
    queryFn: ({ pageParam = 1 }) => 
      messagingApi.getMessages(conversationId!, { 
        page: pageParam,
        limit: 50 
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => 
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    getPreviousPageParam: (firstPage) => 
      firstPage.page > 1 ? firstPage.page - 1 : undefined,
    enabled: !!conversationId,
  })
}

export function useSendMessage(conversationId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { content: string; replyToId?: number }) =>
      messagingApi.sendMessage(conversationId, {
        content: data.content,
        reply_to_id: data.replyToId,
      }),
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries({ 
        queryKey: messagingKeys.messages(conversationId) 
      })

      const previousMessages = queryClient.getQueryData(
        messagingKeys.messages(conversationId)
      )

      // Optimistic update
      queryClient.setQueryData(
        messagingKeys.messages(conversationId),
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page: any, index: number) => 
              index === 0 
                ? { 
                    ...page, 
                    items: [
                      {
                        id: `temp-${Date.now()}`,
                        conversation_id: conversationId,
                        content: newMessage.content,
                        created_at: new Date().toISOString(),
                        is_edited: false,
                        sender: { id: 0, name: 'You' },
                      },
                      ...page.items,
                    ] 
                  }
                : page
            ),
          }
        }
      )

      return { previousMessages }
    },
    onError: (err, newMessage, context) => {
      queryClient.setQueryData(
        messagingKeys.messages(conversationId),
        context?.previousMessages
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: messagingKeys.messages(conversationId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: messagingKeys.conversations() 
      })
    },
  })
}

export function useEditMessage(conversationId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: number; content: string }) =>
      messagingApi.editMessage(messageId, { content }),
    onSuccess: (updatedMessage) => {
      queryClient.setQueryData(
        messagingKeys.messages(conversationId),
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.map((msg: Message) =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              ),
            })),
          }
        }
      )
    },
  })
}

export function useDeleteMessage(conversationId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: number) => messagingApi.deleteMessage(messageId),
    onSuccess: (_, messageId) => {
      queryClient.setQueryData(
        messagingKeys.messages(conversationId),
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.filter((msg: Message) => msg.id !== messageId),
            })),
          }
        }
      )
    },
  })
}