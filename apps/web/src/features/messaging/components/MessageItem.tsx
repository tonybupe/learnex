import { useMemo, useCallback, useState } from 'react'
import type { Message } from '../types/messaging.types'

interface MessageItemProps {
  message: Message
  currentUserId: number
  onEdit?: (messageId: number, content: string) => void
  onDelete?: (messageId: number) => void
  onReply?: (message: Message) => void
  showAvatar?: boolean
  showSender?: boolean
}

export default function MessageItem({ 
  message,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  showAvatar = true,
  showSender = true,
}: MessageItemProps) {
  
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  
  const isOwn = message.sender_id === currentUserId
  const isSystemMessage = message.sender_id === 0 // Assuming 0 is system

  const formattedTime = useMemo(() => {
    try {
      const date = new Date(message.created_at)
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }, [message.created_at])

  const messageStatus = useMemo(() => {
    if (!isOwn) return null
    
    // Check if message has read receipts
    if (message.read_by?.length) {
      return {
        icon: '✓✓',
        label: 'Read',
        className: 'read'
      }
    }
    
    // Fallback to message.status if available
    switch (message.status) {
      case 'sending':
        return { icon: '⏳', label: 'Sending', className: 'sending' }
      case 'sent':
        return { icon: '✓', label: 'Sent', className: 'sent' }
      case 'delivered':
        return { icon: '✓✓', label: 'Delivered', className: 'delivered' }
      default:
        return { icon: '✓', label: 'Sent', className: 'sent' }
    }
  }, [isOwn, message.read_by, message.status])

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

  const handleDelete = useCallback(() => {
    if (window.confirm('Delete this message?')) {
      onDelete?.(message.id)
    }
  }, [message.id, onDelete])

  // Don't render system messages differently, but they could be styled
  const messageClass = `message-item ${isOwn ? 'own' : 'other'} ${
    message.is_edited ? 'edited' : ''
  } ${isSystemMessage ? 'system' : ''}`

  return (
    <div 
      className={messageClass}
      role="listitem"
      aria-label={`Message from ${message.sender?.name ?? 'User'} at ${formattedTime}`}
    >
      {/* Avatar */}
      {showAvatar && !isOwn && message.sender && (
        <div className="message-avatar-wrapper">
          <img
            src={message.sender.avatar_url || '/avatar.png'}
            alt=""
            className="message-avatar"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/avatar.png'
            }}
          />
        </div>
      )}

      <div className="message-content-wrapper">
        {/* Sender name */}
        {showSender && !isOwn && message.sender && (
          <div className="message-sender">
            <span className="message-sender-name">
              {message.sender.name}
            </span>
            {message.sender.role && (
              <span className="message-sender-role">
                {message.sender.role === 'teacher' ? '👨‍🏫' : 
                 message.sender.role === 'admin' ? '👑' : ''}
              </span>
            )}
          </div>
        )}

        {/* Reply indicator */}
        {message.reply_to && (
          <div className="message-reply-indicator">
            <span className="reply-sender">
              {message.reply_to.sender_id === currentUserId
                ? 'You'
                : message.reply_to.sender?.name ?? 'User'}
            </span>
            <span className="reply-preview">
              {message.reply_to.content.substring(0, 30)}
              {message.reply_to.content.length > 30 && '...'}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className="message-bubble">
          {isEditing ? (
            <div className="message-edit-container">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleEdit}
                className="message-edit-input"
                autoFocus
                rows={2}
                aria-label="Edit message"
              />
              <div className="message-edit-actions">
                <button 
                  onClick={() => {
                    setIsEditing(false)
                    setEditContent(message.content)
                  }}
                  className="edit-cancel"
                  aria-label="Cancel editing"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEdit}
                  className="edit-save"
                  aria-label="Save changes"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="message-text">
                {message.content}
              </div>

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="message-attachments">
                  {message.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="attachment-link"
                      aria-label={`Attachment: ${attachment.file_name}`}
                    >
                      <span className="attachment-icon">📎</span>
                      <span className="attachment-name">{attachment.file_name}</span>
                      <span className="attachment-size">
                        {formatFileSize(attachment.file_size)}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Message footer with metadata */}
        <div className="message-footer">
          <time 
            className="message-time" 
            dateTime={message.created_at}
            aria-label={`Sent at ${formattedTime}`}
          >
            {formattedTime}
            {message.is_edited && (
              <span className="edited-indicator" aria-label="Edited">
                {' '}· edited
              </span>
            )}
          </time>

          {messageStatus && (
            <span 
              className={`message-status ${messageStatus.className}`}
              aria-label={messageStatus.label}
              title={messageStatus.label}
            >
              {messageStatus.icon}
            </span>
          )}

          {/* Actions menu (only for own messages) */}
          {isOwn && !isEditing && (
            <div className="message-actions" role="group" aria-label="Message actions">
              <button
                onClick={() => onReply?.(message)}
                className="message-action"
                aria-label="Reply to message"
                title="Reply"
              >
                ↩
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="message-action"
                aria-label="Edit message"
                title="Edit"
              >
                ✎
              </button>
              <button
                onClick={handleDelete}
                className="message-action delete"
                aria-label="Delete message"
                title="Delete"
              >
                ×
              </button>
            </div>
          )}

          {/* Reply button for others' messages */}
          {!isOwn && !isEditing && (
            <button
              onClick={() => onReply?.(message)}
              className="message-action reply"
              aria-label="Reply to message"
              title="Reply"
            >
              ↩
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}