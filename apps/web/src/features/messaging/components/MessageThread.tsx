import { useEffect, useRef, useCallback } from 'react'
import MessageItem from './MessageItem'
import { MessageComposer } from './MessageComposer'
import { useMessaging } from '../hooks/useMessaging'
import type { Message } from '../types/messaging.types'
import '../messaging.css'

interface MessageThreadProps {
  conversationId: number
  currentUserId: number
}

export function MessageThread({ conversationId, currentUserId }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    loadMoreMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    isSending,
  } = useMessaging(conversationId)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark as read when thread is viewed
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markAsRead(messages[0]?.id)
    }
  }, [conversationId, messages, markAsRead])

  // Handle scroll to load more messages
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget
    if (scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
      loadMoreMessages()
    }
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages])

  const handleSendMessage = useCallback((content: string) => {
    sendMessage({ content })
  }, [sendMessage])

  const handleEditMessage = useCallback((messageId: number, content: string) => {
    editMessage({ messageId, content })
  }, [editMessage])

  const handleDeleteMessage = useCallback((messageId: number) => {
    deleteMessage(messageId)
  }, [deleteMessage])

  const handleReply = useCallback((message: Message) => {
    // Scroll to composer and maybe show reply indicator
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    // You could set a replyTo state here
  }, [])

  if (isLoading) {
    return (
      <div className="message-thread loading">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="message-skeleton" />
        ))}
      </div>
    )
  }

  return (
    <div className="message-thread">
      <div className="thread-messages" ref={threadRef} onScroll={handleScroll}>
        {hasMoreMessages && (
          <div className="thread-load-more">
            <button
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="load-more-button"
            >
              {isLoadingMore ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        <div className="thread-messages-list" role="list" aria-label="Messages">
          {messages.map((message: Message, index: number) => {
            const prevMessage = messages[index - 1]
            const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id
            const showSender = !prevMessage || prevMessage.sender_id !== message.sender_id
            
            return (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onReply={handleReply}
                showAvatar={showAvatar}
                showSender={showSender}
              />
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="thread-composer">
        <MessageComposer
          conversationId={conversationId}
          onSend={handleSendMessage}
          disabled={isSending}
        />
      </div>
    </div>
  )
}