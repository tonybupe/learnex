import { useState, useEffect, useRef, useCallback } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import {
  Search, Send, Plus, MoreVertical, Phone, Video,
  ArrowLeft, CheckCheck, Check, MessageCircle, X,
  Smile, Paperclip, Mic, Image, Users, GraduationCap,
  BookOpen, Circle
} from "lucide-react"

interface UserMini { id: number; full_name: string; email: string; role: string; profile?: { avatar_url?: string } }
interface Message {
  id: number; conversation_id: number; sender_id: number
  content: string; message_type: string; is_edited: boolean
  is_deleted: boolean; created_at: string; updated_at: string
  sender?: UserMini; temp?: boolean; error?: boolean
}
interface Conversation {
  id: number; conversation_type: string; title?: string
  class_id?: number; lesson_id?: number; created_by_id?: number
  is_active: boolean; created_at: string; updated_at: string
  participants?: any[]; last_message?: Message; unread_count?: number
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(d: string) {
  const date = new Date(d)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

function getBaseUrl() { return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1","") || "http://localhost:8000" }

function Avatar({ name, size = 40, url, online }: { name: string; size?: number; url?: string; online?: boolean }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  const resolved = url ? (url.startsWith("http") ? url : `${getBaseUrl()}${url}`) : null
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {resolved
        ? <img src={resolved} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
        : <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${color}, ${color}99)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38 }}>
            {name?.[0]?.toUpperCase() ?? "?"}
          </div>
      }
      {online && (
        <div style={{ position: "absolute", bottom: 1, right: 1, width: size * 0.28, height: size * 0.28, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--card)" }} />
      )}
    </div>
  )
}

function ConvIcon({ type }: { type: string }) {
  const Icon = type === "direct" ? MessageCircle : type === "class" ? GraduationCap : Users
  const color = type === "direct" ? "#cb26e4" : type === "class" ? "#38bdf8" : "#22c55e"
  return (
    <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={20} style={{ color }} />
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
  const [users, setUsers] = useState<UserMini[]>([])
  const [mobileView, setMobileView] = useState<"list"|"chat">("list")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get(endpoints.messaging.list)
      return Array.isArray(res.data) ? res.data as Conversation[] : []
    },
    refetchInterval: 10000,
  })

  const { data: messages = [], isLoading: msgLoading } = useQuery({
    queryKey: ["messages", activeConv?.id],
    queryFn: async () => {
      const res = await api.get(endpoints.messaging.messages(activeConv!.id))
      return Array.isArray(res.data) ? res.data as Message[] : []
    },
    enabled: !!activeConv,
    refetchInterval: false,
  })

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(endpoints.messaging.sendMessage(activeConv!.id), { content, message_type: "text" })
      return res.data as Message
    },
    onMutate: async (content) => {
      const tempMsg: Message = {
        id: Date.now() * -1, conversation_id: activeConv!.id,
        sender_id: user!.id, content, message_type: "text",
        is_edited: false, is_deleted: false,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        temp: true
      }
      queryClient.setQueryData(["messages", activeConv?.id], (old: Message[] = []) => [...old, tempMsg])
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData(["messages", activeConv?.id], (old: Message[] = []) =>
        old.map(m => m.temp ? newMsg : m)
      )
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    },
    onError: () => {
      queryClient.setQueryData(["messages", activeConv?.id], (old: Message[] = []) =>
        old.map(m => m.temp ? { ...m, error: true } : m)
      )
    }
  })

  const startDirectMutation = useMutation({
    mutationFn: async (recipientId: number) => {
      const res = await api.post(endpoints.messaging.startDirect, { recipient_user_id: recipientId })
      return res.data as Conversation
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      setActiveConv(conv)
      setShowNewChat(false)
      setMobileView("chat")
    }
  })

  // WebSocket
  useEffect(() => {
    if (!activeConv) return
    const token = localStorage.getItem("learnex_access_token")
    const wsUrl = `${import.meta.env.VITE_WS_URL || "ws://localhost:8000"}/api/v1/messaging/ws/${activeConv.id}?token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.sender_id !== user?.id) {
          queryClient.setQueryData(["messages", activeConv.id], (old: Message[] = []) => {
            if (old.find(m => m.id === data.id)) return old
            return [...old, data]
          })
          queryClient.invalidateQueries({ queryKey: ["conversations"] })
        }
      } catch {}
    }
    return () => ws.close()
  }, [activeConv?.id])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load users
  useEffect(() => {
    if (!showNewChat) return
    api.get("/users").then(res => {
      const all = Array.isArray(res.data) ? res.data : res.data?.items ?? []
      setUsers(all.filter((u: UserMini) => u.id !== user?.id))
    }).catch(() => {})
  }, [showNewChat])

  const handleSend = useCallback(() => {
    const text = message.trim()
    if (!text || !activeConv) return
    sendMutation.mutate(text)
    setMessage("")
    inputRef.current?.focus()
  }, [message, activeConv, sendMutation])

  const openConversation = (conv: Conversation) => {
    setActiveConv(conv)
    setMobileView("chat")
    api.post(endpoints.messaging.markRead(conv.id), {}).catch(() => {})
    queryClient.invalidateQueries({ queryKey: ["conversations"] })
  }

  const getConvTitle = (conv: Conversation) => {
    if (conv.title) return conv.title
    if (conv.conversation_type === "direct") return "Direct Message"
    if (conv.conversation_type === "class") return "Class Chat"
    return "Group Chat"
  }

  const filtered = conversations.filter(c =>
    getConvTitle(c).toLowerCase().includes(search.toLowerCase())
  )

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const unreadTotal = conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)

  return (
    <AppShell>
      <div style={{ display: "flex", height: "calc(100vh - 72px)", background: "var(--bg)", borderRadius: 20, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--card)", ...(mobileView === "chat" ? { display: "none" } : {}) }}
          className={mobileView === "chat" ? "mobile-hidden" : ""}>

          {/* Header */}
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 20 }}>Messages</div>
              {unreadTotal > 0 && <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>{unreadTotal} unread</div>}
            </div>
            <button onClick={() => setShowNewChat(v => !v)}
              style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: showNewChat ? "var(--accent)" : "var(--bg2)", color: showNewChat ? "white" : "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
              {showNewChat ? <X size={18} /> : <Plus size={18} />}
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 24, background: "var(--bg2)", border: "1px solid var(--border)" }}>
              <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                style={{ border: "none", background: "transparent", outline: "none", color: "var(--text)", fontSize: 13, flex: 1, fontFamily: "inherit" }} />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><X size={12} /></button>}
            </div>
          </div>

          {/* New Chat Panel */}
          {showNewChat && (
            <div style={{ padding: "0 14px 10px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>New Conversation</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 20, background: "var(--bg2)", border: "1px solid var(--border)", marginBottom: 8 }}>
                <Search size={13} style={{ color: "var(--muted)" }} />
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search people..."
                  style={{ border: "none", background: "transparent", outline: "none", color: "var(--text)", fontSize: 13, flex: 1, fontFamily: "inherit" }}
                  autoFocus />
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {filteredUsers.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13, padding: "8px 4px" }}>Loading users...</div>}
                {filteredUsers.map(u => (
                  <div key={u.id} onClick={() => startDirectMutation.mutate(u.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 10, cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <Avatar name={u.full_name} size={36} url={u.profile?.avatar_url} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{u.full_name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "capitalize" }}>{u.role}</div>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 60, borderRadius: 12, background: "var(--bg2)", opacity: 0.4 }} />)}
              </div>
            )}
            {!convLoading && filtered.length === 0 && (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <MessageCircle size={28} style={{ color: "var(--muted)" }} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No conversations yet</div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Click + to start a new chat</div>
              </div>
            )}
            {filtered.map(conv => {
              const isActive = activeConv?.id === conv.id
              const hasUnread = (conv.unread_count ?? 0) > 0
              return (
                <div key={conv.id} onClick={() => openConversation(conv)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", background: isActive ? "color-mix(in srgb, var(--accent) 8%, var(--card))" : "transparent", borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg2)" }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                  <ConvIcon type={conv.conversation_type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontWeight: hasUnread ? 800 : 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{getConvTitle(conv)}</span>
                      <span style={{ fontSize: 11, color: hasUnread ? "var(--accent)" : "var(--muted)", fontWeight: hasUnread ? 700 : 400, flexShrink: 0, marginLeft: 6 }}>{conv.updated_at && timeAgo(conv.updated_at)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontWeight: hasUnread ? 600 : 400 }}>
                        {conv.last_message?.content ?? "No messages yet"}
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
        </div>

        {/* ── RIGHT: CHAT WINDOW ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg)", minWidth: 0, ...(mobileView === "list" ? { display: "none" } : {}) }}
          className={mobileView === "list" ? "mobile-hidden" : ""}>

          {!activeConv ? (
            /* Empty State */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
              <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg, rgba(203,38,228,0.1), rgba(139,92,246,0.1))", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, border: "1px solid rgba(203,38,228,0.2)" }}>
                <MessageCircle size={44} style={{ color: "var(--accent)" }} />
              </div>
              <h2 style={{ margin: "0 0 10px", fontWeight: 900, fontSize: 22 }}>Your Messages</h2>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.7, maxWidth: 320 }}>
                Send private messages to teachers, learners and classmates. Click a conversation or start a new one.
              </p>
              <button className="btn btn-primary" style={{ borderRadius: 12, padding: "11px 24px" }}
                onClick={() => setShowNewChat(true)}>
                <Plus size={15} /> New Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <button onClick={() => setMobileView("list")}
                  style={{ display: "none", width: 36, height: 36, borderRadius: "50%", border: "none", background: "var(--bg2)", cursor: "pointer", alignItems: "center", justifyContent: "center", color: "var(--text)" }}
                  className="mobile-only">
                  <ArrowLeft size={18} />
                </button>
                <ConvIcon type={activeConv.conversation_type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{getConvTitle(activeConv)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                    {activeConv.conversation_type === "direct" ? "Active now" : `${activeConv.participants?.length ?? 0} participants`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { icon: <Phone size={17} />, title: "Call" },
                    { icon: <Video size={17} />, title: "Video call" },
                    { icon: <MoreVertical size={17} />, title: "More options" },
                  ].map((btn, i) => (
                    <button key={i} title={btn.title}
                      style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text)" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg2)"; (e.currentTarget as HTMLElement).style.color = "var(--muted)" }}>
                      {btn.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 2, background: "var(--bg)" }}>
                {msgLoading && (
                  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                    <div className="spinner" />
                  </div>
                )}

                {!msgLoading && messages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: "var(--text)" }}>Start the conversation!</div>
                    <div style={{ fontSize: 13 }}>Send your first message below.</div>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user?.id
                  const prevMsg = messages[idx - 1]
                  const nextMsg = messages[idx + 1]
                  const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
                  const showAvatar = !isOwn && (!nextMsg || nextMsg.sender_id !== msg.sender_id)
                  const showSenderName = !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id)
                  const isGrouped = prevMsg && prevMsg.sender_id === msg.sender_id && !showDate

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 8px" }}>
                          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, whiteSpace: "nowrap", padding: "3px 12px", borderRadius: 20, background: "var(--bg2)", border: "1px solid var(--border)" }}>
                            {formatDate(msg.created_at)}
                          </span>
                          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, marginBottom: isGrouped ? 2 : 8 }}>
                        {/* Avatar placeholder for grouping */}
                        {!isOwn && (
                          <div style={{ width: 32, flexShrink: 0 }}>
                            {showAvatar && <Avatar name={msg.sender?.full_name ?? "?"} size={32} url={msg.sender?.profile?.avatar_url} />}
                          </div>
                        )}

                        <div style={{ maxWidth: "65%", display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
                          {showSenderName && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4, paddingLeft: 4 }}>
                              {msg.sender?.full_name ?? "Unknown"}
                            </div>
                          )}

                          <div style={{
                            padding: "9px 14px",
                            borderRadius: isOwn
                              ? (isGrouped ? "18px 4px 4px 18px" : "18px 4px 18px 18px")
                              : (isGrouped ? "4px 18px 18px 4px" : "4px 18px 18px 18px"),
                            background: isOwn
                              ? "linear-gradient(135deg, #cb26e4, #8b5cf6)"
                              : "var(--card)",
                            color: isOwn ? "white" : "var(--text)",
                            border: isOwn ? "none" : "1px solid var(--border)",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                            opacity: msg.temp ? 0.7 : 1,
                            transition: "opacity 0.2s",
                          }}>
                            {msg.is_deleted
                              ? <span style={{ fontStyle: "italic", opacity: 0.6, fontSize: 13 }}>Message deleted</span>
                              : <span style={{ fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" }}>{msg.content}</span>
                            }
                          </div>

                          {/* Timestamp + status */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0 }}>
                            <span style={{ fontSize: 10, color: "var(--muted)" }}>{formatTime(msg.created_at)}</span>
                            {msg.is_edited && <span style={{ fontSize: 10, color: "var(--muted)" }}>· edited</span>}
                            {isOwn && (
                              msg.error
                                ? <span style={{ fontSize: 10, color: "var(--danger)" }}>Failed</span>
                                : msg.temp
                                  ? <Circle size={10} style={{ color: "var(--muted)", opacity: 0.5 }} />
                                  : <CheckCheck size={12} style={{ color: "var(--accent)" }} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "flex-end", gap: 10 }}>
                {/* Attachment buttons */}
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { icon: <Image size={18} />, title: "Send image" },
                    { icon: <Paperclip size={18} />, title: "Attach file" },
                  ].map((btn, i) => (
                    <button key={i} title={btn.title}
                      style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; (e.currentTarget as HTMLElement).style.background = "rgba(203,38,228,0.08)" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--muted)"; (e.currentTarget as HTMLElement).style.background = "none" }}>
                      {btn.icon}
                    </button>
                  ))}
                </div>

                {/* Text input */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 24, border: "1px solid var(--border)", background: "var(--bg2)", transition: "border-color 0.15s" }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlurCapture={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                  <input ref={inputRef}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Type a message..."
                    disabled={sendMutation.isPending}
                    style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }} />
                  <button title="Emoji" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 0 }}>
                    <Smile size={18} />
                  </button>
                </div>

                {/* Send button */}
                <button onClick={handleSend}
                  disabled={!message.trim() || sendMutation.isPending}
                  style={{ width: 42, height: 42, borderRadius: "50%", border: "none", background: message.trim() ? "linear-gradient(135deg, #cb26e4, #8b5cf6)" : "var(--bg2)", color: message.trim() ? "white" : "var(--muted)", cursor: message.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s", boxShadow: message.trim() ? "0 4px 12px rgba(203,38,228,0.35)" : "none" }}>
                  {sendMutation.isPending
                    ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "white" }} />
                    : <Send size={18} style={{ marginLeft: 2 }} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}