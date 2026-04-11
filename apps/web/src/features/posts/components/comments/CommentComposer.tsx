// components/comments/CommentComposer.tsx
import { useState, useCallback, useRef, useEffect, KeyboardEvent, memo } from "react"
import { useAuthStore } from "@/features/auth/auth.store"
import { UserAvatar } from "@/components/ui/UserAvatar"

type Props = {
  onSubmit: (content: string) => Promise<boolean>
  autoFocus?: boolean
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  onFocus?: () => void
  onBlur?: () => void
}

function CommentComposer({ 
  onSubmit, 
  autoFocus = false,
  disabled = false,
  placeholder = "Write a comment...",
  maxLength = 500,
  onFocus,
  onBlur
}: Props) {
  // =========================================
  // STATE
  // =========================================
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  
  // =========================================
  // REFS
  // =========================================
  const inputRef = useRef<HTMLInputElement>(null)
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // =========================================
  // HOOKS
  // =========================================
  const currentUser = useAuthStore((state) => state.user)
  
  // =========================================
  // EFFECTS
  // =========================================
  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [autoFocus, disabled])
  
  useEffect(() => {
    // Clear error after 3 seconds
    if (error) {
      const timer = setTimeout(() => setError(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [error])
  
  // =========================================
  // HANDLERS
  // =========================================
  
  /**
   * Handle comment submission
   */
  const handleSubmit = useCallback(async () => {
    const trimmedContent = content.trim()
    
    // Validation
    if (!trimmedContent) {
      setError("Comment cannot be empty")
      inputRef.current?.focus()
      return
    }
    
    if (trimmedContent.length > maxLength) {
      setError(`Comment cannot exceed ${maxLength} characters`)
      inputRef.current?.focus()
      return
    }
    
    if (loading || disabled) return
    
    setLoading(true)
    setError(null)
    
    try {
      const success = await onSubmit(trimmedContent)
      
      if (success) {
        setContent("")
        setError(null)
        
        // Keep focus after successful submission
        if (inputRef.current) {
          inputRef.current.focus()
        }
      } else {
        setError("Failed to post comment. Please try again.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [content, loading, disabled, onSubmit, maxLength])
  
  /**
   * Handle Enter key press
   */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    
    // Cancel on Escape
    if (e.key === 'Escape') {
      e.preventDefault()
      setContent("")
      setError(null)
      inputRef.current?.blur()
    }
  }, [handleSubmit])
  
  /**
   * Handle input change with character limit
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    
    if (newValue.length <= maxLength) {
      setContent(newValue)
      if (error) setError(null)
    } else {
      // Visual feedback when exceeding limit
      setError(`Maximum ${maxLength} characters`)
      setTimeout(() => setError(null), 2000)
    }
  }, [maxLength, error])
  
  /**
   * Handle focus event
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true)
    onFocus?.()
  }, [onFocus])
  
  /**
   * Handle blur event
   */
  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onBlur?.()
  }, [onBlur])
  
  /**
   * Clear content and error
   */
  const handleClear = useCallback(() => {
    setContent("")
    setError(null)
    inputRef.current?.focus()
  }, [])
  
  // =========================================
  // DERIVED STATE
  // =========================================
  const charCount = content.length
  const isNearLimit = charCount > maxLength * 0.9
  const isOverLimit = charCount > maxLength
  const canSubmit = content.trim().length > 0 && !loading && !disabled && !isOverLimit
  const showCharacterCounter = charCount > 0 && (isFocused || isNearLimit)
  
  // =========================================
  // RENDER
  // =========================================
  return (
    <div className={`comment-composer ${isFocused ? 'focused' : ''} ${loading ? 'loading' : ''}`}>
      {/* User Avatar */}
      <UserAvatar 
        user={currentUser} 
        size="sm" 
        className="comment-avatar"
      />
      
      {/* Input Container */}
      <div className="comment-input-container">
        <div className="comment-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={loading || disabled}
            maxLength={maxLength}
            aria-label="Write a comment"
            aria-invalid={!!error}
            aria-describedby={error ? "comment-error" : undefined}
            className={`comment-input ${error ? 'error' : ''}`}
          />
          
          {/* Clear button (only when content exists and not loading) */}
          {content.length > 0 && !loading && (
            <button
              type="button"
              className="comment-clear"
              onClick={handleClear}
              aria-label="Clear comment"
            >
              ×
            </button>
          )}
        </div>
        
        {/* Character Counter */}
        {showCharacterCounter && (
          <div 
            className={`comment-char-counter ${isNearLimit ? 'warning' : ''} ${isOverLimit ? 'error' : ''}`}
            aria-live="polite"
          >
            {charCount}/{maxLength}
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div 
            id="comment-error"
            className="comment-error" 
            role="alert"
            aria-live="polite"
          >
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
      
      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`comment-submit ${canSubmit ? 'active' : ''}`}
        aria-label="Post comment"
      >
        {loading ? (
          <>
            <span className="spinner-small" />
            <span>Posting</span>
          </>
        ) : (
          <>
            <span className="send-icon">📤</span>
            <span>Post</span>
          </>
        )}
      </button>
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(CommentComposer)