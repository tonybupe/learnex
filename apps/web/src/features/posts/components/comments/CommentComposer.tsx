import { useState, useRef, useCallback } from "react"
import { UserAvatar } from "@/components/ui/UserAvatar"
import { useAuthStore } from "@/features/auth/auth.store"

type Props = {
  onSubmit: (content: string) => Promise<boolean>
  autoFocus?: boolean
  disabled?: boolean
  placeholder?: string
}

export default function CommentComposer({
  onSubmit,
  autoFocus = false,
  disabled = false,
  placeholder = "Write a comment...",
}: Props) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const user = useAuthStore(s => s.user)

  const handleSubmit = useCallback(async () => {
    const text = content.trim()
    if (!text || loading) return
    setLoading(true)
    const success = await onSubmit(text)
    if (success) setContent("")
    setLoading(false)
  }, [content, loading, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  return (
    <div className="comment-composer">
      <UserAvatar user={user} size="xs" />
      <div className="comment-input-container">
        <input
          ref={inputRef}
          className="comment-input"
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || loading}
          autoFocus={autoFocus}
          maxLength={1000}
        />
        <button
          className={`comment-submit ${content.trim() ? "active" : ""}`}
          onClick={handleSubmit}
          disabled={!content.trim() || loading || disabled}
          title="Send comment"
        >
          {loading ? <span className="spinner-small" style={{ borderTopColor: "var(--accent)" }} /> : "➤"}
        </button>
      </div>
    </div>
  )
}