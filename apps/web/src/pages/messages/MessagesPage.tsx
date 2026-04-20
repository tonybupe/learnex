import { useState, useEffect, useRef, useCallback } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"
import {
  Search, Send, Plus, MoreVertical, Phone, Video,
  ArrowLeft, CheckCheck, Check, MessageCircle, X, Lock,
  Smile, Image, Users, GraduationCap, BookOpen, Shield,
  Bell, Trash2, UserPlus, UserMinus, Globe, Info,
  Circle, ChevronDown, Edit3
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────
interface UserProfile { avatar_url?: string | null; bio?: string | null }
interface UserMini { id: number; full_name: string; email: string; role: string; profile?: UserProfile }
interface Participant { id: number; conversation_id: number; user_id: number; role: string; is_muted: boolean; user?: UserMini }
interface Message {
  id: number; conversation_id: number; sender_id: number
  content: string; message_type: string
  is_edited: boolean; is_deleted: boolean
  created_at: string; updated_at: string
  sender?: UserMini; temp?: boolean; error?: boolean
}
interface LastMessage { id: number; content: string; sender_id: number; created_at: string; is_deleted: boolean }
interface Conversation {
  id: number; conversation_type: string; title?: string
  class_id?: number; created_by_id?: number
  is_active: boolean; created_at: string; updated_at: string
  participants?: Participant[]; last_message?: LastMessage; unread_count?: number
}

// ── Helpers ────────────────────────────────────────────────────
function getBaseUrl() { return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1","") || "http://localhost:8000" }

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
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d`
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

function formatDateLabel(d: string) {
  const date = new Date(d)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

// ── Avatar Component ───────────────────────────────────────────
function Avatar({ name, size = 40, url, online }: { name: string; size?: number; url?: string | null; online?: boolean }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  const resolved = resolveAvatar(url)
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      {resolved
        ? <img src={resolved} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
        : <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${color}, ${color}88)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38 }}>
            {name?.[0]?.toUpperCase() ?? "?"}
          </div>
      }
      {online && (
        <div style={{ position: "absolute", bottom: 1, right: 1, width: size * 0.28, height: size * 0.28, borderRadius: "50%", background: "#22c55e", border: `${Math.max(2, size * 0.05)}px solid var(--card)` }} />
      )}
    </div>
  )
}

// ── Conv helpers ────────────────────────────────────────────────
function getOtherParticipant(conv: Conversation, currentUserId: number): UserMini | null {
  if (!conv.participants?.length) return null
  const other = conv.participants.find(p => p.user_id !== currentUserId)
  return other?.user ?? null
}

function getConvName(conv: Conversation, currentUserId: number): string {
  if (conv.conversation_type === "direct") {
    const other = getOtherParticipant(conv, currentUserId)
    return other?.full_name ?? "Unknown User"
  }
  if (conv.title) return conv.title
  if (conv.conversation_type === "class") return "Class Discussion"
  return "Group Chat"
}

function getConvSubtitle(conv: Conversation, currentUserId: number): string {
  if (conv.conversation_type === "direct") {
    const other = getOtherParticipant(conv, currentUserId)
    if (!other) return "Direct message"
    return `${other.role.charAt(0).toUpperCase() + other.role.slice(1)} · ${other.email}`
  }
  const count = conv.participants?.length ?? 0
  return `${count} participant${count !== 1 ? "s" : ""}`
}

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
  const [mobileView, setMobileView] = useState<"list"|"chat">("list")
  const [searchUsers, setSearchUsers] = useState<UserMini[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null)
  const [msgMenuId, setMsgMenuId] = useState<number | null>(null)
  const [msgReactions, setMsgReactions] = useState<Record<number, Record<string,number>>>({})
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({}) // userId -> name
  const [onlineUsers, setOnlineUsers] = useState<number[]>([])
  const [readReceipts, setReadReceipts] = useState<Record<number, {by: number, name: string, at: string}>>({}) // msgId -> read info
  const [deliveredMsgs, setDeliveredMsgs] = useState<Set<number>>(new Set())
  const typingTimeoutRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const isTypingRef = useRef(false)

  // ── Queries ──
  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const res = await api.get(endpoints.messaging.list)
      return Array.isArray(res.data) ? res.data as Conversation[] : []
    },
    refetchInterval: 8000,
  })

  const { data: messages = [], isLoading: msgLoading } = useQuery({
    queryKey: ["messages", activeConv?.id, user?.id],
    queryFn: async () => {
      const res = await api.get(endpoints.messaging.messages(activeConv!.id))
      return Array.isArray(res.data) ? res.data as Message[] : []
    },
    enabled: !!activeConv,
    refetchInterval: false,
  })

  // Follow stats for other user
  const otherUser = activeConv ? getOtherParticipant(activeConv, user?.id ?? 0) : null

  const { data: followStats } = useQuery({
    queryKey: ["follow-stats", otherUser?.id],
    queryFn: async () => (await api.get(`/social/${otherUser!.id}/follow-stats`)).data,
    enabled: !!otherUser?.id && activeConv?.conversation_type === "direct",
    retry: false,
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
        sender: { id: user!.id, full_name: user!.full_name, email: user!.email, role: user!.role }
      }
      queryClient.setQueryData(["messages", activeConv?.id], (old: Message[] = []) => [...old, temp])
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData(["messages", activeConv?.id], (old: Message[] = []) =>
        old.map(m => m.temp ? newMsg : m)
      )
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
    },
    onError: () => {
      queryClient.setQueryData(["messages", activeConv?.id], (old: Message[] = []) =>
        old.map(m => m.temp ? { ...m, error: true } : m)
      )
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (msgId: number) => api.delete(`/messaging/messages/${msgId}`),
    onSuccess: (_, msgId) => {
      queryClient.setQueryData(["messages", activeConv?.id], (old: Message[] = []) =>
        old.map(m => m.id === msgId ? { ...m, is_deleted: true, content: "" } : m)
      )
    }
  })

  const startDirectMutation = useMutation({
    mutationFn: async (recipientId: number) => {
      const res = await api.post(endpoints.messaging.startDirect, { recipient_user_id: recipientId })
      return res.data as Conversation
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
      setActiveConv(conv)
      setShowNewChat(false)
      setMobileView("chat")
      setUserSearch("")
    }
  })

  // ── WebSocket with real-time features ──
  useEffect(() => {
    if (!activeConv) return
    const token = localStorage.getItem("learnex_access_token")
    const wsUrl = `${import.meta.env.VITE_WS_URL || "ws://localhost:8000"}/api/v1/messaging/ws/${activeConv.id}?token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      // Send delivered for latest messages on open
      ws.send(JSON.stringify({ type: "ping" }))
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)

        if (data.type === "message") {
          // New message from another user
          if (data.sender_id !== user?.id) {
            queryClient.setQueryData(["messages", activeConv.id, user?.id], (old: Message[] = []) =>
              old.find(m => m.id === data.id) ? old : [...old, data]
            )
            queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
            // Send read receipt immediately since we are viewing
            ws.send(JSON.stringify({ type: "read", message_id: data.id }))
            // Send delivered
            ws.send(JSON.stringify({ type: "delivered", message_id: data.id }))
          }
        } else if (data.type === "typing") {
          // Another user is typing
          const uid = data.user_id as number
          if (data.is_typing) {
            setTypingUsers(prev => ({ ...prev, [uid]: data.user_name }))
            // Clear after 3s of no updates
            if (typingTimeoutRef.current[uid]) clearTimeout(typingTimeoutRef.current[uid])
            typingTimeoutRef.current[uid] = setTimeout(() => {
              setTypingUsers(prev => { const n = {...prev}; delete n[uid]; return n })
            }, 3000)
          } else {
            setTypingUsers(prev => { const n = {...prev}; delete n[uid]; return n })
          }
        } else if (data.type === "read_receipt") {
          setReadReceipts(prev => ({ ...prev, [data.message_id]: { by: data.read_by, name: data.read_by_name, at: data.read_at } }))
        } else if (data.type === "delivered") {
          if (data.message_id) {
            setDeliveredMsgs(prev => new Set([...prev, data.message_id]))
          }
        } else if (data.type === "presence") {
          setOnlineUsers(data.online_users || [])
        } else if (data.type === "pong") {
          // keepalive ok
        }
      } catch {}
    }

    ws.onclose = () => {
      setOnlineUsers([])
      setTypingUsers({})
    }

    // Ping every 30s to keep connection alive
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }))
    }, 30000)

    return () => {
      ws.close()
      clearInterval(ping)
      Object.values(typingTimeoutRef.current).forEach(clearTimeout)
    }
  }, [activeConv?.id])

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", is_typing: isTyping }))
    }
  }, [])

  // Handle input change with typing indicator
  const handleMessageChange = useCallback((val: string) => {
    setMessage(val)
    if (!isTypingRef.current && val.length > 0) {
      isTypingRef.current = true
      sendTyping(true)
    } else if (isTypingRef.current && val.length === 0) {
      isTypingRef.current = false
      sendTyping(false)
    }
  }, [sendTyping])


  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Search users
  useEffect(() => {
    if (!showNewChat) { setSearchUsers([]); return }
    const q = userSearch.trim()
    api.get(`/users/search?q=${encodeURIComponent(q)}&limit=30`)
      .then(res => setSearchUsers((Array.isArray(res.data) ? res.data : []).filter((u: UserMini) => u.id !== user?.id)))
      .catch(() => {})
  }, [showNewChat, userSearch])

  const handleSend = useCallback(() => {
    const text = message.trim()
    if (!text || !activeConv) return
    // Stop typing indicator
    isTypingRef.current = false
    sendTyping(false)
    const content = replyTo ? `> ${replyTo.sender?.full_name ?? "Someone"}: ${replyTo.content.slice(0, 60)}${replyTo.content.length > 60 ? "..." : ""}\n\n${text}` : text
    sendMutation.mutate(content)
    setMessage("")
    setReplyTo(null)
    inputRef.current?.focus()
  }, [message, activeConv, sendMutation, replyTo])

  const openConversation = (conv: Conversation) => {
    setActiveConv(conv)
    setMobileView("chat")
    setShowProfile(false)
    api.post(endpoints.messaging.markRead(conv.id), {}).catch(() => {})
    queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
  }

  const handleFollow = async () => {
    if (!otherUser) return
    try {
      if (followStats?.is_following) await api.delete(`/social/${otherUser.id}/follow`)
      else await api.post(`/social/${otherUser.id}/follow`, {})
      queryClient.invalidateQueries({ queryKey: ["follow-stats", otherUser.id] })
    } catch {}
  }

  const filtered = conversations.filter(c =>
    getConvName(c, user?.id ?? 0).toLowerCase().includes(search.toLowerCase())
  )

  const unreadTotal = conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0)

  return (
    <AppShell>
      <div style={{ display: "flex", height: "calc(100vh - 72px)", borderRadius: 20, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>

        {/* ══════════════════════════════════════════
            LEFT PANEL — Conversation List
        ══════════════════════════════════════════ */}
        <div style={{ width: 340, flexShrink: 0, display: mobileView === "chat" ? "none" : "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--card)" }}>

          {/* Header */}
          <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22 }}>Messages</div>
                {unreadTotal > 0 && <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>{unreadTotal} unread message{unreadTotal > 1 ? "s" : ""}</div>}
              </div>
              <button onClick={() => setShowNewChat(v => !v)}
                style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: showNewChat ? "var(--accent)" : "var(--bg2)", color: showNewChat ? "white" : "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                {showNewChat ? <X size={18} /> : <Edit3 size={18} />}
              </button>
            </div>

            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 20, background: "var(--bg2)", border: "1px solid var(--border)" }}>
              <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                style={{ border: "none", background: "transparent", outline: "none", color: "var(--text)", fontSize: 13, flex: 1, fontFamily: "inherit" }} />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><X size={12} /></button>}
            </div>
          </div>

          {/* New Chat Panel */}
          {showNewChat && (
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Start New Conversation</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 20, background: "var(--card)", border: "1px solid var(--border)", marginBottom: 8 }}>
                <Search size={13} style={{ color: "var(--muted)" }} />
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  style={{ border: "none", background: "transparent", outline: "none", color: "var(--text)", fontSize: 13, flex: 1, fontFamily: "inherit" }}
                  autoFocus />
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {searchUsers.length === 0 && userSearch.length === 0 && (
                  <div style={{ color: "var(--muted)", fontSize: 12, padding: "8px 4px", textAlign: "center" }}>Type a name to search people</div>
                )}
                {searchUsers.length === 0 && userSearch.length > 0 && (
                  <div style={{ color: "var(--muted)", fontSize: 12, padding: "8px 4px", textAlign: "center" }}>No users found</div>
                )}
                {searchUsers.map(u => (
                  <div key={u.id} onClick={() => startDirectMutation.mutate(u.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 6px", borderRadius: 12, cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <Avatar name={u.full_name} size={38} url={u.profile?.avatar_url} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "capitalize" }}>{u.role} · {u.email}</div>
                    </div>
                    {startDirectMutation.isPending && <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {convLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bg2)", flexShrink: 0, opacity: 0.5 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 13, borderRadius: 6, background: "var(--bg2)", marginBottom: 6, width: "60%", opacity: 0.5 }} />
                      <div style={{ height: 11, borderRadius: 6, background: "var(--bg2)", width: "80%", opacity: 0.3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!convLoading && filtered.length === 0 && (
              <div style={{ padding: "56px 24px", textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(203,38,228,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "1px solid rgba(203,38,228,0.15)" }}>
                  <MessageCircle size={32} style={{ color: "var(--accent)" }} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>No conversations yet</div>
                <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                  Start a private conversation with teachers, learners or classmates.
                </div>
                <button className="btn btn-primary" style={{ borderRadius: 12, fontSize: 13 }} onClick={() => setShowNewChat(true)}>
                  <Plus size={14} /> New Message
                </button>
              </div>
            )}

            {filtered.map(conv => {
              const isActive = activeConv?.id === conv.id
              const hasUnread = (conv.unread_count ?? 0) > 0
              const name = getConvName(conv, user?.id ?? 0)
              const other = getOtherParticipant(conv, user?.id ?? 0)
              const preview = conv.last_message
                ? (conv.last_message.is_deleted ? "Message deleted" : conv.last_message.content.slice(0, 50))
                : "No messages yet"
              const isMine = conv.last_message?.sender_id === user?.id

              return (
                <div key={conv.id} onClick={() => openConversation(conv)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", background: isActive ? "color-mix(in srgb, var(--accent) 8%, var(--card))" : "transparent", borderLeft: `3px solid ${isActive ? "var(--accent)" : "transparent"}`, transition: "all 0.1s" }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg2)" }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent" }}>

                  {/* Avatar */}
                  {conv.conversation_type === "direct" && other
                    ? <Avatar name={other.full_name} size={48} url={other.profile?.avatar_url} online={isActive} />
                    : <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(203,38,228,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {conv.conversation_type === "class" ? <GraduationCap size={22} style={{ color: "var(--accent)" }} /> : <Users size={22} style={{ color: "var(--accent)" }} />}
                      </div>
                  }

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontWeight: hasUnread ? 800 : 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170, color: "var(--text)" }}>
                        {name}
                      </span>
                      <span style={{ fontSize: 11, color: hasUnread ? "var(--accent)" : "var(--muted)", fontWeight: hasUnread ? 700 : 400, flexShrink: 0, marginLeft: 6 }}>
                        {conv.updated_at && timeAgo(conv.updated_at)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {isMine && <span style={{ fontSize: 11, color: "var(--muted)" }}>You: </span>}
                      <span style={{ fontSize: 12, color: hasUnread ? "var(--text)" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontWeight: hasUnread ? 600 : 400, fontStyle: conv.last_message?.is_deleted ? "italic" : "normal" }}>
                        {preview}
                      </span>
                      {hasUnread && (
                        <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "var(--accent)", color: "white", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0 }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* E2E notice */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)", justifyContent: "center" }}>
            <Lock size={11} style={{ color: "var(--success)" }} />
            End-to-end encrypted conversations
          </div>
        </div>

        {/* ══════════════════════════════════════════
            CENTER — Chat Window
        ══════════════════════════════════════════ */}
        <div style={{ flex: 1, display: mobileView === "list" ? "none" : "flex", flexDirection: "column", background: "var(--bg)", minWidth: 0 }}>

          {!activeConv ? (
            /* Empty state */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, textAlign: "center" }}>
              <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, rgba(203,38,228,0.08), rgba(139,92,246,0.08))", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, border: "1px solid rgba(203,38,228,0.15)" }}>
                <MessageCircle size={48} style={{ color: "var(--accent)" }} />
              </div>
              <h2 style={{ margin: "0 0 10px", fontWeight: 900, fontSize: 24 }}>Your Messages</h2>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 8px", lineHeight: 1.7, maxWidth: 320 }}>
                Send private messages to teachers, learners and classmates on Learnex.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--success)", marginBottom: 28, padding: "6px 14px", borderRadius: 20, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <Lock size={12} /> Your messages are end-to-end encrypted
              </div>
              <button className="btn btn-primary" style={{ borderRadius: 12, padding: "11px 28px" }} onClick={() => setShowNewChat(true)}>
                <Plus size={15} /> Start a Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <button onClick={() => setMobileView("list")} className="mobile-back-btn"
                  style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)" }}>
                  <ArrowLeft size={18} />
                </button>

                {/* Conv avatar + name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, cursor: "pointer" }}
                  onClick={() => setShowProfile(v => !v)}>
                  {activeConv.conversation_type === "direct" && otherUser
                    ? <Avatar name={otherUser.full_name} size={42} url={otherUser.profile?.avatar_url} online={onlineUsers.includes(otherUser.id)} />
                    : <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(203,38,228,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Users size={20} style={{ color: "var(--accent)" }} />
                      </div>
                  }
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {getConvName(activeConv, user?.id ?? 0)}
                    </div>
                    <div style={{ fontSize: 11, color: onlineUsers.length > 0 ? "var(--success)" : "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: onlineUsers.length > 0 ? "#22c55e" : "var(--muted)", transition: "background 0.3s" }} />
                      {onlineUsers.length > 0 ? `${onlineUsers.length} online` : activeConv.conversation_type === "direct" ? "Offline" : "No one online"}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {[
                    { icon: <Phone size={17} />, title: "Voice call" },
                    { icon: <Video size={17} />, title: "Video call" },
                    { icon: <Info size={17} />, title: "Conversation info", onClick: () => setShowProfile(v => !v) },
                  ].map((btn, i) => (
                    <button key={i} title={btn.title} onClick={(btn as any).onClick}
                      style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text)" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg2)"; (e.currentTarget as HTMLElement).style.color = "var(--muted)" }}>
                      {btn.icon}
                    </button>
                  ))}

                  {/* More menu */}
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setShowMoreMenu(v => !v)}
                      style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: showMoreMenu ? "var(--border)" : "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", transition: "all 0.15s" }}>
                      <MoreVertical size={17} />
                    </button>
                    {showMoreMenu && (
                      <>
                        <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowMoreMenu(false)} />
                        <div style={{ position: "absolute", top: 44, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", minWidth: 230, overflow: "hidden" }}>
                          {[
                            { label: "View profile", icon: <Users size={15} />, color: "var(--text)", onClick: () => { setShowProfile(true); setShowMoreMenu(false) } },
                            { label: "Search in chat", icon: <Search size={15} />, color: "var(--text)", onClick: () => setShowMoreMenu(false) },
                            { label: "Mute notifications", icon: <Bell size={15} />, color: "var(--text)", onClick: () => setShowMoreMenu(false) },
                            { label: "Go to profile page", icon: <Globe size={15} />, color: "var(--text)", onClick: () => { if (otherUser) navigate(`/profile/${otherUser.id}`); setShowMoreMenu(false) } },
                            null, // divider
                            { label: "Clear conversation", icon: <Trash2 size={15} />, color: "var(--danger)", onClick: () => { if (window.confirm("Clear all messages?")) setShowMoreMenu(false) } },
                            { label: "Block user", icon: <Shield size={15} />, color: "var(--danger)", onClick: () => { if (otherUser && window.confirm(`Block ${otherUser.full_name}? They won't be able to message you.`)) setShowMoreMenu(false) } },
                            { label: "Report conversation", icon: <Info size={15} />, color: "var(--danger)", onClick: () => setShowMoreMenu(false) },
                          ].map((item, i) =>
                            item === null
                              ? <div key={i} style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                              : <button key={i} onClick={item.onClick}
                                  style={{ width: "100%", padding: "11px 16px", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", color: item.color, fontSize: 14, fontFamily: "inherit", textAlign: "left" }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
                                  {item.icon} {item.label}
                                </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* E2E Banner */}
              <div style={{ padding: "8px 16px", background: "rgba(34,197,94,0.05)", borderBottom: "1px solid rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
                <Lock size={11} style={{ color: "var(--success)" }} />
                Messages are end-to-end encrypted. Only you and {otherUser?.full_name ?? "participants"} can read them.
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
                {msgLoading && (
                  <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                    <div className="spinner" />
                  </div>
                )}

                {!msgLoading && messages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "56px 24px" }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>👋</div>
                    <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
                      Say hello to {getConvName(activeConv, user?.id ?? 0)}!
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
                      This is the start of your conversation.<br />
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 8, color: "var(--success)" }}>
                        <Lock size={12} /> End-to-end encrypted
                      </span>
                    </div>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user?.id
                  const prev = messages[idx - 1]
                  const next = messages[idx + 1]
                  const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString()
                  const showAvatar = !isOwn && (!next || next.sender_id !== msg.sender_id || new Date(next.created_at).toDateString() !== new Date(msg.created_at).toDateString())
                  const showName = !isOwn && (!prev || prev.sender_id !== msg.sender_id)
                  const isGrouped = !showDate && prev && prev.sender_id === msg.sender_id

                  // Bubble radius
                  const br = isOwn
                    ? isGrouped ? "18px 4px 4px 18px" : "18px 4px 18px 18px"
                    : isGrouped ? "4px 18px 18px 4px" : "4px 18px 18px 18px"

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 10px" }}>
                          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, whiteSpace: "nowrap", padding: "4px 14px", borderRadius: 20, background: "var(--bg2)", border: "1px solid var(--border)" }}>
                            {formatDateLabel(msg.created_at)}
                          </span>
                          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, marginBottom: isGrouped ? 2 : 6 }}>
                        {/* Sender avatar */}
                        {!isOwn && (
                          <div style={{ width: 32, flexShrink: 0 }}>
                            {showAvatar && <Avatar name={msg.sender?.full_name ?? "?"} size={32} url={msg.sender?.profile?.avatar_url} />}
                          </div>
                        )}

                        <div style={{ maxWidth: "65%", display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start", position: "relative" }}
                          onMouseEnter={() => setHoveredMsg(msg.id)}
                          onMouseLeave={() => setHoveredMsg(null)}>

                          {/* Hover action toolbar */}
                          {hoveredMsg === msg.id && !msg.is_deleted && !msg.temp && (
                            <div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 4, flexDirection: isOwn ? "row-reverse" : "row" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 1, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 24, padding: "3px 6px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
                                {["👍","❤️","😂","😮","😢","🙏"].map(em => (
                                  <button key={em}
                                    onClick={() => {
                                      api.post(`/messaging/${activeConv!.id}/messages/${msg.id}/react`, { emoji: em })
                                        .then((res: any) => {
                                          setMsgReactions(prev => ({ ...prev, [msg.id]: res.data.reactions }))
                                        }).catch(() => {
                                          // optimistic fallback
                                          setMsgReactions(prev => {
                                            const cur = { ...(prev[msg.id] ?? {}) }
                                            cur[em] = (cur[em] ?? 0) + 1
                                            return { ...prev, [msg.id]: cur }
                                          })
                                        })
                                    }}
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "2px 3px", borderRadius: 6, lineHeight: 1, transition: "transform 0.15s" }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "scale(1.35)"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "scale(1)"}>
                                    {em}
                                  </button>
                                ))}
                                <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 3px" }} />
                                <button onClick={() => { setReplyTo(msg); setTimeout(() => inputRef.current?.focus(), 50) }}
                                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 7px", borderRadius: 10, fontSize: 11, color: "var(--muted)", fontWeight: 700, whiteSpace: "nowrap" }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--accent)"}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}>
                                  ↩
                                </button>
                                {isOwn && (
                                  <button onClick={() => { if (window.confirm("Delete?")) deleteMutation.mutate(msg.id) }}
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 10, fontSize: 12, color: "var(--danger)", fontWeight: 700 }}
                                    title="Delete message">
                                    🗑
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {showName && !isOwn && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4, paddingLeft: 4 }}>
                              {msg.sender?.full_name ?? "Unknown"}
                              {msg.sender?.role && msg.sender.role !== "learner" && (
                                <span style={{ marginLeft: 5, fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "rgba(203,38,228,0.1)", color: "var(--accent)" }}>
                                  {msg.sender.role}
                                </span>
                              )}
                            </div>
                          )}

                          <div style={{
                            padding: "9px 14px", borderRadius: br,
                            background: msg.error ? "rgba(239,68,68,0.1)" : isOwn ? "linear-gradient(135deg, #cb26e4, #8b5cf6)" : "var(--card)",
                            color: isOwn ? "white" : "var(--text)",
                            border: isOwn ? "none" : "1px solid var(--border)",
                            boxShadow: isOwn ? "0 2px 8px rgba(203,38,228,0.25)" : "0 1px 2px rgba(0,0,0,0.06)",
                            opacity: msg.temp ? 0.75 : 1,
                            transition: "opacity 0.2s",
                          }}>
                            {msg.is_deleted
                              ? <span style={{ fontStyle: "italic", opacity: 0.6, fontSize: 13 }}>Message deleted</span>
                              : msg.content.startsWith("> ")
                                ? (() => {
                                    const parts = msg.content.split("\n\n")
                                    const quote = parts[0].replace(/^> /, "")
                                    const rest = parts.slice(1).join("\n\n")
                                    return (
                                      <div>
                                        <div style={{ borderLeft: `3px solid ${isOwn ? "rgba(255,255,255,0.5)" : "var(--accent)"}`, paddingLeft: 8, marginBottom: 6, fontSize: 12, opacity: 0.75, fontStyle: "italic", lineHeight: 1.4 }}>{quote}</div>
                                        <span style={{ fontSize: 14, lineHeight: 1.55, wordBreak: "break-word" }}>{rest}</span>
                                      </div>
                                    )
                                  })()
                                : <span style={{ fontSize: 14, lineHeight: 1.55, wordBreak: "break-word" }}>{msg.content}</span>
                            }
                          </div>

                          {/* Reactions display */}
                          {msgReactions[msg.id] && Object.keys(msgReactions[msg.id]).length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                              {Object.entries(msgReactions[msg.id]).map(([emoji, count]) => (
                                <button key={emoji}
                                  onClick={() => {
                                    api.post(`/messaging/${activeConv!.id}/messages/${msg.id}/react`, { emoji })
                                      .then((res: any) => setMsgReactions(prev => ({ ...prev, [msg.id]: res.data.reactions })))
                                      .catch(() => {})
                                  }}
                                  style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 20, background: isOwn ? "rgba(255,255,255,0.15)" : "var(--bg2)", border: `1px solid ${isOwn ? "rgba(255,255,255,0.2)" : "var(--border)"}`, cursor: "pointer", fontSize: 13, fontWeight: 700, color: isOwn ? "white" : "var(--text)" }}>
                                  {emoji} <span style={{ fontSize: 11 }}>{count as number}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Time + status */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, paddingLeft: isOwn ? 0 : 4 }}>
                            <span style={{ fontSize: 10, color: "var(--muted)" }}>{formatTime(msg.created_at)}</span>
                            {msg.is_edited && <span style={{ fontSize: 10, color: "var(--muted)" }}>· edited</span>}
                            {isOwn && (
                              msg.error ? <span style={{ fontSize: 10, color: "var(--danger)", fontWeight: 600 }}>Failed</span>
                              : msg.temp ? <Circle size={10} style={{ color: "var(--muted)", opacity: 0.5 }} />
                              : readReceipts[msg.id] ? <CheckCheck size={12} style={{ color: "#38bdf8" }} title={`Read by ${readReceipts[msg.id].name}`} />
                              : deliveredMsgs.has(msg.id) ? <CheckCheck size={12} style={{ color: "var(--muted)" }} title="Delivered" />
                              : <Check size={12} style={{ color: "var(--muted)", opacity: 0.6 }} title="Sent" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {/* Typing Indicator */}
                {Object.keys(typingUsers).length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 16px 8px" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>
                      {Object.values(typingUsers)[0]?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ background: "var(--bg2)", borderRadius: "4px 18px 18px 18px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--muted)", display: "inline-block", animation: "bounce 1.2s infinite 0s" }} />
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--muted)", display: "inline-block", animation: "bounce 1.2s infinite 0.2s" }} />
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--muted)", display: "inline-block", animation: "bounce 1.2s infinite 0.4s" }} />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      {Object.values(typingUsers).join(", ")} {Object.keys(typingUsers).length === 1 ? "is" : "are"} typing...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Preview */}
              {replyTo && (
                <div style={{ padding: "8px 16px", background: "rgba(203,38,228,0.06)", borderTop: "1px solid rgba(203,38,228,0.15)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 3, borderRadius: 2, background: "var(--accent)", alignSelf: "stretch", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>Replying to {replyTo.sender?.full_name ?? "message"}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.content.slice(0, 80)}</div>
                  </div>
                  <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", flexShrink: 0 }}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Input Bar */}
              <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", gap: 8 }}>
                <button title="Send image" style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--accent)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}>
                  <Image size={18} />
                </button>

                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 24, border: "1px solid var(--border)", background: "var(--bg2)", transition: "border-color 0.15s" }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlurCapture={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                  <input ref={inputRef}
                    value={message}
                    onChange={e => handleMessageChange(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder={`Message ${getConvName(activeConv, user?.id ?? 0)}...`}
                    disabled={sendMutation.isPending}
                    style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
                  <button title="Emoji" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 0, flexShrink: 0 }}>
                    <Smile size={18} />
                  </button>
                </div>

                <button onClick={handleSend} disabled={!message.trim() || sendMutation.isPending}
                  style={{ width: 42, height: 42, borderRadius: "50%", border: "none", background: message.trim() ? "linear-gradient(135deg, #cb26e4, #8b5cf6)" : "var(--bg2)", color: message.trim() ? "white" : "var(--muted)", cursor: message.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s", boxShadow: message.trim() ? "0 4px 14px rgba(203,38,228,0.35)" : "none" }}>
                  {sendMutation.isPending
                    ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "white" }} />
                    : <Send size={17} style={{ marginLeft: 1 }} />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ══════════════════════════════════════════
            RIGHT PANEL — Profile Sidebar
        ══════════════════════════════════════════ */}
        {showProfile && activeConv && (
          <div style={{ width: 320, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--card)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {/* Header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>Conversation Info</span>
              <button onClick={() => setShowProfile(false)}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                <X size={16} />
              </button>
            </div>

            {/* Profile */}
            {otherUser && (
              <div style={{ padding: "24px 20px 20px", textAlign: "center", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                  <Avatar name={otherUser.full_name} size={80} url={otherUser.profile?.avatar_url} online={true} />
                </div>
                <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>{otherUser.full_name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "capitalize", marginBottom: 4 }}>
                  {otherUser.role} · {otherUser.email}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 12, color: "var(--success)", marginBottom: 16 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                  Active now
                </div>
                {otherUser.profile?.bio && (
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 16, padding: "10px 14px", borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)", textAlign: "left" }}>
                    {otherUser.profile.bio}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="btn btn-primary" style={{ fontSize: 12, borderRadius: 10 }} onClick={handleFollow}>
                    {followStats?.is_following ? <><UserMinus size={13} /> Unfollow</> : <><UserPlus size={13} /> Follow</>}
                  </button>
                  <button className="btn" style={{ fontSize: 12, borderRadius: 10 }} onClick={() => navigate(`/profile/${otherUser.id}`)}>
                    <Globe size={13} /> Profile
                  </button>
                </div>
              </div>
            )}

            {/* Participants list for group */}
            {activeConv.conversation_type !== "direct" && activeConv.participants && (
              <div style={{ padding: "16px" }}>
                <div style={{ fontWeight: 700, fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                  Members ({activeConv.participants.length})
                </div>
                {activeConv.participants.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <Avatar name={p.user?.full_name ?? "?"} size={36} url={p.user?.profile?.avatar_url} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.user?.full_name ?? "Unknown"}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "capitalize" }}>{p.user?.role} · {p.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Privacy & Security */}
            <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Privacy & Security</div>
              <div style={{ padding: "14px", borderRadius: 12, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Lock size={15} style={{ color: "var(--success)" }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: "var(--success)" }}>End-to-End Encrypted</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                  Messages are secured with end-to-end encryption. Only you and the recipient can read them.
                </div>
              </div>

              {/* Actions */}
              {[
                { label: "Mute notifications", icon: <Bell size={14} />, color: "var(--text)" },
                { label: "Block user", icon: <Shield size={14} />, color: "var(--danger)",
                  onClick: () => otherUser && window.confirm(`Block ${otherUser.full_name}?`) },
                { label: "Report", icon: <Info size={14} />, color: "var(--danger)" },
              ].map((item, i) => (
                <button key={i} onClick={(item as any).onClick}
                  style={{ width: "100%", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", color: item.color, fontSize: 13, fontFamily: "inherit", marginBottom: 6, fontWeight: 600, textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--border)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}>
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}