// features/users/components/UserAvatar.tsx
import { useState } from 'react';
import { useUploadAvatar } from '../hooks/useUser';

interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  onUpload?: (file: File) => void;
  className?: string;
}

export function UserAvatar({ 
  src, 
  name, 
  size = 'md', 
  editable = false,
  onUpload,
  className = '' 
}: UserAvatarProps) {
  const [isHovering, setIsHovering] = useState(false);
  const uploadAvatar = useUploadAvatar();

  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  const pixelSize = sizeMap[size];

  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If onUpload prop exists, call it with the file
    if (onUpload) {
      onUpload(file);
    } else {
      // Otherwise use the hook directly
      try {
        await uploadAvatar.mutateAsync(file);
      } catch (error) {
        console.error('Failed to upload avatar:', error);
      }
    }
  };

  return (
    <div 
      className={`user-avatar user-avatar-${size} ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      onMouseEnter={() => editable && setIsHovering(true)}
      onMouseLeave={() => editable && setIsHovering(false)}
    >
      {src ? (
        <img 
          src={src} 
          alt={name}
          className="avatar-image"
          onError={(e) => {
            // Fallback to initials if image fails to load
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement?.classList.add('avatar-fallback');
          }}
        />
      ) : null}
      
      {/* Always show initials as fallback or when no src */}
      <div className={`avatar-initials ${src ? 'hidden' : ''}`}>
        {initials}
      </div>

      {editable && isHovering && (
        <div className="avatar-overlay">
          <label htmlFor={`avatar-upload-${name}`} className="avatar-upload-label">
            <span className="upload-icon">📷</span>
            <span className="upload-text">Change</span>
          </label>
          <input
            id={`avatar-upload-${name}`}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="avatar-upload-input"
            aria-label="Upload avatar"
          />
        </div>
      )}

      {uploadAvatar.isPending && (
        <div className="avatar-loading">
          <div className="loading-spinner-small" />
        </div>
      )}
    </div>
  );
}