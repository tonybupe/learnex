import { useState, useCallback, useRef, useEffect } from 'react'
import { Send, Paperclip, X } from 'lucide-react'

interface MessageComposerProps {
  conversationId: number
  onSend: (content: string, attachments?: File[]) => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
}

export function MessageComposer({
  conversationId,
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 1000,
}: MessageComposerProps) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const trimmedText = text.trim()
  const isEmpty = trimmedText.length === 0 && attachments.length === 0

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
      setIsExpanded(textarea.scrollHeight > 40)
    }
  }, [text])

  const handleSend = useCallback(() => {
    if (isEmpty || disabled) return
    
    onSend(trimmedText, attachments)
    setText('')
    setAttachments([])
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [trimmedText, attachments, onSend, disabled, isEmpty])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <div className={`message-composer ${isExpanded ? 'expanded' : ''}`}>
      {attachments.length > 0 && (
        <div className="attachment-preview">
          {attachments.map((file, index) => (
            <div key={`${file.name}-${index}`} className="attachment-item">
              <span className="attachment-name">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="attachment-remove"
                aria-label="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="composer-input-wrapper">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={1}
          className="composer-input"
          aria-label="Message input"
        />

        <div className="composer-actions">
          <div className="composer-attachments">
            <input
              type="file"
              id={`attachment-upload-${conversationId}`}
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <label
              htmlFor={`attachment-upload-${conversationId}`}
              className="composer-action-button"
              aria-label="Attach file"
            >
              <Paperclip size={18} />
            </label>
          </div>

          <button
            onClick={handleSend}
            disabled={disabled || isEmpty}
            className="composer-send-button"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {text.length > maxLength * 0.8 && (
        <div className="character-count" aria-live="polite">
          {text.length}/{maxLength}
        </div>
      )}
    </div>
  )
}