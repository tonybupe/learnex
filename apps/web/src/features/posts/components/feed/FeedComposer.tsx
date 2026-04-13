import { useState, useCallback, useRef, useEffect } from "react"
import { createPost, uploadMedia } from "../../api/posts.api"
import { useToast } from "@/features/posts/hooks/useToast"
import { useAuthStore } from "@/features/auth/auth.store"
import { Image, Video, Camera, X, Send } from "lucide-react"

function getBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1","") || "http://localhost:8000"
}
function resolveAvatar(url?: string | null) {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `${getBaseUrl()}${url}`
}

type Props = {
  onCreated?: (post: any) => void
  placeholder?: string
}

interface MediaFile {
  file: File
  preview: string
  type: "image" | "video" | "file"
  uploading: boolean
  uploaded?: boolean
  url?: string
  error?: string
}

export default function FeedComposer({ onCreated, placeholder = "What's on your mind?" }: Props) {
  const [content, setContent] = useState("")
  const [media, setMedia] = useState<MediaFile[]>([])
  const [active, setActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const toast = useToast()
  const user = useAuthStore(s => s.user)

  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const avatarColor = colors[(user?.full_name?.charCodeAt(0) ?? 0) % colors.length]
  const avatarUrl = resolveAvatar((user as any)?.profile?.avatar_url)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px"
  }, [content])

  // Clean up camera on unmount
  useEffect(() => {
    return () => { cameraStream?.getTracks().forEach(t => t.stop()) }
  }, [cameraStream])

  const addFiles = useCallback((files: File[]) => {
    const newMedia: MediaFile[] = []
    for (const file of files) {
      if (media.length + newMedia.length >= 4) { toast.warning("Max 4 files per post"); break }
      const isImage = file.type.startsWith("image/")
      const isVideo = file.type.startsWith("video/")
      if (!isImage && !isVideo) { toast.error(`Unsupported file: ${file.name}`); continue }
      const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) { toast.error(`${file.name} too large`); continue }
      newMedia.push({ file, preview: URL.createObjectURL(file), type: isVideo ? "video" : "image", uploading: false })
    }
    setMedia(prev => [...prev, ...newMedia])
    setActive(true)
  }, [media.length, toast])

  const removeMedia = useCallback((idx: number) => {
    setMedia(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }, [])

  // Open camera
  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      setCameraStream(stream)
      setCameraOpen(true)
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() } }, 100)
    } catch { toast.error("Camera not available") }
  }, [toast])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current
    const c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext("2d")?.drawImage(v, 0, 0)
    c.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" })
      addFiles([file])
      closeCamera()
    }, "image/jpeg", 0.9)
  }, [addFiles])

  const closeCamera = useCallback(() => {
    cameraStream?.getTracks().forEach(t => t.stop())
    setCameraStream(null)
    setCameraOpen(false)
  }, [cameraStream])

  const handleSubmit = useCallback(async () => {
    const text = content.trim()
    if (!text && media.length === 0) { toast.warning("Write something or add media"); return }
    setLoading(true); setError(null)

    try {
      let attachments: any[] = []

      // Upload all media files
      for (let i = 0; i < media.length; i++) {
        const m = media[i]
        setMedia(prev => prev.map((item, idx) => idx === i ? { ...item, uploading: true } : item))
        try {
          const result = await uploadMedia(m.file, () => {})
          attachments.push({ file_url: result.url, attachment_type: result.attachment_type, file_name: result.file_name || m.file.name, mime_type: result.mime_type || m.file.type })
          setMedia(prev => prev.map((item, idx) => idx === i ? { ...item, uploading: false, uploaded: true } : item))
        } catch (e: any) {
          throw new Error(`Failed to upload ${m.file.name}: ${e.message}`)
        }
      }

      const post = await createPost({
        content: text || " ",
        post_type: media.length > 0 ? (media[0].type === "video" ? "video" : "image") : "text",
        visibility: "public",
        title: text.slice(0, 60) || "Post",
        attachments,
      })

      console.log("✅ Post created successfully:", post)
      toast.success("Posted!")
      setContent("")
      setMedia([])
      setActive(false)
      onCreated?.(post)
    } catch (e: any) {
      const msg = e.message || "Failed to post"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [content, media, toast, onCreated])

  const canPost = (content.trim().length > 0 || media.length > 0) && !loading

  return (
    <div className={`composer ${active ? "active" : ""}`}>
      {/* Camera Modal */}
      {cameraOpen && (
        <div className="camera-modal">
          <div className="camera-overlay" onClick={closeCamera} />
          <div className="camera-container">
            <div className="camera-header">
              <span style={{ fontWeight: 700 }}>📷 Take Photo</span>
              <button className="camera-close" onClick={closeCamera}><X size={20} /></button>
            </div>
            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div className="camera-controls">
              <button className="camera-capture" onClick={capturePhoto}>
                <div className="capture-btn-inner" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="composer-inner">
        {/* Avatar */}
        <div className="composer-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={user?.full_name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 16 }}>
              {user?.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>

        <div className="composer-right">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="composer-textarea"
            value={content}
            onChange={e => { setContent(e.target.value); setActive(true) }}
            onFocus={() => setActive(true)}
            placeholder={placeholder}
            maxLength={5000}
            rows={1}
          />

          {/* Character count */}
          {content.length > 200 && (
            <div style={{ textAlign: "right", fontSize: 11, color: content.length > 4800 ? "var(--danger)" : "var(--muted)", marginTop: 2 }}>
              {content.length}/5000
            </div>
          )}

          {/* Media Preview Grid */}
          {media.length > 0 && (
            <div className={`composer-media-grid grid-${Math.min(media.length, 2)}`}>
              {media.map((m, i) => (
                <div key={i} className="composer-media-item">
                  {m.type === "video" ? (
                    <video src={m.preview} className="composer-media-preview" controls={false} muted />
                  ) : (
                    <img src={m.preview} alt="" className="composer-media-preview" />
                  )}
                  {m.uploading && (
                    <div className="composer-media-loading">
                      <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                    </div>
                  )}
                  {m.uploaded && (
                    <div className="composer-media-done">✓</div>
                  )}
                  <button className="composer-media-remove" onClick={() => removeMedia(i)}>
                    <X size={14} />
                  </button>
                  {m.error && <div className="composer-media-error">{m.error}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)", color: "var(--danger)", fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{error}</span>
              <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
          )}

          {/* Toolbar + Submit - always visible */}
          {(
            <div className="composer-toolbar">
              <div className="composer-tools">
                {/* Image */}
                <button className="composer-tool" title="Add image" onClick={() => fileInputRef.current?.click()}>
                  <Image size={18} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                  onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = "" }} />

                {/* Video */}
                <button className="composer-tool" title="Add video" onClick={() => videoInputRef.current?.click()}>
                  <Video size={18} />
                </button>
                <input ref={videoInputRef} type="file" accept="video/*" style={{ display: "none" }}
                  onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = "" }} />

                {/* Camera */}
                <button className="composer-tool" title="Take photo" onClick={openCamera}>
                  <Camera size={18} />
                </button>

                {/* File count */}
                {media.length > 0 && (
                  <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>
                    {media.length}/4 files
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button className="btn" style={{ fontSize: 12, padding: "6px 12px" }}
                  onClick={() => { setActive(false); setContent(""); setMedia([]) }}>
                  Cancel
                </button>
                <button className="btn btn-primary" style={{ fontSize: 13, padding: "8px 20px", gap: 6 }}
                  onClick={handleSubmit} disabled={!canPost}>
                  {loading ? <><span className="spinner-small" /> Posting...</> : <><Send size={14} /> Post</>}
                </button>
              </div>
            </div>
          )
        </div>
      </div>
    </div>
  )
}