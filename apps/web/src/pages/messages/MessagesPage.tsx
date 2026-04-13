import { useState, useEffect, useRef, useCallback } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import { Search, Send, Plus, MoreVertical, Phone, Video, ArrowLeft, Check, CheckCheck, Users, MessageCircle } from "lucide-react"
import "./messages.css"

interface UserMini { id: number; full_name: string; email: string; role: string; profile?: { avatar_url?: string } }
interface Message {
  id: number; conversation_id: number; sender_id: number
  content: string; message_type: string; is_edited: boolean
  is_deleted: boolean; created_at: string; updated_at: string
  sender?: UserMini
  temp?: boolean; error?: boolean
}
interface Conversation {
  id: number; conversation_type: string; title?: string
  class_id?: number; lesson_id?: number; created_by_id?: number
  is_active: boolean; created_at: string; updated_at: string
  participants?: any[]; last_message?: Message; unread_count?: number
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

function Avatar({ name, size = 40, url }: { name: string; size?: number; url?: string }) {
  const colors = ["#cb26e4", "#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"]
  const color = colors[name.charCodeAt(0) % colors.length]
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.4, flexShrink: 0 }}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

export default function MessagesPage() {
  const user = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [message, setMessage] = useState("")
  const [search, setSearch] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)
  const [users, setUsers] = useState<UserMini[]>([])
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch conversations
  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get(endpoints.messaging.list)
      return Array.isArray(res.data) ? res.data as Conversation[] : []
    },
    refetchInterval: 15000,
  })

  // Fetch messages for active conversation
  const { data: messages = [], isLoading: msgLoading } = useQuery({
    queryKey: ["messages", activeConv?.id],
    queryFn: async () => {
      const res = await api.get(endpoints.messaging.messages(activeConv!.id))
      return Array.isArray(res.data) ? res.data as Message[] : []
    },
    enabled: !!activeConv,
    refetchInterval: false,
  })

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(endpoints.messaging.sendMessage(activeConv!.id), {
        content, message_type: "text"
      })
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

  // Start direct conversation
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

  // WebSocket for real-time
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

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load users for new chat
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const openConversation = (conv: Conversation) => {
    setActiveConv(conv)
    setMobileView("chat")
    // Mark as read
    api.post(endpoints.messaging.markRead(conv.id), {}).catch(() => {})
    queryClient.invalidateQueries({ queryKey: ["conversations"] })
  }

  const getConvTitle = (conv: Conversation) => {
    if (conv.title) return conv.title
    if (conv.conversation_type === "direct") return "Direct Message"
    if (conv.conversation_type === "class") return `Class Chat`
    return "Group Chat"
  }

  const getConvIcon = (conv: Conversation) => {
    if (conv.conversation_type === "direct") return "💬"
    if (conv.conversation_type === "class") return "🎓"
    return "👥"
  }

  const filtered = conversations.filter(c =>
    getConvTitle(c).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell>
      <div className="messages-shell">

        {/* LEFT: Conversation List */}
        <div className={`conv-panel ${mobileView === "chat" ? "mobile-hidden" : ""}`}>

          {/* Header */}
          <div className="conv-header">
            <div style={{ fontWeight: 800, fontSize: 18 }}>Messages</div>
            <button className="msg-icon-btn" onClick={() => setShowNewChat(!showNewChat)} title="New chat">
              <Plus size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="conv-search">
            <Search size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..." style={{ border: "none", background: "transparent", outline: "none", color: "var(--text)", fontSize: 14, flex: 1 }} />
          </div>

          {/* New Chat Panel */}
          {showNewChat && (
            <div className="new-chat-panel">
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--muted)" }}>START NEW CHAT</div>
              {users.length === 0
                ? <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading users...</div>
                : users.map(u => (
                  <div key={u.id} className="user-row" onClick={() => startDirectMutation.mutate(u.id)}>
                    <Avatar name={u.full_name} size={36} url={u.profile?.avatar_url} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{u.role}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* Conversation List */}
          <div className="conv-list">
            {convLoading && <div style={{ padding: 20, color: "var(--muted)", fontSize: 13, textAlign: "center" }}>Loading...</div>}
            {!convLoading && filtered.length === 0 && (
              <div style={{ padding: 32, textAlign: "center" }}>
                <MessageCircle size={40} style={{ color: "var(--muted)", marginBottom: 12 }} />
                <div style={{ color: "var(--muted)", fontSize: 14 }}>No conversations yet</div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>Click + to start a new chat</div>
              </div>
            )}
            {filtered.map(conv => (
              <div key={conv.id}
                className={`conv-item ${activeConv?.id === conv.id ? "active" : ""}`}
                onClick={() => openConversation(conv)}>
                <div className="conv-avatar">
                  <span style={{ fontSize: 20 }}>{getConvIcon(conv)}</span>
                </div>
                <div className="conv-info">
                  <div className="conv-name">{getConvTitle(conv)}</div>
                  <div className="conv-preview">
                    {conv.last_message?.content ?? "No messages yet"}
                  </div>
                </div>
                <div className="conv-meta">
                  {conv.updated_at && <div className="conv-time">{timeAgo(conv.updated_at)}</div>}
                  {(conv.unread_count ?? 0) > 0 && (
                    <div className="unread-badge">{conv.unread_count}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Chat Window */}
        <div className={`chat-panel ${mobileView === "list" ? "mobile-hidden" : ""}`}>
          {!activeConv ? (
            <div className="chat-empty">
              <MessageCircle size={64} style={{ color: "var(--muted)", marginBottom: 16 }} />
              <h3 style={{ margin: "0 0 8px", fontWeight: 800 }}>Your Messages</h3>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
                Select a conversation or start a new one
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <button className="msg-icon-btn mobile-only" onClick={() => setMobileView("list")}>
                  <ArrowLeft size={20} />
                </button>
                <div className="conv-avatar" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {getConvIcon(activeConv)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{getConvTitle(activeConv)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {activeConv.conversation_type === "direct" ? "Direct message" : "Group conversation"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="msg-icon-btn"><Phone size={18} /></button>
                  <button className="msg-icon-btn"><Video size={18} /></button>
                  <button className="msg-icon-btn"><MoreVertical size={18} /></button>
                </div>
              </div>

              {/* Messages */}
              <div className="messages-area">
                {msgLoading && (
                  <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
                    <div className="spinner" />
                  </div>
                )}
                {!msgLoading && messages.length === 0 && (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>👋</div>
                    <div style={{ color: "var(--muted)", fontSize: 14 }}>No messages yet. Say hello!</div>
                  </div>
                )}

                {/* Date separators + messages */}
                {messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === user?.id
                  const prevMsg = messages[idx - 1]
                  const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
                  const showSender = !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id)

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="date-separator">
                          <span>{new Date(msg.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
                        </div>
                      )}
                      <div className={`msg-row ${isOwn ? "own" : "other"}`}>
                        {!isOwn && showSender && (
                          <Avatar name={msg.sender?.full_name ?? "?"} size={28} />
                        )}
                        {!isOwn && !showSender && <div style={{ width: 28 }} />}
                        <div className={`msg-bubble ${isOwn ? "own" : "other"} ${msg.temp ? "sending" : ""} ${msg.error ? "error" : ""}`}>
                          {showSender && !isOwn && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
                              {msg.sender?.full_name ?? "Unknown"}
                            </div>
                          )}
                          {msg.is_deleted
                            ? <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: 13 }}>🚫 Message deleted</span>
                            : <span style={{ fontSize: 14, lineHeight: 1.5 }}>{msg.content}</span>
                          }
                          <div className="msg-meta">
                            <span>{formatTime(msg.created_at)}</span>
                            {msg.is_edited && <span>edited</span>}
                            {isOwn && (
                              msg.temp ? <span style={{ opacity: 0.5 }}>🕐</span>
                              : msg.error ? <span style={{ color: "var(--danger)" }}>⚠️</span>
                              : <CheckCheck size={12} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="chat-input-bar">
                <div className="chat-input-wrapper">
                  <input
                    ref={inputRef}
                    className="chat-input"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={sendMutation.isPending}
                  />
                  <button
                    className={`send-btn ${message.trim() ? "active" : ""}`}
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}