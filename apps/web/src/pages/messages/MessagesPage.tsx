import { useState, useEffect, useRef, useCallback } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"
import {
  Search, Send, Plus, MoreVertical, ArrowLeft,
  CheckCheck, Check, MessageCircle, X, Lock,
  Circle, Users, Phone, Video, Bell, BellOff,
  Trash2, UserPlus, Globe, Info, Copy, Forward,
  Smile, Image as ImageIcon, Paperclip, Mic,
  Shield, GraduationCap, BookOpen, MessageSquare,
  ChevronRight, Star, Flag, Eye, EyeOff
} from "lucide-react"

// ── Types ──────────────────────────────────────────
interface UserProfile { avatar_url?: string | null; bio?: string | null; location?: string | null; profession?: string | null }
interface UserMini { id: number; full_name: string; email: string; role: string; profile?: UserProfile }
interface Participant { id: number; conversation_id: number; user_id: number; role: string; is_muted: boolean; user?: UserMini }
interface Reaction { emoji: string; count: number; users: number[] }
interface Message {
  id: number; conversation_id: number; sender_id: number
  content: string; message_type: string
  is_edited: boolean; is_deleted: boolean
  created_at: string; updated_at: string
  sender?: UserMini; temp?: boolean; error?: boolean
  reactions?: Record<string, Reaction>
}
interface LastMessage { id: number; content: string; sender_id: number; created_at: string; is_deleted: boolean }
interface Conversation {
  id: number; conversation_type: string; title?: string
  is_active: boolean; created_at: string; updated_at: string
  participants?: Participant[]; last_message?: LastMessage; unread_count?: number
}

// ── Constants ──
const EMOJIS = ["👍","❤️","😂","😮","😢","🔥","👏","🎉","💯","✅"]
const ROLE_COLOR: Record<string, string> = { teacher: "#cb26e4", learner: "#38bdf8", admin: "#ef4444" }
const ROLE_ICON: Record<string, React.ReactNode> = {
  teacher: <GraduationCap size={12} />,
  learner: <BookOpen size={12} />,
  admin: <Shield size={12} />
}

// ── Helpers ────────────────────────────────────────
function getBaseUrl() { return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") || "http://localhost:8000" }
function resolveAvatar(url?: string | null) {
  if (!url) return null
  return url.startsWith("http") ? url : `${getBaseUrl()}${url}`
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
}
function formatDateLabel(d: string) {
  const date = new Date(d)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}
function getOtherParticipant(conv: Conversation, myId: number): UserMini | null {
  const other = conv.participants?.find(p => p.user_id !== myId)
  return other?.user ?? null
}
function getConvName(conv: Conversation, myId: number): string {
  if (conv.conversation_type === "direct") {
    const other = getOtherParticipant(conv, myId)
    return other?.full_name ?? "Unknown"
  }
  if (conv.title) return conv.title
  return "Group Chat"
}

// ── Avatar Component ──
function Avatar({ name, url, size = 40, online = false }: { name: string; url?: string | null; size?: number; online?: boolean }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  const resolved = resolveAvatar(url)
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {resolved
        ? <img src={resolved} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
        : <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg,${color},${color}99)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38 }}>
            {name?.[0]?.toUpperCase()}
          </div>
      }
      {online !== undefined && (
        <div style={{ position: "absolute", bottom: 1, right: 1, width: Math.max(8, size * 0.22), height: Math.max(8, size * 0.22), borderRadius: "50%", background: online ? "#22c55e" : "#94a3b8", border: "2px solid var(--card)", transition: "background 0.3s" }} />
      )}
    </div>
  )
}

// ── Profile Sidebar ──
function ProfileSidebar({ user: targetUser, isOnline, onClose, onMessage, myId }: {
  user: UserMini; isOnline: boolean; onClose: () => void; onMessage?: () => void; myId: number
}) {
  const navigate = useNavigate()
  const color = ROLE_COLOR[targetUser.role] ?? "var(--accent)"
  return (
    <div style={{ width: 300, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--card)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>Profile Info</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {/* Avatar + name */}
      <div style={{ padding: "24px 20px", textAlign: "center", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <Avatar name={targetUser.full_name} url={targetUser.profile?.avatar_url} size={80} online={isOnline} />
        </div>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>{targetUser.full_name}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 8 }}>
          <span style={{ color, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: `${color}12`, border: `1px solid ${color}25` }}>
            {ROLE_ICON[targetUser.role]} {targetUser.role.charAt(0).toUpperCase() + targetUser.role.slice(1)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: isOnline ? "#22c55e" : "var(--muted)", fontWeight: 600 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isOnline ? "#22c55e" : "#94a3b8" }} />
          {isOnline ? "Online now" : "Offline"}
        </div>
      </div>

      {/* Bio */}
      {targetUser.profile?.bio && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>About</div>
          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, margin: 0 }}>{targetUser.profile.bio}</p>
        </div>
      )}

      {/* Details */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Details</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Globe size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "var(--text)" }}>{targetUser.email}</span>
          </div>
          {targetUser.profile?.location && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Info size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--text)" }}>{targetUser.profile.location}</span>
            </div>
          )}
          {targetUser.profile?.profession && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Star size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--text)" }}>{targetUser.profile.profession}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => navigate(`/profile/${targetUser.id}`)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>View Full Profile</span>
          <ChevronRight size={14} style={{ color: "var(--muted)" }} />
        </button>
        <button
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>Block User</span>
          <Shield size={14} style={{ color: "var(--danger)" }} />
        </button>
      </div>
    </div>
  )
}

// ── More Menu ──
function MoreMenu({ onClose, onViewProfile, onMute, onClearChat, onDelete }: {
  onClose: () => void; onViewProfile: () => void; onMute: () => void; onClearChat: () => void; onDelete: () => void
}) {
  const items = [
    { icon: <Eye size={15} />, label: "View Profile", action: onViewProfile, color: "var(--text)" },
    { icon: <Bell size={15} />, label: "Mute Notifications", action: onMute, color: "var(--text)" },
    { icon: <Flag size={15} />, label: "Report", action: onClose, color: "var(--warning)" },
    { icon: <Trash2 size={15} />, label: "Clear Chat", action: onClearChat, color: "var(--danger)" },
    { icon: <X size={15} />, label: "Delete Conversation", action: onDelete, color: "var(--danger)" },
  ]
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500 }} onClick={onClose}>
      <div style={{ position: "absolute", top: 60, right: 16, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", minWidth: 220, overflow: "hidden" }}
        onClick={e => e.stopPropagation()}>
        {items.map((item, i) => (
          <button key={i} onClick={() => { item.action(); onClose() }}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "none", background: "transparent", cursor: "pointer", width: "100%", textAlign: "left", color: item.color, fontSize: 14, fontWeight: 600, fontFamily: "inherit", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.1s" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Emoji Picker ──
function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  return (
    <div style={{ position: "absolute", bottom: "100%", left: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", display: "flex", gap: 4, flexWrap: "wrap", width: 220 }}>
      {EMOJIS.map(emoji => (
        <button key={emoji} onClick={() => { onSelect(emoji); onClose() }}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: "4px 6px", borderRadius: 8, transition: "background 0.1s" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
          {emoji}
        </button>
      ))}
    </div>
  )
}

// ── Main Page ──
export default function MessagesPage() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [message, setMessage] = useState("")
  const [search, setSearch] = useState("")
  const [userSearch, setUserSearch] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")
  const [searchUsers, setSearchUsers] = useState<UserMini[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null)
  const [msgReactions, setMsgReactions] = useState<Record<number, Record<string, number>>>({})
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768)

  // Real-time state
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({})
  const [onlineUsers, setOnlineUsers] = useState<number[]>([])
  const [readReceipts, setReadReceipts] = useState<Record<number, string>>({})
  const [deliveredMsgs, setDeliveredMsgs] = useState<Set<number>>(new Set())
  const typingTimeoutRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const isTypingRef = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  const otherUser = activeConv ? getOtherParticipant(activeConv, user?.id ?? 0) : null
  const isOtherOnline = otherUser ? onlineUsers.includes(otherUser.id) : false

  // ── Queries ──
  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const res = await api.get(endpoints.messaging.list)
      return Array.isArray(res.data) ? res.data as Conversation[] : []
    },
    refetchInterval: 5000,
    staleTime: 0,
  })

  const { data: messages = [], isLoading: msgLoading } = useQuery({
    queryKey: ["messages", activeConv?.id, user?.id],
    queryFn: async () => {
      const res = await api.get(endpoints.messaging.messages(activeConv!.id))
      return Array.isArray(res.data) ? res.data as Message[] : []
    },
    enabled: !!activeConv,
    refetchInterval: false,
    staleTime: 0,
  })

  // ── Mutations ──
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(endpoints.messaging.sendMessage(activeConv!.id), { content, message_type: "text" })
      return res.data as Message
    },
    onMutate: async (content) => {
      const temp: Message = {
        id: Date.now() * -1, conversation_id: activeConv!.id,
        sender_id: user!.id, content, message_type: "text",
        is_edited: false, is_deleted: false,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        temp: true,
        sender: { id: user!.id, full_name: user!.full_name ?? "", email: user!.email ?? "", role: user!.role ?? "" }
      }
      queryClient.setQueryData(["messages", activeConv?.id, user?.id], (old: Message[] = []) => [...old, temp])
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData(["messages", activeConv?.id, user?.id], (old: Message[] = []) =>
        old.map(m => m.temp ? newMsg : m)
      )
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ ...newMsg, type: "message" }))
      }
    },
    onError: () => {
      queryClient.setQueryData(["messages", activeConv?.id, user?.id], (old: Message[] = []) =>
        old.map(m => m.temp ? { ...m, error: true, temp: false } : m)
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (msgId: number) => api.delete(endpoints.messaging.deleteMessage(msgId)),
    onSuccess: (_, msgId) => {
      queryClient.setQueryData(["messages", activeConv?.id, user?.id], (old: Message[] = []) =>
        old.map(m => m.id === msgId ? { ...m, is_deleted: true, content: "This message was deleted" } : m)
      )
    },
  })

  // ── WebSocket ──
  useEffect(() => {
    if (!activeConv) return
    const token = localStorage.getItem("learnex_access_token")
    if (!token) return
    const wsBase = import.meta.env.VITE_WS_URL || "ws://localhost:8000"
    const ws = new WebSocket(`${wsBase}/api/v1/messaging/ws/${activeConv.id}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => ws.send(JSON.stringify({ type: "ping" }))

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === "message" && data.sender_id !== user?.id) {
          queryClient.setQueryData(["messages", activeConv.id, user?.id], (old: Message[] = []) =>
            old.find(m => m.id === data.id) ? old : [...old, data]
          )
          queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
          ws.send(JSON.stringify({ type: "read", message_id: data.id }))
          ws.send(JSON.stringify({ type: "delivered", message_id: data.id }))
        } else if (data.type === "typing") {
          const uid = data.user_id as number
          if (data.is_typing) {
            setTypingUsers(prev => ({ ...prev, [uid]: data.user_name }))
            if (typingTimeoutRef.current[uid]) clearTimeout(typingTimeoutRef.current[uid])
            typingTimeoutRef.current[uid] = setTimeout(() => {
              setTypingUsers(prev => { const n = { ...prev }; delete n[uid]; return n })
            }, 3000)
          } else {
            setTypingUsers(prev => { const n = { ...prev }; delete n[uid]; return n })
          }
        } else if (data.type === "read_receipt") {
          setReadReceipts(prev => ({ ...prev, [data.message_id]: data.read_by_name }))
        } else if (data.type === "delivered") {
          if (data.message_id) setDeliveredMsgs(prev => new Set([...prev, data.message_id]))
        } else if (data.type === "presence") {
          setOnlineUsers(data.online_users || [])
        }
      } catch {}
    }

    ws.onclose = () => { setOnlineUsers([]); setTypingUsers({}) }

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }))
    }, 25000)

    return () => { ws.close(); clearInterval(ping) }
  }, [activeConv?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typingUsers])

  useEffect(() => {
    if (!showNewChat) { setSearchUsers([]); return }
    api.get(`/users/search?q=${encodeURIComponent(userSearch)}&limit=20`)
      .then(res => setSearchUsers((Array.isArray(res.data) ? res.data : []).filter((u: UserMini) => u.id !== user?.id)))
      .catch(() => {})
  }, [showNewChat, userSearch])

  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", is_typing: isTyping }))
    }
  }, [])

  const handleMessageChange = useCallback((val: string) => {
    setMessage(val)
    if (!isTypingRef.current && val.length > 0) { isTypingRef.current = true; sendTyping(true) }
    else if (isTypingRef.current && val.length === 0) { isTypingRef.current = false; sendTyping(false) }
  }, [sendTyping])

  const handleSend = useCallback(() => {
    const text = message.trim()
    if (!text || !activeConv) return
    isTypingRef.current = false; sendTyping(false)
    const content = replyTo
      ? `> ${replyTo.sender?.full_name ?? "Someone"}: ${replyTo.content.slice(0, 60)}${replyTo.content.length > 60 ? "..." : ""}\n\n${text}`
      : text
    sendMutation.mutate(content)
    setMessage(""); setReplyTo(null)
  }, [message, activeConv, replyTo, sendMutation, sendTyping])

  const openConv = useCallback((conv: Conversation) => {
    setActiveConv(conv); setMobileView("chat")
    setReadReceipts({}); setDeliveredMsgs(new Set()); setTypingUsers({})
    setShowProfile(false); setShowMoreMenu(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const startDirect = useCallback(async (targetUser: UserMini) => {
    const res = await api.post(endpoints.messaging.createDirect, { recipient_user_id: targetUser.id })
    const conv = res.data as Conversation
    queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
    setShowNewChat(false); openConv(conv)
  }, [queryClient, user?.id, openConv])

  const addReaction = useCallback((msgId: number, emoji: string) => {
    setMsgReactions(prev => {
      const cur = prev[msgId] ?? {}
      return { ...prev, [msgId]: { ...cur, [emoji]: (cur[emoji] ?? 0) + 1 } }
    })
    setShowEmojiPicker(null)
  }, [])

  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content).catch(() => {})
  }, [])

  const filtered = conversations.filter(c =>
    getConvName(c, user?.id ?? 0).toLowerCase().includes(search.toLowerCase())
  )

  // ── RENDER ──
  return (
    <AppShell>
      <div style={{ display: "flex", height: "calc(100vh - 60px)", overflow: "hidden", background: "var(--bg)" }}>

        {/* ══ LEFT: Conversation List ══ */}
        <div style={{
          width: isMobile ? "100%" : 320, flexShrink: 0,
          display: isMobile && mobileView === "chat" ? "none" : "flex",
          flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--card)",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: 900, fontSize: 18 }}>Messages</span>
              <button onClick={() => setShowNewChat(true)}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "var(--accent)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Plus size={16} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "var(--bg2)", border: "1px solid var(--border)" }}>
              <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..."
                style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--text)", width: "100%", fontFamily: "inherit" }} />
            </div>
          </div>
          <div style={{ padding: "5px 16px", background: "rgba(203,38,228,0.04)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={10} style={{ color: "var(--muted)" }} />
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>End-to-end encrypted</span>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {convLoading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading conversations...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center" }}>
                <MessageCircle size={32} style={{ color: "var(--muted)", marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>No conversations</div>
                <button onClick={() => setShowNewChat(true)}
                  style={{ marginTop: 12, padding: "8px 16px", borderRadius: 20, border: "none", background: "var(--accent)", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                  Start chatting
                </button>
              </div>
            ) : filtered.map(conv => {
              const name = getConvName(conv, user?.id ?? 0)
              const other = getOtherParticipant(conv, user?.id ?? 0)
              const isActive = activeConv?.id === conv.id
              const isMine = conv.last_message?.sender_id === user?.id
              const isOnline = other ? onlineUsers.includes(other.id) : false
              const hasUnread = (conv.unread_count ?? 0) > 0

              return (
                <div key={conv.id} onClick={() => openConv(conv)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                    cursor: "pointer", borderBottom: "1px solid var(--border)",
                    background: isActive ? "rgba(203,38,228,0.06)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                    transition: "all 0.1s",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg2)" }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                  <Avatar name={name} url={other?.profile?.avatar_url} size={46} online={isOnline} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontWeight: hasUnread ? 800 : 700, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                      <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0, marginLeft: 6 }}>
                        {conv.last_message ? timeAgo(conv.last_message.created_at) : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {isMine && <CheckCheck size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />}
                      <span style={{ fontSize: 12, color: hasUnread ? "var(--text)" : "var(--muted)", fontWeight: hasUnread ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {conv.last_message?.is_deleted ? "🚫 Message deleted" : conv.last_message?.content ?? "Start a conversation"}
                      </span>
                      {hasUnread && (
                        <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: "var(--accent)", color: "white", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0 }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ══ MIDDLE: Chat Area ══ */}
        <div style={{
          flex: 1, display: isMobile && mobileView === "list" ? "none" : "flex",
          flexDirection: "column", minWidth: 0, background: "var(--bg)", position: "relative"
        }}>
          {!activeConv ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
              <MessageCircle size={56} style={{ marginBottom: 16, opacity: 0.15 }} />
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: "var(--text)" }}>Your Messages</div>
              <div style={{ fontSize: 14, marginBottom: 24 }}>Select a conversation or start a new one</div>
              <button onClick={() => setShowNewChat(true)}
                style={{ padding: "12px 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 800, cursor: "pointer", fontSize: 14, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(203,38,228,0.35)" }}>
                <Plus size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
                New Message
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                {isMobile && (
                  <button onClick={() => { setMobileView("list"); setActiveConv(null) }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", padding: 4, display: "flex" }}>
                    <ArrowLeft size={20} />
                  </button>
                )}
                <div style={{ cursor: "pointer" }} onClick={() => setShowProfile(v => !v)}>
                  <Avatar name={getConvName(activeConv, user?.id ?? 0)} url={otherUser?.profile?.avatar_url} size={40} online={isOtherOnline} />
                </div>
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setShowProfile(v => !v)}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{getConvName(activeConv, user?.id ?? 0)}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: Object.keys(typingUsers).length > 0 ? "var(--accent)" : isOtherOnline ? "#22c55e" : "var(--muted)" }}>
                    {Object.keys(typingUsers).length > 0
                      ? `${Object.values(typingUsers)[0]} is typing...`
                      : isOtherOnline ? "● Online now" : "○ Offline"}
                  </div>
                </div>
                {/* Header actions */}
                <div style={{ display: "flex", gap: 4 }}>
                  <button title="Voice call"
                    style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                    <Phone size={15} />
                  </button>
                  <button title="Video call"
                    style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                    <Video size={15} />
                  </button>
                  <button onClick={() => setShowMoreMenu(v => !v)} title="More options"
                    style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                    <MoreVertical size={15} />
                  </button>
                </div>
              </div>

              {/* More menu */}
              {showMoreMenu && (
                <MoreMenu
                  onClose={() => setShowMoreMenu(false)}
                  onViewProfile={() => { setShowProfile(true); setShowMoreMenu(false) }}
                  onMute={() => {}}
                  onClearChat={() => {}}
                  onDelete={() => {}}
                />
              )}

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
                {msgLoading ? (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", padding: 40 }}>
                    {otherUser && <Avatar name={otherUser.full_name} url={otherUser.profile?.avatar_url} size={64} online={isOtherOnline} />}
                    <div style={{ fontWeight: 800, fontSize: 16, marginTop: 16, marginBottom: 4, color: "var(--text)" }}>{getConvName(activeConv, user?.id ?? 0)}</div>
                    {otherUser && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: ROLE_COLOR[otherUser.role], fontWeight: 700, marginBottom: 8 }}>{ROLE_ICON[otherUser.role]} {otherUser.role}</span>}
                    <div style={{ fontSize: 13 }}>Say hello! 👋</div>
                  </div>
                ) : messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user?.id
                  const prev = messages[idx - 1]
                  const next = messages[idx + 1]
                  const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString()
                  const showAvatar = !isOwn && (!next || next.sender_id !== msg.sender_id)
                  const showName = !isOwn && (!prev || prev.sender_id !== msg.sender_id)
                  const isGrouped = !showDate && !!prev && prev.sender_id === msg.sender_id
                  const reactions = msgReactions[msg.id] ?? {}
                  const isHovered = hoveredMsg === msg.id

                  return (
                    <div key={msg.id} style={{ marginBottom: isGrouped ? 1 : 6 }}>
                      {showDate && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 10px" }}>
                          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: "var(--bg2)", border: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                            {formatDateLabel(msg.created_at)}
                          </span>
                          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8, position: "relative" }}
                        onMouseEnter={() => setHoveredMsg(msg.id)}
                        onMouseLeave={() => { setHoveredMsg(null); setShowEmojiPicker(null) }}>

                        {!isOwn && (
                          <div style={{ width: 34, flexShrink: 0, alignSelf: "flex-end" }}>
                            {showAvatar && <Avatar name={msg.sender?.full_name ?? "?"} url={msg.sender?.profile?.avatar_url} size={32} />}
                          </div>
                        )}

                        <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start", gap: 2 }}>
                          {showName && !isOwn && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLOR[msg.sender?.role ?? ""] ?? "var(--muted)", paddingLeft: 4, display: "flex", alignItems: "center", gap: 4 }}>
                              {ROLE_ICON[msg.sender?.role ?? ""]} {msg.sender?.full_name}
                            </span>
                          )}

                          {/* Bubble */}
                          <div style={{
                            padding: msg.is_deleted ? "8px 12px" : "10px 14px",
                            borderRadius: isOwn
                              ? isGrouped ? "18px 4px 4px 18px" : "18px 4px 18px 18px"
                              : isGrouped ? "4px 18px 18px 4px" : "4px 18px 18px 18px",
                            background: msg.error ? "rgba(239,68,68,0.1)"
                              : msg.is_deleted ? "var(--bg2)"
                              : isOwn ? "linear-gradient(135deg,#cb26e4,#8b5cf6)"
                              : "var(--card)",
                            border: msg.is_deleted || msg.error || !isOwn ? "1px solid var(--border)" : "none",
                            color: msg.is_deleted ? "var(--muted)" : msg.error ? "var(--danger)" : isOwn ? "white" : "var(--text)",
                            fontSize: 14, lineHeight: 1.55,
                            fontStyle: msg.is_deleted ? "italic" : "normal",
                            opacity: msg.temp ? 0.7 : 1,
                            boxShadow: isOwn && !msg.is_deleted ? "0 2px 12px rgba(203,38,228,0.25)" : "0 1px 4px rgba(0,0,0,0.06)",
                            whiteSpace: "pre-wrap", wordBreak: "break-word",
                            cursor: "default", transition: "opacity 0.2s",
                          }}>
                            {msg.content}
                          </div>

                          {/* Reactions */}
                          {Object.keys(reactions).length > 0 && (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingLeft: isOwn ? 0 : 4 }}>
                              {Object.entries(reactions).map(([emoji, count]) => (
                                <button key={emoji} onClick={() => addReaction(msg.id, emoji)}
                                  style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                                  {emoji} <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{count}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Time + status */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0 }}>
                            <span style={{ fontSize: 10, color: "var(--muted)" }}>{formatTime(msg.created_at)}</span>
                            {msg.is_edited && <span style={{ fontSize: 10, color: "var(--muted)" }}>· edited</span>}
                            {isOwn && !msg.is_deleted && (
                              msg.error ? <span style={{ fontSize: 10, color: "var(--danger)", fontWeight: 600 }}>Failed ✕</span>
                              : msg.temp ? <Circle size={10} style={{ color: "var(--muted)", opacity: 0.5 }} />
                              : readReceipts[msg.id] ? (
                                <span title={`Read by ${readReceipts[msg.id]}`} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                  <CheckCheck size={13} style={{ color: "#38bdf8" }} />
                                </span>
                              ) : deliveredMsgs.has(msg.id) ? (
                                <CheckCheck size={13} style={{ color: "var(--muted)" }} title="Delivered" />
                              ) : (
                                <Check size={13} style={{ color: "var(--muted)", opacity: 0.6 }} title="Sent" />
                              )
                            )}
                          </div>
                        </div>

                        {/* Hover actions */}
                        {isHovered && !msg.is_deleted && (
                          <div style={{
                            display: "flex", gap: 4, alignItems: "center", flexShrink: 0,
                            order: isOwn ? -1 : 1, position: "relative"
                          }}>
                            {/* Emoji reaction */}
                            <div style={{ position: "relative" }}>
                              <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                                style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}
                                title="React">
                                <Smile size={14} style={{ color: "var(--muted)" }} />
                              </button>
                              {showEmojiPicker === msg.id && (
                                <EmojiPicker onSelect={emoji => addReaction(msg.id, emoji)} onClose={() => setShowEmojiPicker(null)} />
                              )}
                            </div>
                            {/* Reply */}
                            <button onClick={() => setReplyTo(msg)}
                              style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                              title="Reply">
                              <Forward size={14} style={{ color: "var(--muted)" }} />
                            </button>
                            {/* Copy */}
                            <button onClick={() => copyMessage(msg.content)}
                              style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                              title="Copy">
                              <Copy size={14} style={{ color: "var(--muted)" }} />
                            </button>
                            {/* Delete own */}
                            {isOwn && (
                              <button onClick={() => deleteMutation.mutate(msg.id)}
                                style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                title="Delete">
                                <Trash2 size={14} style={{ color: "var(--danger)" }} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Typing indicator */}
                {Object.keys(typingUsers).length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 8px" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "var(--muted)", flexShrink: 0 }}>
                      {Object.values(typingUsers)[0]?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "4px 18px 18px 18px", padding: "10px 16px", display: "flex", gap: 5, alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--muted)", display: "inline-block", animation: `bounce 1.2s infinite ${delay}s` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{Object.values(typingUsers)[0]} is typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply preview */}
              {replyTo && (
                <div style={{ padding: "8px 16px", background: "rgba(203,38,228,0.06)", borderTop: "1px solid rgba(203,38,228,0.15)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <div style={{ width: 3, borderRadius: 2, background: "var(--accent)", alignSelf: "stretch", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>Replying to {replyTo.sender?.full_name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.content.slice(0, 80)}</div>
                  </div>
                  <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Input Bar */}
              <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", background: "var(--card)", display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 24, background: "var(--bg2)", border: "1px solid var(--border)" }}>
                  <input ref={inputRef} value={message} onChange={e => handleMessageChange(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder={`Message ${getConvName(activeConv, user?.id ?? 0)}...`}
                    style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: "var(--text)", fontFamily: "inherit" }} />
                </div>
                <button onClick={handleSend} disabled={!message.trim() || sendMutation.isPending}
                  style={{
                    width: 44, height: 44, borderRadius: "50%", border: "none",
                    background: message.trim() ? "linear-gradient(135deg,#cb26e4,#8b5cf6)" : "var(--bg2)",
                    color: message.trim() ? "white" : "var(--muted)",
                    cursor: message.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    boxShadow: message.trim() ? "0 4px 14px rgba(203,38,228,0.35)" : "none",
                    transition: "all 0.2s",
                  }}>
                  {sendMutation.isPending ? <Circle size={16} style={{ opacity: 0.5 }} /> : <Send size={17} style={{ marginLeft: 1 }} />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ══ RIGHT: Profile Sidebar ══ */}
        {showProfile && activeConv && otherUser && !isMobile && (
          <ProfileSidebar
            user={otherUser}
            isOnline={isOtherOnline}
            onClose={() => setShowProfile(false)}
            myId={user?.id ?? 0}
          />
        )}

        {/* Profile Sidebar - mobile overlay */}
        {showProfile && activeConv && otherUser && isMobile && (
          <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex" }}>
            <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowProfile(false)} />
            <div style={{ width: 300, background: "var(--card)", overflowY: "auto" }}>
              <ProfileSidebar user={otherUser} isOnline={isOtherOnline} onClose={() => setShowProfile(false)} myId={user?.id ?? 0} />
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 700, padding: 16 }}>
          <div style={{ background: "var(--card)", borderRadius: 20, width: "100%", maxWidth: 440, border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>New Message</span>
              <button onClick={() => setShowNewChat(false)} style={{ background: "var(--bg2)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 16, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "var(--bg2)", border: "1px solid var(--border)" }}>
                <Search size={14} style={{ color: "var(--muted)" }} />
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search users..." autoFocus
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: 14, color: "var(--text)", width: "100%", fontFamily: "inherit" }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>
              {searchUsers.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  {userSearch ? "No users found" : "Search to find someone"}
                </div>
              ) : searchUsers.map(u => (
                <button key={u.id} onClick={() => startDirect(u)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", width: "100%", textAlign: "left", fontFamily: "inherit", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <Avatar name={u.full_name} url={u.profile?.avatar_url} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{u.full_name}</div>
                    <div style={{ fontSize: 12, color: ROLE_COLOR[u.role] ?? "var(--muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      {ROLE_ICON[u.role]} {u.role} · {u.email}
                    </div>
                  </div>
                  <MessageSquare size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}