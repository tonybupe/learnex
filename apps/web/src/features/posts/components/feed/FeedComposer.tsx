// components/feed/FeedComposer.tsx
import { useState, useCallback, useRef, ChangeEvent, useEffect } from "react"
import { createPost, uploadMedia, type CreatePostPayload } from "../../api/posts.api"
import { useToast } from "@/features/posts/hooks/useToast"
import { useAuthStore } from "@/features/auth/auth.store"
import { UserAvatar } from "@/components/ui/UserAvatar"

type Props = {
  onCreated?: (post: any) => void
  classId?: number
  subjectId?: number
  postType?: 'text' | 'note' | 'lesson' | 'image' | 'video' | 'link' | 'announcement'
  placeholder?: string
  maxLength?: number
}

export default function FeedComposer({ 
  onCreated, 
  classId, 
  subjectId,
  postType = 'text',
  placeholder = "Share something with your class...",
  maxLength = 5000
}: Props) {
  const [content, setContent] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [charCount, setCharCount] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const toast = useToast()
  const currentUser = useAuthStore((state) => state.user)

  // Update character count
  useEffect(() => {
    setCharCount(content.length)
  }, [content])

  // Handle file selection with preview
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    
    if (selectedFile) {
      // Validate file size
      const maxSize = selectedFile.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024
      if (selectedFile.size > maxSize) {
        const errorMsg = `File too large. Max ${maxSize / (1024 * 1024)}MB`
        setError(errorMsg)
        toast.error(errorMsg)
        e.target.value = ''
        return
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
      if (!allowedTypes.includes(selectedFile.type)) {
        const errorMsg = 'Invalid file type. Only images and MP4/MOV videos are allowed'
        setError(errorMsg)
        toast.error(errorMsg)
        e.target.value = ''
        return
      }
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(selectedFile)
      setFilePreview(previewUrl)
      setFile(selectedFile)
      setError(null)
      
      // Auto-focus on textarea
      textareaRef.current?.focus()
    } else {
      clearFile()
    }
  }, [toast])

  // Clear file and preview
  const clearFile = useCallback(() => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview)
    }
    setFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [filePreview])

  // Handle submit with optimistic UI
  // components/feed/FeedComposer.tsx - Add detailed logging in handleSubmit

const handleSubmit = async () => {
  const trimmedContent = content.trim()
  
  // Validate content
  if (!trimmedContent && !file) {
    setError("Please enter content or add an attachment")
    toast.warning("Please enter content or add an attachment")
    textareaRef.current?.focus()
    return
  }
  
  if (trimmedContent.length > maxLength) {
    setError(`Content exceeds ${maxLength} characters`)
    toast.warning(`Content exceeds ${maxLength} characters`)
    return
  }
  
  setLoading(true)
  setError(null)
  setUploadProgress(0)
  
  try {
    let uploadedAttachments: CreatePostPayload['attachments'] = []
    
    // Step 1: Upload file if exists
    if (file) {
      try {
        const uploadResult = await uploadMedia(file, (progress) => {
          setUploadProgress(progress)
        })
        
        uploadedAttachments = [{
          file_url: uploadResult.url,
          attachment_type: uploadResult.attachment_type as any,
          file_name: uploadResult.file_name || file.name,
          mime_type: uploadResult.mime_type || file.type,
        }]
      } catch (uploadError: any) {
        console.error('📤 Upload error:', uploadError)
        const errorMsg = uploadError.normalizedError?.message || uploadError.message || 'Failed to upload file. Please try again.'
        setError(errorMsg)
        toast.error(errorMsg)
        setLoading(false)
        return
      }
    }
    
    // Step 2: Create post
    const postData: CreatePostPayload = {
      content: trimmedContent,
      class_id: classId,
      subject_id: subjectId,
      post_type: postType,
      visibility: 'public',
      title: trimmedContent.slice(0, 100),
      attachments: uploadedAttachments,
    }
    
    // ✅ Add detailed logging
    console.log('📝 Creating post with data:', JSON.stringify(postData, null, 2))
    
    const newPost = await createPost(postData)
    console.log('✅ Post created successfully:', newPost)
    
    // Reset form
    setContent("")
    clearFile()
    setActive(false)
    setUploadProgress(0)
    setCharCount(0)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    // Show success message
    toast.success("Post created successfully!", { duration: 3000 })
    
    // Notify parent with real post
    onCreated?.(newPost)
    
  } catch (err: any) {
    // ✅ Add detailed error logging
    console.error('❌ Create post error:', err)
    console.error('Error response:', err.response?.data)
    console.error('Error status:', err.response?.status)
    console.error('Error message:', err.message)
    
    // Try to extract detailed error from response
    let errorMsg = 'Failed to create post. Please try again.'
    
    if (err.response?.data) {
      const data = err.response.data
      if (typeof data === 'string') {
        errorMsg = data
      } else if (data.detail) {
        errorMsg = data.detail
      } else if (data.message) {
        errorMsg = data.message
      } else if (data.errors) {
        errorMsg = JSON.stringify(data.errors)
      }
    } else if (err.message) {
      errorMsg = err.message
    }
    
    setError(errorMsg)
    toast.error(errorMsg)
    
    // Revert optimistic update if parent handled it
    onCreated?.(null)
  } finally {
    setLoading(false)
  }
}
  
  // Auto-resize textarea
  const handleTextareaChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      setContent(newValue)
      setError(null)
      
      // Auto-resize
      const textarea = e.target
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    } else {
      setError(`Content cannot exceed ${maxLength} characters`)
    }
  }, [maxLength])
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!loading && (content.trim() || file)) {
        handleSubmit()
      }
    }
    
    // Cancel on Escape
    if (e.key === 'Escape' && active) {
      e.preventDefault()
      handleCancel()
    }
  }, [loading, content, file, active])
  
  // Cancel composer
  const handleCancel = useCallback(() => {
    setContent("")
    clearFile()
    setActive(false)
    setError(null)
    setCharCount(0)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [clearFile])
  
  const isNearLimit = charCount > maxLength * 0.9
  const isOverLimit = charCount > maxLength
  const canSubmit = (content.trim() || file) && !loading && !isOverLimit
  

  
  return (
    <div className={`create-post ${active ? 'active' : ''}`}>
      {/* User Avatar */}
      <UserAvatar user={currentUser} size="md" />
      
      {/* Main Input Area */}
      <div className="create-post-input-area">
        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={content}
          onFocus={() => setActive(true)}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={1}
          maxLength={maxLength}
          aria-label="Post content"
        />
        
        {/* Character Counter */}
        {active && charCount > 0 && (
          <div className={`char-counter ${isNearLimit ? 'warning' : ''} ${isOverLimit ? 'error' : ''}`}>
            {charCount}/{maxLength}
          </div>
        )}
        
        {/* File Preview */}
        {filePreview && (
          <div className="create-post-file-preview">
            {file?.type.startsWith('image/') ? (
              <div className="file-preview-image">
                <img 
                  src={filePreview} 
                  alt="Preview"
                  onClick={() => window.open(filePreview, '_blank')}
                />
                <div className="file-overlay">
                  <span className="file-type">Image</span>
                </div>
              </div>
            ) : (
              <div className="file-preview-video">
                <video src={filePreview} controls />
                <div className="file-overlay">
                  <span className="file-type">Video</span>
                </div>
              </div>
            )}
            <button 
              type="button" 
              className="remove-file"
              onClick={clearFile}
              aria-label="Remove file"
            >
              ×
            </button>
          </div>
        )}
        
        {/* Upload Progress */}
        {loading && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="upload-progress">
            <div 
              className="upload-progress-bar" 
              style={{ width: `${uploadProgress}%` }}
            />
            <span>{uploadProgress}%</span>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="create-post-error" role="alert">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button 
              type="button" 
              className="error-close"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
        
        {/* Actions */}
        <div className="create-post-actions">
          <label className={`attach-file-btn ${loading ? 'disabled' : ''}`}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/quicktime"
              onChange={handleFileChange}
              disabled={loading}
              aria-label="Attach file"
            />
            📎
          </label>
          
          <div className="action-buttons">
            {active && (
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
            )}
            
            <button
              type="button"
              className={`btn-post ${canSubmit ? '' : 'disabled'}`}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {loading ? (
                <>
                  <span className="spinner-small" />
                  <span>{uploadProgress > 0 ? `${uploadProgress}%` : 'Posting...'}</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">📤</span>
                  <span>Post</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

