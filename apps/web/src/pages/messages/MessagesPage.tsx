import AppShell from "@/components/layout/AppShell"
import { useState, useEffect, useRef, useCallback } from "react"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useAuthStore } from "@/features/auth/auth.store"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, Send, Plus, MessageCircle, Users, MoreVertical, Phone, Video, ArrowLeft, Check, CheckCheck, Trash2, Edit2, X } from "lucide-react"
import { UserAvatar } from "@/components/ui/UserAvatar"

interface Participant { user_id: number; role: string; user?: { id: number; full_name: string; email: string; role: string; profile?: { avatar_url?: string } } }
interface Message { id: number; conversation_id: number; sender_id: number; content: string; message_type: string; is_edited: boolean; is_deleted: boolean; created_at: string; updated_at: string; sender?: { id: number; full_name: string; profile?: { avatar_url?: string } } }
interface Conversation { id: number; title?: string; conversation_type: string; class_id?: number; is_active: boolean; created_at: string; updated_at: string; participants?: Participant[] }

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000"

export default function MessagesPage() {
  const user = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const [activeConvId, setActiveConvId] = useState<number | null>(null)
  const [messageText, setMessageText] = useState("")
  const [search, setSearch] = useState("")
  const [editingMsg, setEditingMsg] = useState<Message | null>(null)
  const [editText, setEditText] = useState("")
  const [showNewDM, setShowNewDM] = useState(false)
  const [dmUserId, setDmUserId] = useState("")
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Fetch conversations
  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get(endpoints.messaging.list)
      return Array.isArray(res.data) ? res.data as Conversation[] : []
    },
    refetchInterval: 15000,
    retry: false,
  })

  // Fetch messages for active conversation
  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["messages", activeConvId],
    queryFn: async () => {
      const res = await api.get(endpoints.messaging.messages(activeConvId!))
      return Array.isArray(res.data) ? res.data as Message[] : []
    },
    enabled: !!activeConvId,
    refetchInterval: false,
    retry: false,
  })

  // WebSocket connection for active conversation
  useEffect(() => {
    if (!activeConvId || !user) return
    const token = localStorage.getItem("learnex_access_token")
    const ws = new WebSocket(`${WS_URL}/api/v1/messaging/ws/${activeConvId}?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.id) {
          queryClient.setQueryData(["messages", activeConvId], (old: Message[] = []) => {
            if (old.find(m => m.id === msg.id)) return old
            return [...old, msg]
          })
          queryClient.invalidateQueries({ queryKey: ["conversations"] })
        }
      } catch {}
    }

    return () => { ws.close(); wsRef.current = null }
  }, [activeConvId, user])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Mark as read when opening conversation
  useEffect(() => {
    if (activeConvId) {
      api.post(endpoints.messaging.markRead(activeConvId), {}).catch(() => {})
    }
  }, [activeConvId])

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(endpoints.messaging.sendMessage(activeConvId!), {
        content, message_type: "text"
      })
      return res.data as Message
    },
    onSuccess: (msg) => {
      queryClient.setQueryData(["messages", activeConvId], (old: Message[] = []) => [...old, msg])
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      // Broadcast via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg))
      }
    },
  })

  const editMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const res = await api.patch(endpoints.messaging.editMessage(id), { content })
      return res.data as Message
    },
    onSuccess: (msg) => {
      queryClient.setQueryData(["messages", activeConvId], (old: Message[] = []) =>
        old.map(m => m.id === msg.id ? msg : m)
      )
      setEditingMsg(null); setEditText("")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(endpoints.messaging.deleteMessage(id)),
    onSuccess: (_, id) => {
      queryClient.setQueryData(["messages", activeConvId], (old: Message[] = []) =>
        old.filter(m => m.id !== id)
      )
    },
  })

  const startDMMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await api.post(endpoints.messaging.startDirect, { recipient_user_id: userId })
      return res.data as Conversation
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      setActiveConvId(conv.id)
      setShowNewDM(false)
      setDmUserId("")
      setMobileShowChat(true)
    },
  })

  const handleSend = useCallback(() => {
    const text = messageText.trim()
    if (!text || !activeConvId) return
    setMessageText("")
    sendMutation.mutate(text)
  }, [messageText, activeConvId, sendMutation])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }, [handleSend])

  const getConvName = (conv: Conversation) => {
    if (conv.title) return conv.title
    if (conv.conversation_type === "direct" && conv.participants) {
      const other = conv.participants.find(p => p.user_id !== user?.id)
      return other?.user?.full_name ?? "Direct Message"
    }
    return `Conversation #${conv.id}`
  }

  const getConvAvatar = (conv: Conversation) => {
    if (conv.conversation_type === "direct" && conv.participants) {
      const other = conv.participants.find(p => p.user_id !== user?.id)
      return other?.user
    }
    return null
  }

  const activeConv = conversations.find(c => c.id === activeConvId)
  const filteredConvs = conversations.filter(c =>
    getConvName(c).toLowerCase().includes(search.toLowerCase())
  )

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: "short" })
    return d.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = []
    msgs.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
      const last = groups[groups.length - 1]
      if (last && last.date === date) last.messages.push(msg)
      else groups.push({ date, messages: [msg] })
    })
    return groups
  }

  return (
    <AppShell>
      <div style={{ display: "flex", height: "calc(100vh - 64px)", background: "var(--bg)", overflow: "hidden", borderRadius: 16, border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>

        {/* LEFT PANEL — Conversation List */}
        <div style={{
          width: 320, flexShrink: 0, borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column", background: "var(--card)",
          ...(mobileShowChat ? { display: "none" } : {})
        }}
          className="messages-sidebar">

          {/* Header */}
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Messages</h2>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}
                onClick={() => setShowNewDM(!showNewDM)}>
                <Plus size={14} /> New
              </button>
            </div>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input className="audit-control" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                style={{ paddingLeft: 32, fontSize: 13 }} />
            </div>
          </div>

          {/* New DM Form */}
          {showNewDM && (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--accent)" }}>Start Direct Message</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="audit-control" type="number" value={dmUserId}
                  onChange={e => setDmUserId(e.target.value)}
                  placeholder="Enter user ID..."
                  style={{ flex: 1, fontSize: 13 }} />
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}
                  onClick={() => dmUserId && startDMMutation.mutate(Number(dmUserId))}
                  disabled={startDMMutation.isPending}>
                  {startDMMutation.isPending ? "..." : "Go"}
                </button>
              </div>
            </div>
          )}

          {/* Conversations List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {convsLoading && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                Loading...
              </div>
            )}
            {!convsLoading && filteredConvs.length === 0 && (
              <div style={{ padding: 32, textAlign: "center" }}>
                <MessageCircle size={36} style={{ color: "var(--muted)", marginBottom: 12 }} />
                <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>No conversations yet</p>
                <p style={{ color: "var(--muted)", fontSize: 12, margin: "4px 0 0" }}>Start a new message above</p>
              </div>
            )}
            {filteredConvs.map(conv => {
              const isActive = conv.id === activeConvId
              const convUser = getConvAvatar(conv)
              const isGroup = conv.conversation_type !== "direct"
              return (
                <div key={conv.id}
                  onClick={() => { setActiveConvId(conv.id); setMobileShowChat(true) }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                    cursor: "pointer", transition: "background 0.15s",
                    background: isActive ? "color-mix(in srgb, var(--accent) 10%, var(--card))" : "transparent",
                    borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg2)" }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent" }}>

                  {/* Avatar */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {isGroup ? (
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, var(--accent), var(--accent2))", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                        <Users size={20} />
                      </div>
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "var(--accent)" }}>
                        {getConvName(conv)[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {getConvName(conv)}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0, marginLeft: 8 }}>
                        {formatTime(conv.updated_at)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isGroup ? `${conv.conversation_type} chat` : "Direct message"}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT PANEL — Chat Window */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg2)", position: "relative" }}
          className={mobileShowChat ? "mobile-show" : ""}>

          {!activeConvId ? (
            /* Empty State */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: 72, marginBottom: 16 }}>💬</div>
              <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>Your Messages</h3>
              <p style={{ margin: 0, fontSize: 14 }}>Select a conversation to start chatting</p>
              <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowNewDM(true)}>
                <Plus size={16} /> Start New Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", gap: 12 }}>
                <button className="btn" style={{ display: "none" }} onClick={() => setMobileShowChat(false)}
                  id="back-btn">
                  <ArrowLeft size={16} />
                </button>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--accent2))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                  {activeConv ? getConvName(activeConv)[0]?.toUpperCase() : "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{activeConv ? getConvName(activeConv) : ""}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {activeConv?.participants?.length ?? 0} participants · {activeConv?.conversation_type}
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
                {msgsLoading && (
                  <div style={{ textAlign: "center", color: "var(--muted)", padding: 32, fontSize: 13 }}>Loading messages...</div>
                )}
                {!msgsLoading && messages.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--muted)", padding: 48 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
                    <p style={{ fontSize: 14 }}>No messages yet. Say hello!</p>
                  </div>
                )}

                {groupMessagesByDate(messages).map(group => (
                  <div key={group.date}>
                    {/* Date Divider */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 8px" }}>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                      <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, padding: "4px 10px", background: "var(--card)", borderRadius: 999, border: "1px solid var(--border)" }}>
                        {group.date}
                      </span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>

                    {group.messages.map((msg, idx) => {
                      const isMe = msg.sender_id === user?.id
                      const prevMsg = group.messages[idx - 1]
                      const showAvatar = !isMe && (!prevMsg || prevMsg.sender_id !== msg.sender_id)
                      const showName = showAvatar

                      return (
                        <div key={msg.id}
                          style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 2, gap: 8, alignItems: "flex-end" }}>

                          {/* Other's avatar */}
                          {!isMe && (
                            <div style={{ width: 28, flexShrink: 0, display: "flex", alignItems: "flex-end" }}>
                              {showAvatar && (
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 800 }}>
                                  {(msg.sender?.full_name ?? "U")[0]}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message bubble */}
                          <div style={{ maxWidth: "65%", position: "relative" }}
                            onMouseEnter={e => { const actions = e.currentTarget.querySelector<HTMLElement>(".msg-actions"); if (actions) actions.style.opacity = "1" }}
                            onMouseLeave={e => { const actions = e.currentTarget.querySelector<HTMLElement>(".msg-actions"); if (actions) actions.style.opacity = "0" }}>

                            {showName && !isMe && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 3, paddingLeft: 4 }}>
                                {msg.sender?.full_name ?? "Unknown"}
                              </div>
                            )}

                            <div style={{
                              padding: "8px 12px",
                              borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                              background: isMe ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--card)",
                              color: isMe ? "white" : "var(--text)",
                              fontSize: 14, lineHeight: 1.5,
                              border: isMe ? "none" : "1px solid var(--border)",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                              wordBreak: "break-word",
                            }}>
                              {msg.is_deleted
                                ? <em style={{ opacity: 0.6, fontSize: 13 }}>Message deleted</em>
                                : editingMsg?.id === msg.id
                                  ? (
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                      <input value={editText} onChange={e => setEditText(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") editMutation.mutate({ id: msg.id, content: editText }); if (e.key === "Escape") { setEditingMsg(null); setEditText("") } }}
                                        style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "4px 8px", color: "white", fontSize: 13, flex: 1 }}
                                        autoFocus />
                                      <button onClick={() => editMutation.mutate({ id: msg.id, content: editText })} style={{ background: "rgba(255,255,255,0.3)", border: "none", borderRadius: 6, padding: "4px 8px", color: "white", cursor: "pointer", fontSize: 12 }}>Save</button>
                                      <button onClick={() => { setEditingMsg(null); setEditText("") }} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}><X size={14} /></button>
                                    </div>
                                  )
                                  : msg.content
                              }
                            </div>

                            {/* Time + status */}
                            <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", alignItems: "center", gap: 4, marginTop: 2, paddingLeft: 4, paddingRight: 4 }}>
                              {msg.is_edited && <span style={{ fontSize: 10, color: "var(--muted)" }}>edited</span>}
                              <span style={{ fontSize: 10, color: "var(--muted)" }}>{formatTime(msg.created_at)}</span>
                              {isMe && <CheckCheck size={12} style={{ color: "var(--accent)" }} />}
                            </div>

                            {/* Actions */}
                            {!msg.is_deleted && isMe && (
                              <div className="msg-actions" style={{ position: "absolute", top: 0, right: isMe ? "100%" : "auto", left: isMe ? "auto" : "100%", opacity: 0, transition: "opacity 0.15s", display: "flex", gap: 4, background: "var(--card)", borderRadius: 8, padding: "4px", border: "1px solid var(--border)", boxShadow: "var(--shadow)", marginRight: isMe ? 8 : 0, marginLeft: isMe ? 0 : 8 }}>
                                <button onClick={() => { setEditingMsg(msg); setEditText(msg.content) }}
                                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", borderRadius: 6, color: "var(--muted)" }}
                                  title="Edit">
                                  <Edit2 size={13} />
                                </button>
                                <button onClick={() => { if (window.confirm("Delete this message?")) deleteMutation.mutate(msg.id) }}
                                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", borderRadius: 6, color: "var(--danger)" }}
                                  title="Delete">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--card)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <input
                      ref={inputRef}
                      className="audit-control"
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      style={{ paddingRight: 48, borderRadius: 24, fontSize: 14 }}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!messageText.trim() || sendMutation.isPending}
                    style={{
                      width: 44, height: 44, borderRadius: "50%", border: "none", flexShrink: 0,
                      background: messageText.trim() ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--border)",
                      color: "white", cursor: messageText.trim() ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s",
                    }}>
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .messages-sidebar { display: flex !important; width: 100% !important; position: absolute; z-index: 10; height: 100%; }
          .mobile-show .messages-sidebar { display: none !important; }
          #back-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .messages-sidebar { display: flex !important; }
        }
      `}</style>
    </AppShell>
  )
}