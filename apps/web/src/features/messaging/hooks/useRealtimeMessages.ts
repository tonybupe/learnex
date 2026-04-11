import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { messagingKeys } from './useConversations'
import type { RealtimeMessageEvent, Message } from '../types/messaging.types'

type UseRealtimeMessagesProps = {
  conversationId: number
  enabled?: boolean
  onNewMessage?: (message: Message) => void
}

export function useRealtimeMessages({
  conversationId,
  enabled = true,
  onNewMessage,
}: UseRealtimeMessagesProps) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!enabled || !conversationId) return

    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}/messaging/${conversationId}`
    )
    wsRef.current = ws

    ws.onmessage = (event) => {
      const data: RealtimeMessageEvent = JSON.parse(event.data)

      switch (data.type) {
        case 'new_message':
          // Update messages cache
          queryClient.setQueryData(
            messagingKeys.messages(conversationId),
            (old: any) => {
              if (!old) return old
              return {
                ...old,
                pages: old.pages.map((page: any, index: number) =>
                  index === 0
                    ? { ...page, items: [data.data, ...page.items] }
                    : page
                ),
              }
            }
          )

          // Update conversation last message
          queryClient.setQueryData(
            messagingKeys.conversations(),
            (old: any) =>
              old?.map((conv: any) =>
                conv.id === conversationId
                  ? { 
                      ...conv, 
                      last_message: data.data,
                      updated_at: data.data.created_at,
                      unread_count: conv.unread_count + 1 
                    }
                  : conv
              )
          )

          onNewMessage?.(data.data)
          break

        case 'message_updated':
          queryClient.setQueryData(
            messagingKeys.messages(conversationId),
            (old: any) => {
              if (!old) return old
              return {
                ...old,
                pages: old.pages.map((page: any) => ({
                  ...page,
                  items: page.items.map((msg: Message) =>
                    msg.id === data.data.id ? data.data : msg
                  ),
                })),
              }
            }
          )
          break

        case 'message_deleted':
          queryClient.setQueryData(
            messagingKeys.messages(conversationId),
            (old: any) => {
              if (!old) return old
              return {
                ...old,
                pages: old.pages.map((page: any) => ({
                  ...page,
                  items: page.items.filter(
                    (msg: Message) => msg.id !== data.data.id
                  ),
                })),
              }
            }
          )
          break

        case 'read_receipt':
          // Update read receipts
          queryClient.setQueryData(
            messagingKeys.messages(conversationId),
            (old: any) => {
              if (!old) return old
              return {
                ...old,
                pages: old.pages.map((page: any) => ({
                  ...page,
                  items: page.items.map((msg: Message) =>
                    msg.id <= data.data.last_read_message_id
                      ? {
                          ...msg,
                          read_by: [
                            ...(msg.read_by || []),
                            { user_id: data.data.user_id, read_at: data.data.read_at },
                          ],
                        }
                      : msg
                  ),
                })),
              }
            }
          )
          break
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return () => {
      ws.close()
    }
  }, [conversationId, enabled, queryClient, onNewMessage])

  return wsRef.current
}