// components/post/PostMenu.tsx
import { useState, useCallback, useRef, useEffect } from "react"

type Props = {
  canEdit?: boolean
  canDelete?: boolean
  onEdit?: () => void
  onDelete?: () => void
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function PostMenu({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  position = 'bottom'
}: Props) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (open && event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  const toggleMenu = useCallback(() => {
    setOpen(prev => !prev)
  }, [])

  const handleEdit = useCallback(() => {
    onEdit?.()
    setOpen(false)
  }, [onEdit])

  const handleDelete = useCallback(() => {
    onDelete?.()
    setOpen(false)
  }, [onDelete])

  // Don't render if no actions available
  if (!canEdit && !canDelete) {
    return null
  }

  return (
    <div className="post-menu" ref={menuRef}>
      <button
        ref={buttonRef}
        className="post-menu-trigger"
        onClick={toggleMenu}
        aria-label="Post menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        •••
      </button>

      {open && (
        <div className={`post-menu-dropdown post-menu-dropdown-${position}`}>
          {canEdit && (
            <button
              className="post-menu-item edit"
              onClick={handleEdit}
              aria-label="Edit post"
            >
              <span className="menu-icon">✏️</span>
              <span className="menu-text">Edit</span>
            </button>
          )}

          {canDelete && (
            <button
              className="post-menu-item delete"
              onClick={handleDelete}
              aria-label="Delete post"
            >
              <span className="menu-icon">🗑️</span>
              <span className="menu-text">Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}