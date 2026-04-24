// components/post/PostContent.tsx
import { useState, useCallback, memo } from "react"
import type { Post } from "../../types/post.types"

type Props = {
  post: Post
  expandable?: boolean
  maxPreviewLength?: number
  onMediaClick?: (url: string) => void
}

function PostContent({ 
  post, 
  expandable = true, 
  maxPreviewLength = 300,
  onMediaClick
}: Props) {
  const [expanded, setExpanded] = useState(false)
  
  const shouldTruncate = expandable && post.content.length > maxPreviewLength
  const displayContent = shouldTruncate && !expanded 
    ? `${post.content.slice(0, maxPreviewLength)}...` 
    : post.content
  
  const toggleExpand = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])
  
  const handleMediaError = useCallback((e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
    const target = e.currentTarget
    target.style.opacity = '0.5'
    target.title = 'Failed to load media'
  }, [])
  
  const isVideo = useCallback((mimeType?: string | null): boolean => {
    return mimeType?.startsWith('video/') ?? false
  }, [])
  
  const getMediaUrl = useCallback((fileUrl: string): string => {
    if (fileUrl.startsWith('http')) {
      return fileUrl
    }
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:8000'
    return `${baseUrl}${fileUrl}`
  }, [])
  
  const handleMediaClick = useCallback((url: string) => {
    if (onMediaClick) {
      onMediaClick(url)
    } else {
      window.open(url, '_blank')
    }
  }, [onMediaClick])
  
  const getFileName = useCallback((fileName: string | null | undefined): string => {
    if (!fileName) return 'Media'
    // Remove file extension for cleaner display
    return fileName.replace(/\.[^/.]+$/, "")
  }, [])
  
  return (
    <div className="post-content">
      {/* Text Content */}
      {post.content && (
        <div className="post-text-container">
          <p className="post-text">
            {displayContent}
          </p>
          {shouldTruncate && (
            <button 
              className="post-read-more"
              onClick={toggleExpand}
              aria-label={expanded ? "Show less" : "Read more"}
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}
      
      {/* Media Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <div className={`post-media-wrapper ${post.attachments.length > 1 ? 'multiple' : ''}`}>
          {post.attachments.map((att, index) => (
            <div 
              key={att.id} 
              className="post-media-item"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {isVideo(att.mime_type) ? (
                <video
                  src={getMediaUrl(att.file_url)}
                  controls
                  className="post-video"
                  onError={handleMediaError}
                  preload="metadata"
                  poster={att.thumbnail}
                />
              ) : (
                <img
                  src={getMediaUrl(att.file_url)}
                  alt={getFileName(att.file_name)}
                  className="post-image"
                  loading="lazy"
                  onError={handleMediaError}
                  onClick={() => handleMediaClick(getMediaUrl(att.file_url))}
                />
              )}
              {att.file_name && (
                <div className="media-caption">
                  {getFileName(att.file_name)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default memo(PostContent)
