import { useCallback, useMemo } from 'react'
import type { Conversation } from '../types/messaging.types'

interface ConversationItemProps {
  conversation: Conversation
  currentUserId: number
  isActive: boolean
  onClick: (conversationId: number) => void
}

export function ConversationItem({
  conversation,
  currentUserId,
  isActive,
  onClick,
}: ConversationItemProps) {
  const otherParticipant = useMemo(() => {
    if (conversation.is_group) return null
    return conversation.participants?.find(
      (p) => p.user_id !== currentUserId
    )?.user
  }, [conversation.participants, conversation.is_group, currentUserId])

  const displayName = useMemo(() => {
    if (conversation.title) return conversation.title
    if (otherParticipant?.name) return otherParticipant.name
    return 'Conversation'
  }, [conversation.title, otherParticipant])

  const avatarUrl = useMemo(() => {
    if (conversation.is_group) {
      return '/group-avatar.png'
    }
    return otherParticipant?.avatar_url || '/avatar.png'
  }, [conversation.is_group, otherParticipant])

  const lastMessagePreview = useMemo(() => {
    const msg = conversation.last_message
    if (!msg) return 'No messages yet'
    
    const prefix = msg.sender_id === currentUserId ? 'You: ' : ''
    const content = msg.content.length > 30
      ? `${msg.content.substring(0, 30)}...`
      : msg.content
    
    return prefix + content
  }, [conversation.last_message, currentUserId])

  const timestamp = useMemo(() => {
    if (!conversation.last_message) return ''
    
    const date = new Date(conversation.last_message.created_at)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }, [conversation.last_message])

  const handleClick = useCallback(() => {
    onClick(conversation.id)
  }, [conversation.id, onClick])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(conversation.id)
    }
  }, [conversation.id, onClick])

  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''} ${
        conversation.unread_count > 0 ? 'unread' : ''
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Conversation with ${displayName}${
        conversation.unread_count > 0 ? `, ${conversation.unread_count} unread messages` : ''
      }`}
      aria-pressed={isActive}
    >
      <div className="conversation-avatar-wrapper">
        <img
          src={avatarUrl}
          alt="" 
          className="conversation-avatar"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/avatar.png'
          }}
        />
        {conversation.unread_count > 0 && (
          <span className="unread-badge" aria-label={`${conversation.unread_count} unread`}>
            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
          </span>
        )}
      </div>

      <div className="conversation-content">
        <div className="conversation-header">
          <span className="conversation-name">{displayName}</span>
          <time className="conversation-time" dateTime={conversation.last_message?.created_at}>
            {timestamp}
          </time>
        </div>
        <div className="conversation-preview">{lastMessagePreview}</div>
      </div>
    </div>
  )
}