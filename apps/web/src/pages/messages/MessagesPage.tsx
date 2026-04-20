import { useState, useEffect, useRef, useCallback } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import {
  Search, Send, Plus, MoreVertical, ArrowLeft,
  CheckCheck, Check, MessageCircle, X, Lock,
  Circle, Users, GraduationCap, BookOpen, Shield, Trash2, Edit3
} from "lucide-react"

// ── Types ──────────────────────────────────────────
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
  is_active: boolean; created_at: string; updated_at: string
  participants?: Participant[]; last_message?: LastMessage; unread_count?: number
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
function Avatar({ name, url, size = 40, online = false }: { name: string; url?: string | null; size?: number; online?: boolean }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  const resolved = resolveAvatar(url)
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {resolved
        ? <img src={resolved} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
        : <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg,${color},${color}99)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38 }}>
            {name?.[0]?.toUpperCase()}
          </div>
      }
      {online && <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--card)" }} />}
    </div>
  )
}

export default function MessagesPage() {
  const user = useAuthStore(s => s.user)
  const queryClient = useQueryClient()

  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [message, setMessage] = useState("")
  const [search, setSearch] = useState("")
  const [userSearch, setUserSearch] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")
  const [searchUsers, setSearchUsers] = useState<UserMini[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null)

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

  const roleColor: Record<string, string> = { teacher: "#cb26e4", learner: "#38bdf8", admin: "#ef4444" }
  const otherUser = activeConv ? getOtherParticipant(activeConv, user?.id ?? 0) : null

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
      // Broadcast via WS
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

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "ping" }))
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === "message" && data.sender_id !== user?.id) {
          queryClient.setQueryData(["messages", activeConv.id, user?.id], (old: Message[] = []) =>
            old.find(m => m.id === data.id) ? old : [...old, data]
          )
          queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
          // Send read receipt
          ws.send(JSON.stringify({ type: "read", message_id: data.id }))
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

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typingUsers])

  // Search users
  useEffect(() => {
    if (!showNewChat) { setSearchUsers([]); return }
    api.get(`/users/search?q=${encodeURIComponent(userSearch)}&limit=20`)
      .then(res => setSearchUsers((Array.isArray(res.data) ? res.data : []).filter((u: UserMini) => u.id !== user?.id)))
      .catch(() => {})
  }, [showNewChat, userSearch])

  // Typing indicator
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
    isTypingRef.current = false
    sendTyping(false)
    const content = replyTo
      ? `> ${replyTo.sender?.full_name ?? "Someone"}: ${replyTo.content.slice(0, 60)}${replyTo.content.length > 60 ? "..." : ""}\n\n${text}`
      : text
    sendMutation.mutate(content)
    setMessage("")
    setReplyTo(null)
  }, [message, activeConv, replyTo, sendMutation, sendTyping])

  const openConv = useCallback((conv: Conversation) => {
    setActiveConv(conv)
    setMobileView("chat")
    setReadReceipts({})
    setDeliveredMsgs(new Set())
    setTypingUsers({})
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const startDirect = useCallback(async (targetUser: UserMini) => {
    const res = await api.post(endpoints.messaging.createDirect, { recipient_user_id: targetUser.id })
    const conv = res.data as Conversation
    queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
    setShowNewChat(false)
    openConv(conv)
  }, [queryClient, user?.id, openConv])

  const filtered = conversations.filter(c =>
    getConvName(c, user?.id ?? 0).toLowerCase().includes(search.toLowerCase())
  )

  // ── RENDER ──
  return (
    <AppShell>
      <div style={{ display: "flex", height: "calc(100vh - 60px)", overflow: "hidden", background: "var(--bg)" }}>

        {/* ══ LEFT: Conversation List ══ */}
        <div style={{
          width: 320, flexShrink: 0, display: mobileView === "chat" ? "none" : "flex",
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
                style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--text)", width: "100%" }} />
            </div>
          </div>

          {/* E2E notice */}
          <div style={{ padding: "6px 16px", background: "rgba(203,38,228,0.04)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={10} style={{ color: "var(--muted)" }} />
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>End-to-end encrypted messages</span>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {convLoading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center" }}>
                <MessageCircle size={32} style={{ color: "var(--muted)", marginBottom: 8 }} />
                <div style={{ fontSize: 13, color: "var(--muted)" }}>No conversations yet</div>
              </div>
            ) : filtered.map(conv => {
              const name = getConvName(conv, user?.id ?? 0)
              const other = getOtherParticipant(conv, user?.id ?? 0)
              const isActive = activeConv?.id === conv.id
              const isMine = conv.last_message?.sender_id === user?.id
              const isOnline = other ? onlineUsers.includes(other.id) : false

              return (
                <div key={conv.id} onClick={() => openConv(conv)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                    cursor: "pointer", borderBottom: "1px solid var(--border)",
                    background: isActive ? "rgba(203,38,228,0.06)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                    transition: "all 0.1s",
                  }}>
                  <Avatar name={name} url={other?.profile?.avatar_url} size={44} online={isOnline} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                      <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0, marginLeft: 6 }}>
                        {conv.last_message ? timeAgo(conv.last_message.created_at) : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {isMine && <CheckCheck size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />}
                      <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {conv.last_message?.is_deleted ? "Message deleted" : conv.last_message?.content ?? "Start a conversation"}
                      </span>
                      {(conv.unread_count ?? 0) > 0 && (
                        <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: "var(--accent)", color: "white", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", flexShrink: 0 }}>
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

        {/* ══ RIGHT: Chat Area ══ */}
        <div style={{ flex: 1, display: mobileView === "list" && window.innerWidth < 768 ? "none" : "flex", flexDirection: "column", minWidth: 0, background: "var(--bg)" }}>
          {!activeConv ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
              <MessageCircle size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Select a conversation</div>
              <div style={{ fontSize: 13 }}>Choose from your conversations or start a new one</div>
              <button onClick={() => setShowNewChat(true)}
                style={{ marginTop: 20, padding: "10px 20px", borderRadius: 10, border: "none", background: "var(--accent)", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
                <Plus size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
                New Message
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <button onClick={() => { setMobileView("list"); setActiveConv(null) }}
                  style={{ display: window.innerWidth < 768 ? "flex" : "none", background: "none", border: "none", cursor: "pointer", color: "var(--text)", padding: 4, alignItems: "center", justifyContent: "center" }}>
                  <ArrowLeft size={20} />
                </button>
                <Avatar name={getConvName(activeConv, user?.id ?? 0)} url={otherUser?.profile?.avatar_url} size={40} online={otherUser ? onlineUsers.includes(otherUser.id) : false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{getConvName(activeConv, user?.id ?? 0)}</div>
                  <div style={{ fontSize: 11, color: Object.keys(typingUsers).length > 0 ? "var(--accent)" : onlineUsers.length > 0 ? "var(--success)" : "var(--muted)" }}>
                    {Object.keys(typingUsers).length > 0
                      ? `${Object.values(typingUsers)[0]} is typing...`
                      : onlineUsers.length > 0 ? "Online" : "Offline"}
                  </div>
                </div>
                <button onClick={() => setShowNewChat(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 6, display: "flex" }}>
                  <MoreVertical size={18} />
                </button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 2 }}>
                {msgLoading ? (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                    <Lock size={24} style={{ marginBottom: 12, opacity: 0.4 }} />
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>No messages yet</div>
                    <div style={{ fontSize: 13 }}>Say hello to {getConvName(activeConv, user?.id ?? 0)}</div>
                  </div>
                ) : messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user?.id
                  const prev = messages[idx - 1]
                  const next = messages[idx + 1]
                  const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString()
                  const showAvatar = !isOwn && (!next || next.sender_id !== msg.sender_id)
                  const showName = !isOwn && (!prev || prev.sender_id !== msg.sender_id)
                  const isGrouped = !showDate && !!prev && prev.sender_id === msg.sender_id

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 8px" }}>
                          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: "var(--bg2)", border: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                            {formatDateLabel(msg.created_at)}
                          </span>
                          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8, marginBottom: isGrouped ? 2 : 6 }}
                        onMouseEnter={() => setHoveredMsg(msg.id)} onMouseLeave={() => setHoveredMsg(null)}>
                        {!isOwn && (
                          <div style={{ width: 32, flexShrink: 0 }}>
                            {showAvatar && <Avatar name={msg.sender?.full_name ?? "?"} url={msg.sender?.profile?.avatar_url} size={32} />}
                          </div>
                        )}
                        <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
                          {showName && !isOwn && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: roleColor[msg.sender?.role ?? ""] ?? "var(--muted)", marginBottom: 3, paddingLeft: 4 }}>
                              {msg.sender?.full_name}
                            </span>
                          )}
                          <div style={{
                            padding: msg.is_deleted ? "8px 12px" : "10px 14px",
                            borderRadius: isOwn ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                            background: msg.error ? "rgba(239,68,68,0.1)" : msg.is_deleted ? "var(--bg2)" : isOwn ? "linear-gradient(135deg,#cb26e4,#8b5cf6)" : "var(--card)",
                            border: msg.is_deleted || msg.error ? "1px solid var(--border)" : isOwn ? "none" : "1px solid var(--border)",
                            color: msg.is_deleted ? "var(--muted)" : msg.error ? "var(--danger)" : isOwn ? "white" : "var(--text)",
                            fontSize: 14, lineHeight: 1.5,
                            fontStyle: msg.is_deleted ? "italic" : "normal",
                            opacity: msg.temp ? 0.7 : 1,
                            boxShadow: isOwn && !msg.is_deleted ? "0 2px 8px rgba(203,38,228,0.2)" : "0 1px 4px rgba(0,0,0,0.06)",
                            whiteSpace: "pre-wrap", wordBreak: "break-word",
                            position: "relative",
                          }}>
                            {msg.content}
                          </div>
                          {/* Status */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0 }}>
                            <span style={{ fontSize: 10, color: "var(--muted)" }}>{formatTime(msg.created_at)}</span>
                            {msg.is_edited && <span style={{ fontSize: 10, color: "var(--muted)" }}>· edited</span>}
                            {isOwn && (
                              msg.error ? <span style={{ fontSize: 10, color: "var(--danger)" }}>Failed</span>
                              : msg.temp ? <Circle size={10} style={{ color: "var(--muted)", opacity: 0.5 }} />
                              : readReceipts[msg.id] ? <CheckCheck size={12} style={{ color: "#38bdf8" }} title={`Read by ${readReceipts[msg.id]}`} />
                              : deliveredMsgs.has(msg.id) ? <CheckCheck size={12} style={{ color: "var(--muted)" }} title="Delivered" />
                              : <Check size={12} style={{ color: "var(--muted)", opacity: 0.6 }} title="Sent" />
                            )}
                          </div>
                        </div>
                        {/* Actions on hover */}
                        {hoveredMsg === msg.id && !msg.is_deleted && (
                          <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                            <button onClick={() => setReplyTo(msg)}
                              style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 6px", cursor: "pointer", fontSize: 11, color: "var(--muted)", fontFamily: "inherit" }}>
                              Reply
                            </button>
                            {isOwn && (
                              <button onClick={() => deleteMutation.mutate(msg.id)}
                                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "3px 6px", cursor: "pointer", fontSize: 11, color: "var(--danger)", fontFamily: "inherit" }}>
                                Delete
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
                      {Object.values(typingUsers)[0]?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "4px 18px 18px 18px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--muted)", display: "inline-block", animation: `bounce 1.2s infinite ${delay}s` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{Object.values(typingUsers)[0]} is typing...</span>
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
                  <button onClick={() => setReplyTo(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Input */}
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--card)", display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0 }}>
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
                  {sendMutation.isPending
                    ? <Circle size={16} style={{ opacity: 0.5 }} />
                    : <Send size={17} style={{ marginLeft: 1 }} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600, padding: 16 }}>
          <div style={{ background: "var(--card)", borderRadius: 20, width: "100%", maxWidth: 440, border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>New Message</span>
              <button onClick={() => setShowNewChat(false)}
                style={{ background: "var(--bg2)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "var(--bg2)", border: "1px solid var(--border)", marginBottom: 12 }}>
                <Search size={14} style={{ color: "var(--muted)" }} />
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search users by name or email..."
                  autoFocus
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: 14, color: "var(--text)", width: "100%", fontFamily: "inherit" }} />
              </div>
              <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {searchUsers.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                    {userSearch ? "No users found" : "Search for someone to message"}
                  </div>
                ) : searchUsers.map(u => (
                  <button key={u.id} onClick={() => startDirect(u)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", transition: "background 0.1s", fontFamily: "inherit" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg2)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    <Avatar name={u.full_name} url={u.profile?.avatar_url} size={40} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{u.full_name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{u.role} · {u.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}