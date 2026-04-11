import { useMemo, useCallback, useState } from 'react'
import type { Message } from '../types/messaging.types'

interface MessageBoxProps {
  message: Message
  currentUserId: number
  onEdit?: (messageId: number, content: string) => void
  onDelete?: (messageId: number) => void
  onReply?: (message: Message) => void
}

export function MessageBox({
  message,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
}: MessageBoxProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  
  const isOwn = message.sender_id === currentUserId
  
  const timestamp = useMemo(() => {
    const date = new Date(message.created_at)
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [message.created_at])

  const messageStatus = useMemo(() => {
    if (!isOwn) return null
    if (message.read_by?.length) return 'Read'
    return 'Delivered'
  }, [isOwn, message.read_by])

  const handleEdit = useCallback(() => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent.trim())
    }
    setIsEditing(false)
  }, [editContent, message.content, message.id, onEdit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
      setEditContent(message.content)
    }
  }, [handleEdit, message.content])

  const messageClass = `message-box ${isOwn ? 'own' : 'other'} ${
    message.is_edited ? 'edited' : ''
  }`

  return (
    <div className={messageClass} role="listitem">
      {!isOwn && message.sender && (
        <img
          src={message.sender.avatar_url || '/avatar.png'}
          alt={message.sender.name}
          className="message-avatar"
          loading="lazy"
        />
      )}

      <div className="message-content-wrapper">
        {!isOwn && message.sender && (
          <span className="message-sender-name">{message.sender.name}</span>
        )}

        <div className="message-bubble">
          {message.reply_to && (
            <div className="message-reply">
              <span className="reply-sender">
                {message.reply_to.sender_id === currentUserId
                  ? 'You'
                  : message.reply_to.sender?.name}
              </span>
              <p className="reply-content">{message.reply_to.content}</p>
            </div>
          )}

          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleEdit}
              className="message-edit-input"
              autoFocus
              rows={2}
            />
          ) : (
            <p className="message-text">{message.content}</p>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <div className="message-attachments">
              {message.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attachment-link"
                >
                  📎 {attachment.file_name}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="message-footer">
          <time className="message-time" dateTime={message.created_at}>
            {timestamp}
            {message.is_edited && <span className="edited-indicator"> · edited</span>}
          </time>
          
          {isOwn && messageStatus && (
            <span className="message-status" aria-label={messageStatus}>
              {messageStatus === 'Read' ? '✓✓' : '✓'}
            </span>
          )}

          {isOwn && (
            <div className="message-actions">
              <button
                onClick={() => setIsEditing(true)}
                className="message-action"
                aria-label="Edit message"
              >
                ✎
              </button>
              <button
                onClick={() => onDelete?.(message.id)}
                className="message-action"
                aria-label="Delete message"
              >
                ×
              </button>
            </div>
          )}

          <button
            onClick={() => onReply?.(message)}
            className="message-action reply"
            aria-label="Reply to message"
          >
            ↩
          </button>
        </div>
      </div>
    </div>
  )
}