// components/ui/UserAvatar.tsx
import { memo, useState } from "react"
import { getUserAvatar, getUserInitials, getUserName, type AnyUser } from "@/utils/user"

type UserAvatarProps = {
  user?: AnyUser
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  onClick?: () => void
  withTooltip?: boolean
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl'
}

function UserAvatarComponent({ 
  user, 
  size = 'md', 
  className = '', 
  onClick,
  withTooltip = false
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)
  
  const avatarUrl = getUserAvatar(user)
  const initials = getUserInitials(user)
  const userName = getUserName(user)
  const userRole = user?.role
  
  // Handle image load error
  const handleImageError = () => {
    setImageError(true)
  }
  
  const avatarContent = (avatarUrl && !imageError) ? (
    <img 
      src={avatarUrl} 
      alt={userName}
      className="w-full h-full object-cover rounded-full"
      loading="lazy"
      onError={handleImageError}
    />
  ) : (
    <div className={`avatar-initials flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold rounded-full w-full h-full`}>
      {initials}
    </div>
  )
  
  // Role indicator ring color
  const ringColor = userRole === 'admin' ? 'ring-red-500' : 
                    userRole === 'teacher' ? 'ring-blue-500' : 
                    'ring-gray-400'
  
  return (
    <div 
      className={`user-avatar relative ${sizeClasses[size]} ${className} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
      title={withTooltip ? `${userName} (${userRole || 'User'})` : userName}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {avatarContent}
      {userRole && userRole !== 'learner' && (
        <div className={`absolute -top-0.5 -right-0.5 ${size === 'xs' ? 'ring-1' : 'ring-2'} ${ringColor} rounded-full`} />
      )}
    </div>
  )
}

export const UserAvatar = memo(UserAvatarComponent)