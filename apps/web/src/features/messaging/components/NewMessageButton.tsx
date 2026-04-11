import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'

interface NewMessageButtonProps {
  onClick?: () => void
  variant?: 'icon' | 'full'
}

export function NewMessageButton({ 
  onClick, 
  variant = 'icon' 
}: NewMessageButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick()
    } else {
      setIsOpen(true)
    }
  }, [onClick])

  if (variant === 'full') {
    return (
      <button
        className="new-message-button full"
        onClick={handleClick}
        aria-label="New message"
      >
        <Plus size={20} />
        <span>New Message</span>
      </button>
    )
  }

  return (
    <button
      className="new-message-button"
      onClick={handleClick}
      aria-label="New message"
    >
      <Plus size={20} />
    </button>
  )
}