import { useState, useRef, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useAuthStore } from "@/features/auth/auth.store"
import type { Class, ClassMember } from "@/features/classes/types/class.types"
import {
  ChevronLeft, Users, BookOpen, FileText, MessageCircle,
  Globe, Lock, UserPlus, UserMinus, Send, Trash2,
  CheckCircle2, ShieldAlert, GraduationCap, Image,
  Paperclip, Smile, X, Play, File as FileIcon, Camera
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────
interface Lesson { id: number; title: string; content: string; lesson_type: string; status: string; visibility: string; created_at: string }
interface ClassMemberData { id: number; learner_id: number; learner: { id: number; full_name: string; email: string; role: string }; status: string }
interface Attachment { id: number; file_url: string; file_name: string; mime_type: string; attachment_type: string }
interface ChatMessage {
  id: number; content: string; author_id?: number; user_id?: number; created_at: string
  author: { id: number; full_name: string; role: string } | null
  attachments?: Attachment[]
  reactions_count?: number
  is_liked?: boolean
}

// ── Helpers ────────────────────────────────────────────────────
function Avatar({ name, role, size = 34 }: { name: string; role?: string; size?: number }) {
  const colors: Record<string, string> = { teacher: "#cb26e4", admin: "#ef4444", learner: "#38bdf8" }
  const color = colors[role ?? "learner"] ?? "#38bdf8"
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  )
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const EMOJIS = ["👍","❤️","😊","😎","😂","🔥","🎉","💡","👏","🙏","✅","💻"]
const REACTIONS = [
  { type: "like", emoji: "👍" },
  { type: "love", emoji: "❤️" },
  { type: "insightful", emoji: "💡" },
  { type: "celebrate", emoji: "🎉" },
]

// ── Join Wall ──────────────────────────────────────────────────
function JoinWall({ cls, onJoin, joining }: { cls: Class; onJoin: () => void; joining: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", maxWidth: 420, margin: "0 auto" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(203,38,228,0.1)", border: "2px solid rgba(203,38,228,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <Lock size={32} style={{ color: "#cb26e4" }} />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 8px" }}>Members only</h3>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>
        Join <strong style={{ color: "var(--text)" }}>{cls.title}</strong> to access lessons, discussions, and resources.
      </p>
      <button onClick={onJoin} disabled={joining}
        style={{ padding: "12px 32px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 800, fontSize: 15, cursor: joining ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(203,38,228,0.3)" }}>
        <UserPlus size={16} /> {joining ? "Joining..." : "Join Class"}
      </button>
      <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 20 }}>
        {[{ icon: "📜", text: "All lessons" }, { icon: "💬", text: "Discussion" }, { icon: "📋", text: "Quizzes" }].map((f, i) => (
          <div key={i} style={{ fontSize: 12, color: "var(--muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 20 }}>{f.icon}</span>{f.text}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Media Preview ──────────────────────────────────────────────
function MediaPreview({ att }: { att: Attachment }) {
  const isImage = att.mime_type?.startsWith("image/")
  const isVideo = att.mime_type?.startsWith("video/")
  const url = att.file_url?.startsWith("http") ? att.file_url : `http://localhost:8000${att.file_url}`
  if (isImage) return (
    <img src={url} alt={att.file_name} onClick={() => window.open(url, "_blank")}
      style={{ maxWidth: 220, maxHeight: 180, borderRadius: 10, cursor: "pointer", display: "block", objectFit: "cover", marginTop: 6 }} />
  )
  if (isVideo) return (
    <video controls style={{ maxWidth: 240, maxHeight: 160, borderRadius: 10, marginTop: 6, display: "block" }}>
      <source src={url} type={att.mime_type} />
    </video>
  )
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "inherit", textDecoration: "none", fontSize: 12, marginTop: 6 }}>
      <FileIcon size={14} /> {att.file_name}
    </a>
  )
}

// ── Rich Class Chat ─────────────────────────────────────────────
function ClassChat({ cls, currentUser }: { cls: Class; currentUser: any }) {
  const queryClient = useQueryClient()
  const [text, setText] = useState("")
  const [showEmoji, setShowEmoji] = useState(false)
  const [showReactions, setShowReactions] = useState<number | null>(null)
  const [pendingMedia, setPendingMedia] = useState<{ file: File; preview: string; url?: string }[]>([])
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["class-chat", cls?.id],
    queryFn: async () => {
      const res = await api.get(`/posts?class_id=${cls.id}&limit=100&sort_by=created_at&sort_order=asc`).catch(() => ({ data: { data: [] } }))
      const raw = Array.isArray(res.data) ? res.data : res.data?.data ?? []
      return raw as ChatMessage[]
    },
    refetchInterval: 5000,
  })

  const sendMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      const res = await api.post("/posts", {
        content: content || " ",
        class_id: cls.id,
        post_type: "text",
        status: "published",
        visibility: "class",
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-chat", cls?.id] })
      setText("")
      setPendingMedia([])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["class-chat", cls?.id] }),
  })

  const reactMutation = useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: number; reactionType: string }) =>
      api.post(`/posts/${postId}/reactions`, { reaction_type: reactionType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-chat", cls?.id] })
      setShowReactions(null)
    },
  })

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const form = new FormData()
    form.append("file", file)
    try {
      const res = await api.post("/posts/upload", form, { headers: { "Content-Type": "multipart/form-data" } })
      return res.data?.public_url ?? res.data?.url ?? null
    } catch { return null }
  }, [])

  const addFiles = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : ""
      setPendingMedia(p => [...p, { file, preview }])
      const url = await uploadFile(file)
      if (url) setPendingMedia(p => p.map(m => m.file === file ? { ...m, url } : m))
    }
  }, [uploadFile])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handleSend = () => {
    const content = text.trim()
    if (!content && pendingMedia.length === 0) return
    sendMutation.mutate({ content })
  }

  // Group messages by date
  const grouped: { date: string; msgs: ChatMessage[] }[] = []
  messages.forEach(m => {
    const date = new Date(m.created_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.msgs.push(m)
    else grouped.push({ date, msgs: [m] })
  })

  const chatHeight = isMobile ? "calc(100vh - 280px)" : "65vh"

  return (
    <div style={{ display: "flex", flexDirection: "column", height: chatHeight, minHeight: isMobile ? 300 : 420, background: "var(--bg2)", borderRadius: isMobile ? 12 : 16, overflow: "hidden", border: "1px solid var(--border)" }}>

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        style={{ display: "none" }} onChange={e => e.target.files && addFiles(e.target.files)} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
        style={{ display: "none" }} onChange={e => e.target.files && addFiles(e.target.files)} />

      {/* Header */}
      <div style={{ padding: isMobile ? "10px 12px" : "12px 16px", background: "var(--card)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <GraduationCap size={16} style={{ color: "white" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: isMobile ? 13 : 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cls.title}</div>
          <div style={{ fontSize: 10, color: "var(--muted)" }}>Class discussion · members only</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e" }} />
          <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>Live</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "10px 8px" : "14px 12px", display: "flex", flexDirection: "column", gap: 2, scrollbarWidth: "none" as const }}>
        {isLoading && (
          <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: 24 }}>Loading messages...</div>
        )}
        {!isLoading && messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: "32px 16px" }}>
            <MessageCircle size={32} style={{ opacity: 0.2, marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>No messages yet</div>
            <div style={{ fontSize: 12 }}>Start the class discussion!</div>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            {/* Date divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 6px" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--card)", border: "1px solid var(--border)", whiteSpace: "nowrap" }}>{group.date}</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            {group.msgs.map((msg, i) => {
              const authorId = msg.author?.id ?? msg.author_id ?? msg.user_id
              const isMe = authorId === currentUser?.id
              const prevSame = i > 0 && (group.msgs[i-1].author?.id ?? group.msgs[i-1].user_id) === authorId
              const showMeta = !isMe && !prevSame

              return (
                <div key={msg.id}
                  style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: 5, marginBottom: 2 }}>

                  {/* Avatar */}
                  {!isMe && (
                    <div style={{ width: isMobile ? 24 : 28, flexShrink: 0, alignSelf: "flex-end", marginBottom: 16 }}>
                      {showMeta && <Avatar name={msg.author?.full_name ?? "?"} role={msg.author?.role} size={isMobile ? 24 : 28} />}
                    </div>
                  )}

                  <div style={{ maxWidth: isMobile ? "78%" : "68%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                    {showMeta && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#cb26e4", marginBottom: 2, paddingLeft: 4 }}>
                        {msg.author?.full_name}
                        {msg.author?.role && msg.author.role !== "learner" && (
                          <span style={{ marginLeft: 4, fontSize: 9, padding: "1px 5px", borderRadius: 999, background: "rgba(203,38,228,0.1)", color: "#cb26e4" }}>{msg.author.role}</span>
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div style={{ padding: isMobile ? "8px 11px" : "9px 13px", borderRadius: isMe ? "16px 16px 3px 16px" : "16px 16px 16px 3px", background: isMe ? "linear-gradient(135deg,#cb26e4,#8b5cf6)" : "var(--card)", color: isMe ? "white" : "var(--text)", border: isMe ? "none" : "1px solid var(--border)", fontSize: isMobile ? 13 : 14, lineHeight: 1.5, wordBreak: "break-word" }}>
                      {msg.content?.trim() && msg.content.trim() !== " " && msg.content}
                      {msg.attachments?.map(att => <MediaPreview key={att.id} att={att} />)}
                    </div>

                    {/* Meta */}
                    <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 4, paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0, flexDirection: isMe ? "row-reverse" : "row" }}>
                      <span>{timeAgo(msg.created_at)}</span>
                      {isMe && <CheckCircle2 size={9} style={{ color: "#22c55e" }} />}
                      {(msg.reactions_count ?? 0) > 0 && (
                        <span style={{ padding: "1px 5px", borderRadius: 999, background: "var(--card)", border: "1px solid var(--border)", fontSize: 10 }}>
                          👍 {msg.reactions_count}
                        </span>
                      )}
                    </div>

                    {/* Long press / tap actions on mobile */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, flexDirection: isMe ? "row-reverse" : "row" }}>
                      <button onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                        style={{ fontSize: isMobile ? 14 : 13, background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: 6, opacity: 0.6 }}>
                        😊
                      </button>
                      {showReactions === msg.id && (
                        <div style={{ position: "absolute", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "6px 8px", display: "flex", gap: 4, zIndex: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                          {REACTIONS.map(r => (
                            <button key={r.type} onClick={() => reactMutation.mutate({ postId: msg.id, reactionType: r.type })}
                              style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", padding: "2px", borderRadius: 6 }}>
                              {r.emoji}
                            </button>
                          ))}
                        </div>
                      )}
                      {(isMe || currentUser?.role === "admin" || currentUser?.role === "teacher") && (
                        <button onClick={() => { if (window.confirm("Delete this message?")) deleteMutation.mutate(msg.id) }}
                          style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.4, padding: "2px" }}>
                          <Trash2 size={11} style={{ color: "var(--danger)" }} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Pending media */}
      {pendingMedia.length > 0 && (
        <div style={{ padding: "6px 10px", background: "var(--card)", borderTop: "1px solid var(--border)", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {pendingMedia.map((m, i) => (
            <div key={i} style={{ position: "relative", width: 52, height: 52 }}>
              {m.preview
                ? <img src={m.preview} style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover" }} />
                : <div style={{ width: 52, height: 52, borderRadius: 8, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center" }}><FileIcon size={18} style={{ color: "var(--muted)" }} /></div>}
              {!m.url && <div style={{ position: "absolute", inset: 0, borderRadius: 8, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} /></div>}
              <button onClick={() => setPendingMedia(p => p.filter((_, j) => j !== i))}
                style={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, borderRadius: "50%", background: "var(--danger)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div style={{ padding: "8px 10px", background: "var(--card)", borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 4 }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => { setText(t => t + e); setShowEmoji(false); inputRef.current?.focus() }}
              style={{ fontSize: isMobile ? 22 : 20, background: "none", border: "none", cursor: "pointer", padding: 3, borderRadius: 6 }}>
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div style={{ padding: isMobile ? "6px 8px" : "10px 12px", background: "var(--card)", borderTop: "1px solid var(--border)", display: "flex", gap: isMobile ? 5 : 6, alignItems: "center", flexShrink: 0 }}>

        {/* On mobile: single attach button. On desktop: all 3 */}
        {isMobile ? (
          <button onClick={() => fileInputRef.current?.click()} title="Attach"
            style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", flexShrink: 0 }}>
            <Paperclip size={14} />
          </button>
        ) : (
          <>
            <button onClick={() => fileInputRef.current?.click()} title="Attach file"
              style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", flexShrink: 0 }}>
              <Paperclip size={14} />
            </button>
            <button onClick={() => cameraInputRef.current?.click()} title="Camera"
              style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", flexShrink: 0 }}>
              <Camera size={14} />
            </button>
            <button onClick={() => setShowEmoji(v => !v)} title="Emoji"
              style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)", background: showEmoji ? "rgba(203,38,228,0.1)" : "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
              😊
            </button>
          </>
        )}

        {/* Input */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", padding: isMobile ? "7px 11px" : "8px 14px", borderRadius: 24, border: "1px solid var(--border)", background: "var(--bg2)" }}>
          <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={isMobile ? "Message..." : "Type a message..."}
            style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", color: "var(--text)", fontSize: 15, fontFamily: "inherit", outline: "none" }} />
          {isMobile && (
            <button onClick={() => setShowEmoji(v => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "0 2px", flexShrink: 0 }}>
              😊
            </button>
          )}
        </div>

        {/* Send */}
        <button onClick={handleSend}
          disabled={sendMutation.isPending || (!text.trim() && pendingMedia.length === 0)}
          style={{ width: isMobile ? 36 : 36, height: isMobile ? 36 : 36, borderRadius: "50%", border: "none", background: (text.trim() || pendingMedia.length > 0) ? "linear-gradient(135deg,#cb26e4,#8b5cf6)" : "var(--bg2)", color: (text.trim() || pendingMedia.length > 0) ? "white" : "var(--muted)", cursor: (text.trim() || pendingMedia.length > 0) ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s", boxShadow: (text.trim() || pendingMedia.length > 0) ? "0 2px 10px rgba(203,38,228,0.35)" : "none" }}>
          {sendMutation.isPending
            ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 0.8s linear infinite" }} />
            : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}
// ── Main ClassDetail ───────────────────────────────────────────
type Props = { cls?: Class; onBack?: () => void }

export default function ClassDetail({ cls: clsProp, onBack }: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const goBack = onBack ?? (() => navigate("/classes"))
  const [tab, setTab] = useState<"overview"|"lessons"|"members"|"discussion">("overview")
  const { isLearner, isTeacher, isAdmin } = useAuth()

  const currentUser = useAuthStore(s => s.user)
  const queryClient = useQueryClient()

  const { data: fetchedCls, isLoading: loadingCls } = useQuery({
    queryKey: ["class-detail", id],
    queryFn: async () => {
      const res = await api.get(`/classes/${id}`)
      return res.data as Class
    },
    enabled: !clsProp && !!id,
    staleTime: 30000,
  })

  const cls = clsProp ?? fetchedCls
  const isOwner = !!cls && ((cls.teacher_id ?? cls.teacher?.id) === currentUser?.id)


  // Check enrollment via /classes/enrolled (works for all roles, no chicken-and-egg)
  const { data: enrolledClasses = [] } = useQuery({
    queryKey: ["classes-enrolled"],
    queryFn: async () => {
      const res = await api.get("/classes/enrolled").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 30000,
  })
  const isEnrolled = !!cls && enrolledClasses.some((c: any) => c.id === cls.id)

  const { data: lessons = [] } = useQuery({
    queryKey: ["class-lessons", cls?.id],
    queryFn: async () => {
      const res = await api.get(`/lessons?class_id=${cls.id}`).catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data as Lesson[] : []
    },
  })

  const { data: members = [] } = useQuery({
    queryKey: ["class-members", cls?.id],
    queryFn: async () => {
      const res = await api.get(endpoints.classes.members(cls.id)).catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data as ClassMemberData[] : []
    },
  })

  const joinMutation = useMutation({
    mutationFn: async () => api.post(endpoints.classes.join(cls!.id), {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      queryClient.invalidateQueries({ queryKey: ["class-members", cls?.id] })
      queryClient.invalidateQueries({ queryKey: ["classes-enrolled"] })
    },
  })

  const leaveMutation = useMutation({
    mutationFn: async () => api.post(endpoints.classes.leave(cls!.id), {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      queryClient.invalidateQueries({ queryKey: ["class-members", cls?.id] })
    },
  })

  // isMember: owner, admin, enrolled (from /classes/enrolled), or any teacher
  // ── Early returns AFTER all hooks ──
  if (!clsProp && loadingCls) return (
    <AppShell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "4px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
      </div>
    </AppShell>
  )

  if (!cls) return (
    <AppShell>
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Class not found</div>
        <button onClick={goBack} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "var(--accent)", color: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Go Back</button>
      </div>
    </AppShell>
  )

  // Early returns AFTER all hooks
  if (!clsProp && loadingCls) return (
    <AppShell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "4px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
      </div>
    </AppShell>
  )
  if (!cls) return (
    <AppShell>
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Class not found</div>
        <button onClick={goBack} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "var(--accent)", color: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Go Back</button>
      </div>
    </AppShell>
  )

  const isMember = isOwner || isAdmin || isEnrolled || (isTeacher && !isLearner)
  const canAccess = isMember

  const visibleLessons = canAccess ? lessons : lessons.filter((l: Lesson) => l.visibility === "public")
  const lockedLessons = canAccess ? [] : lessons.filter((l: Lesson) => l.visibility !== "public")

  const TABS = [
    { key: "overview" as const,    label: "Overview",                              icon: <BookOpen size={13} /> },
    { key: "lessons" as const,     label: `Lessons (${lessons.length})`,           icon: <FileText size={13} /> },
    { key: "members" as const,     label: `Members (${members.length})`,           icon: <Users size={13} /> },
    { key: "discussion" as const,  label: "Discussion",                            icon: <MessageCircle size={13} /> },
  ]

  return (
    <AppShell>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 60px" }}>
        <button className="btn" onClick={goBack} style={{ marginBottom: 20, fontSize: 13 }}>
          <ChevronLeft size={15} /> Back
        </button>

        {/* Header card */}
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ height: 5, background: "linear-gradient(90deg,#cb26e4,#38bdf8)" }} />
          <div style={{ padding: "20px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                <span className="chip">{cls.class_code}</span>
                {cls.grade_level && <span className="chip">{cls.grade_level}</span>}
                <span className="chip" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  {cls.visibility === "public" ? <Globe size={10} /> : <Lock size={10} />} {cls.visibility}
                </span>
                {isMember && (
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(34,197,94,0.12)", color: "var(--success)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 size={10} /> {isOwner ? "Your class" : "Enrolled"}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px" }}>{cls.title}</h1>
              {cls.subject && <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 2 }}>📚 {cls.subject.name}</div>}
              {cls.teacher && <div style={{ color: "var(--muted)", fontSize: 13 }}>👤 {cls.teacher.full_name}</div>}
              {cls.description && <p style={{ color: "var(--muted)", fontSize: 13, margin: "10px 0 0", lineHeight: 1.6 }}>{cls.description}</p>}
            </div>
            {isLearner && !isOwner && (
              isMember ? (
                <button className="btn" style={{ fontSize: 13, color: "var(--danger)" }}
                  onClick={() => { if (window.confirm("Leave this class?")) leaveMutation.mutate() }}
                  disabled={leaveMutation.isPending}>
                  <UserMinus size={14} /> {leaveMutation.isPending ? "Leaving..." : "Leave Class"}
                </button>
              ) : (
                <button className="btn btn-primary" style={{ fontSize: 13 }}
                  onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}>
                  <UserPlus size={14} /> {joinMutation.isPending ? "Joining..." : "Join Class"}
                </button>
              )
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderTop: "1px solid var(--border)" }}>
            {[
              { label: "Lessons", value: lessons.length, color: "#cb26e4" },
              { label: "Members", value: members.length, color: "#38bdf8" },
              { label: "Status", value: cls.status ?? "Active", color: "#22c55e" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "14px", textAlign: "center", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Non-member banner */}
        {!canAccess && lockedLessons.length > 0 && (
          <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(203,38,228,0.05)", border: "1px solid rgba(203,38,228,0.18)", display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <ShieldAlert size={20} style={{ color: "#cb26e4", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>Some content is members-only</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{lockedLessons.length} lesson{lockedLessons.length !== 1 ? "s" : ""} locked. Join to unlock.</div>
            </div>
            <button onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}
              style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
              <UserPlus size={13} style={{ marginRight: 5 }} /> Join
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs-bar" style={{ marginBottom: 18 }}>
          {TABS.map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

{/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="card">
          <div className="card-head"><span className="card-title">📖 Recent Lessons</span>
              <button className="btn" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setTab("lessons")}>View all</button>
            </div>
            {lessons.length === 0 ? <p className="card-sub">No lessons yet.</p>
              : lessons.slice(0, 5).map((l: Lesson) => (
                <div key={l.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {!canAccess && l.visibility !== "public" && <Lock size={12} style={{ color: "var(--muted)" }} />}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: !canAccess && l.visibility !== "public" ? "var(--muted)" : "var(--text)" }}>{l.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.lesson_type}</div>
                    </div>
                  </div>
                  <span className="chip" style={{ fontSize: 10 }}>{l.status}</span>
                </div>
              ))}
          </div>
        )}

          {/* ── LESSONS ── */}
        {tab === "lessons" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleLessons.map((l: Lesson) => (
              <div key={l.id} className="card hover-lift" style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", padding: "14px 18px" }}
                onClick={() => window.location.href = "/lessons"}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(203,38,228,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#cb26e4", flexShrink: 0 }}>
                  <FileText size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{l.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.lesson_type} · {new Date(l.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {l.visibility === "public" ? <Globe size={12} style={{ color: "#38bdf8" }} /> : <Lock size={12} style={{ color: "var(--muted)" }} />}
                  <span className="chip" style={{ fontSize: 11, color: l.status === "published" ? "var(--success)" : "var(--muted)" }}>{l.status}</span>
                </div>
              </div>
            ))}
            {lockedLessons.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
                  <Lock size={11} /> {lockedLessons.length} lesson{lockedLessons.length !== 1 ? "s" : ""} require membership
                </div>
                {lockedLessons.map((l: Lesson) => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)", opacity: 0.6 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Lock size={16} style={{ color: "var(--muted)" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--muted)" }}>{l.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Join class to access this lesson</div>
                    </div>
                  </div>
                ))}
                <JoinWall cls={cls} onJoin={() => joinMutation.mutate()} joining={joinMutation.isPending} />
              </>
            )}
            {lessons.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: 40 }}>
                <p className="card-sub">No lessons in this class yet.</p>
              </div>
            )}
          </div>
        )}

          {/* ── MEMBERS ── */}
        {tab === "members" && (
          <div className="card">
            <div className="card-head">
            <span className="card-title">👥 Members</span>
              <span className="chip">{members.length + (cls.teacher ? 1 : 0)}</span>
            </div>
            {cls.teacher && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <Avatar name={cls.teacher.full_name} role="teacher" size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cls.teacher.full_name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{(cls.teacher as any).email}</div>
                </div>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "rgba(203,38,228,0.1)", color: "#cb26e4", fontWeight: 700 }}>👨‍🏫 Teacher</span>
              </div>
            )}
            {canAccess ? (
              members.length === 0
                ? <p className="card-sub" style={{ marginTop: 12 }}>No learners have joined yet.</p>
                : members.map((m: ClassMemberData) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <Avatar name={m.learner.full_name} role="learner" size={34} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.learner.full_name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.learner.email}</div>
                    </div>
                    <span className="chip" style={{ fontSize: 11 }}>{m.status}</span>
                  </div>
                ))
            ) : (
              <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)" }}>
                <Lock size={22} style={{ opacity: 0.4, marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>Join the class to see members.</div>
              </div>
            )}
          </div>
        )}

          {/* ── DISCUSSION ── */}
        {tab === "discussion" && (
          canAccess
            ? <ClassChat cls={cls} currentUser={currentUser} />
            : <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                  <MessageCircle size={15} style={{ color: "#cb26e4" }} />
                  <span style={{ fontWeight: 800 }}>Class Discussion</span>
                </div>
                <JoinWall cls={cls} onJoin={() => joinMutation.mutate()} joining={joinMutation.isPending} />
              </div>
        )}
      </div>
    </AppShell>
  )
}
