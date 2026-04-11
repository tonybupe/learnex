import { useCallback } from 'react'
import { ConversationItem } from './ConversationItem'
import { NewMessageButton } from './NewMessageButton'
import { useConversations } from '../hooks/useConversations'
import type { Conversation } from '../types/messaging.types'

interface ConversationListProps {
  currentUserId: number
  activeConversationId?: number | null
  onSelectConversation: (conversationId: number) => void
  onNewConversation?: () => void
}

export function ConversationList({
  currentUserId,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationListProps) {
  const { data: conversations, isLoading, error } = useConversations()

  const handleSelect = useCallback((conversationId: number) => {
    onSelectConversation(conversationId)
  }, [onSelectConversation])

  if (isLoading) {
    return (
      <div className="conversation-list loading">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="conversation-item-skeleton" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="conversation-list error" role="alert">
        <p>Failed to load conversations</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  if (!conversations?.length) {
    return (
      <div className="conversation-list empty">
        <p>No conversations yet</p>
        <NewMessageButton onClick={onNewConversation} />
      </div>
    )
  }

  return (
    <div className="conversation-list" role="list" aria-label="Conversations">
      <div className="conversation-list-header">
        <h2>Messages</h2>
        <NewMessageButton onClick={onNewConversation} />
      </div>
      
      <div className="conversation-list-items">
        {conversations.map((conversation: Conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            currentUserId={currentUserId}
            isActive={conversation.id === activeConversationId}
            onClick={handleSelect}
          />
        ))}
      </div>
    </div>
  )
}