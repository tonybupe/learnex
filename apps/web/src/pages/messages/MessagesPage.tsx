import AppShell from "@/components/layout/AppShell"
import { useState, useEffect, useRef, useCallback } from "react"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useAuthStore } from "@/features/auth/auth.store"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, Send, Plus, MessageCircle, Users, ArrowLeft, CheckCheck, Trash2, Edit2, X, UserPlus } from "lucide-react"

interface User { id: number; full_name: string; email: string; role: string; profile?: { avatar_url?: string } }
interface Participant { user_id: number; role: string; user?: User }
interface Message { id: number; conversation_id: number; sender_id: number; content: string; message_type: string; is_edited: boolean; is_deleted: boolean; created_at: string; sender?: { id: number; full_name: string } }
interface Conversation { id: number; title?: string; conversation_type: string; class_id?: number; is_active: boolean; updated_at: string; participants?: Participant[] }

const WS_BASE = (import.meta.env.VITE_WS_URL || "ws://localhost:8000")

function Avatar({ name, size = 40, color = "var(--accent)" }: { name: string; size?: number; color?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.4, flexShrink: 0 }}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: "short" })
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

function groupByDate(msgs: Message[]) {
  const groups: { date: string; msgs: Message[] }[] = []
  msgs.forEach(msg => {
    const d = new Date(msg.created_at)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    let label = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
    if (d.toDateString() === today.toDateString()) label = "Today"
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday"
    const last = groups[groups.length - 1]
    if (last?.date === label) last.msgs.push(msg)
    else groups.push({ date: label, msgs: [msg] })
  })
  return groups
}

export default function MessagesPage() {
  const me = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<number | null>(null)
  const [text, setText] = useState("")
  const [search, setSearch] = useState("")
  const [showUsers, setShowUsers] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [editMsg, setEditMsg] = useState<Message | null>(null)
  const [editText, setEditText] = useState("")
  const [mobileChat, setMobileChat] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Fetch all users for DM picker
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await api.get("/users")
      return (Array.isArray(res.data) ? res.data : []) as User[]
    },
    retry: false,
  })

  // Fetch conversations
  const { data: convs = [], isLoading: convsLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get(endpoints.messaging.list)
      return (Array.isArray(res.data) ? res.data : []) as Conversation[]
    },
    refetchInterval: 20000,
    retry: false,
  })

  // Fetch messages
  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["messages", activeId],
    queryFn: async () => {
      const res = await api.get(endpoints.messaging.messages(activeId!))
      return (Array.isArray(res.data) ? res.data : []) as Message[]
    },
    enabled: !!activeId,
    retry: false,
  })

  // WebSocket
  useEffect(() => {
    if (!activeId) return
    const token = localStorage.getItem("learnex_access_token")
    const ws = new WebSocket(`${WS_BASE}/api/v1/messaging/ws/${activeId}?token=${token}`)
    wsRef.current = ws
    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data) as Message
        if (msg?.id) {
          queryClient.setQueryData(["messages", activeId], (old: Message[] = []) =>
            old.find(m => m.id === msg.id) ? old : [...old, msg]
          )
        }
      } catch {}
    }
    return () => { ws.close(); wsRef.current = null }
  }, [activeId])

  // Scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages.length])

  // Mark read
  useEffect(() => {
    if (activeId) api.post(endpoints.messaging.markRead(activeId), {}).catch(() => {})
  }, [activeId])

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(endpoints.messaging.sendMessage(activeId!), { content, message_type: "text" })
      return res.data as Message
    },
    onSuccess: msg => {
      queryClient.setQueryData(["messages", activeId], (old: Message[] = []) => [...old, msg])
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      wsRef.current?.readyState === WebSocket.OPEN && wsRef.current.send(JSON.stringify(msg))
    },
  })

  const editMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const res = await api.patch(endpoints.messaging.editMessage(id), { content })
      return res.data as Message
    },
    onSuccess: msg => {
      queryClient.setQueryData(["messages", activeId], (old: Message[] = []) => old.map(m => m.id === msg.id ? msg : m))
      setEditMsg(null); setEditText("")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(endpoints.messaging.deleteMessage(id)),
    onSuccess: (_, id) => queryClient.setQueryData(["messages", activeId], (old: Message[] = []) => old.filter(m => m.id !== id)),
  })

  const startDMMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await api.post(endpoints.messaging.startDirect, { recipient_user_id: userId })
      return res.data as Conversation
    },
    onSuccess: conv => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      setActiveId(conv.id); setShowUsers(false); setMobileChat(true)
    },
  })

  const handleSend = useCallback(() => {
    const t = text.trim()
    if (!t || !activeId) return
    setText(""); sendMutation.mutate(t)
  }, [text, activeId])

  const getConvName = (conv: Conversation) => {
    if (conv.title) return conv.title
    if (conv.conversation_type === "direct") {
      const other = conv.participants?.find(p => p.user_id !== me?.id)
      return other?.user?.full_name ?? "Direct Message"
    }
    return `Group Chat #${conv.id}`
  }

  const activeConv = convs.find(c => c.id === activeId)
  const filteredConvs = convs.filter(c => getConvName(c).toLowerCase().includes(search.toLowerCase()))
  const filteredUsers = allUsers.filter(u => u.id !== me?.id && (u.full_name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())))

  const COLORS = ["var(--accent)", "var(--accent2)", "var(--success)", "#f59e0b", "#ef4444", "#8b5cf6"]
  const colorFor = (id: number) => COLORS[id % COLORS.length]

  return (
    <AppShell>
      <div style={{ height: "calc(100vh - 80px)", display: "flex", borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "var(--shadow2)" }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width: 300, flexShrink: 0, background: "var(--card)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>

          {/* Header */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 18 }}>💬 Messages</span>
              <button onClick={() => setShowUsers(!showUsers)} title="New message"
                style={{ width: 32, height: 32, borderRadius: 10, border: "1px solid var(--border)", background: showUsers ? "var(--accent)" : "transparent", color: showUsers ? "white" : "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                <UserPlus size={16} />
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input className="audit-control" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..." style={{ paddingLeft: 30, fontSize: 13, height: 36 }} />
            </div>
          </div>

          {/* User picker for new DM */}
          {showUsers && (
            <div style={{ borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
              <div style={{ padding: "8px 12px 4px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>Start new conversation</div>
                <div style={{ position: "relative" }}>
                  <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input className="audit-control" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search users..." style={{ paddingLeft: 26, fontSize: 12, height: 30 }} autoFocus />
                </div>
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto", padding: "4px 8px 8px" }}>
                {filteredUsers.slice(0, 10).map(u => (
                  <div key={u.id} onClick={() => startDMMutation.mutate(u.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 10, cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--card)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <Avatar name={u.full_name} size={32} color={colorFor(u.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{u.role}</div>
                    </div>
                    {startDMMutation.isPending && <div className="spinner" style={{ width: 14, height: 14 }} />}
                  </div>
                ))}
                {filteredUsers.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)", padding: "8px 8px" }}>No users found</div>}
              </div>
            </div>
          )}

          {/* Conversation List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {convsLoading && [1,2,3].map(i => (
              <div key={i} style={{ padding: "12px 16px", display: "flex", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--border)" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                  <div style={{ height: 12, background: "var(--border)", borderRadius: 4, width: "60%" }} />
                  <div style={{ height: 10, background: "var(--border)", borderRadius: 4, width: "80%" }} />
                </div>
              </div>
            ))}
            {!convsLoading && filteredConvs.length === 0 && (
              <div style={{ padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>No conversations yet</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Click the icon above to start chatting</div>
              </div>
            )}
            {filteredConvs.map(conv => {
              const isActive = conv.id === activeId
              const name = getConvName(conv)
              const isGroup = conv.conversation_type !== "direct"
              return (
                <div key={conv.id} onClick={() => { setActiveId(conv.id); setMobileChat(true) }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", borderLeft: `3px solid ${isActive ? "var(--accent)" : "transparent"}`, background: isActive ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg2)" }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent" }}>
                  {isGroup
                    ? <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, var(--accent), var(--accent2))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}><Users size={18} /></div>
                    : <Avatar name={name} size={40} color={colorFor(conv.id)} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                      <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0, marginLeft: 6 }}>{formatTime(conv.updated_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{conv.conversation_type}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── CHAT AREA ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg2)", position: "relative", minWidth: 0 }}>

          {!activeId ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", gap: 12 }}>
              <div style={{ fontSize: 80 }}>💬</div>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)" }}>Learnex Messages</h3>
              <p style={{ margin: 0, fontSize: 14, textAlign: "center", maxWidth: 300 }}>Select a conversation from the left or start a new one by clicking the <strong>+</strong> icon</p>
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setShowUsers(true)}>
                <UserPlus size={16} /> Start Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: "12px 20px", background: "var(--card)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => { setMobileChat(false); setActiveId(null) }}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center" }}>
                  <ArrowLeft size={20} />
                </button>
                {activeConv && (
                  <>
                    {activeConv.conversation_type !== "direct"
                      ? <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, var(--accent), var(--accent2))", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}><Users size={18} /></div>
                      : <Avatar name={getConvName(activeConv)} size={40} color={colorFor(activeConv.id)} />
                    }
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{getConvName(activeConv)}</div>
                      <div style={{ fontSize: 12, color: "var(--success)" }}>● online</div>
                    </div>
                  </>
                )}
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
                {msgsLoading && <div style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>Loading messages...</div>}
                {!msgsLoading && messages.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--muted)", padding: 60 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
                    <p>No messages yet — say hello!</p>
                  </div>
                )}

                {groupByDate(messages).map(group => (
                  <div key={group.date}>
                    {/* Date divider */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 8px" }}>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                      <span style={{ fontSize: 11, color: "var(--muted)", padding: "3px 10px", background: "var(--card)", borderRadius: 999, border: "1px solid var(--border)", fontWeight: 600 }}>{group.date}</span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>

                    {group.msgs.map((msg, idx) => {
                      const isMe = msg.sender_id === me?.id
                      const prev = group.msgs[idx - 1]
                      const showName = !isMe && msg.sender_id !== prev?.sender_id
                      return (
                        <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 3, gap: 8, alignItems: "flex-end" }}>
                          {!isMe && (
                            <div style={{ width: 28, flexShrink: 0 }}>
                              {showName && <Avatar name={msg.sender?.full_name ?? "U"} size={28} color={colorFor(msg.sender_id)} />}
                            </div>
                          )}

                          <div style={{ maxWidth: "62%", position: "relative" }}
                            onMouseEnter={e => { const a = e.currentTarget.querySelector<HTMLElement>(".ma"); if (a) a.style.display = "flex" }}
                            onMouseLeave={e => { const a = e.currentTarget.querySelector<HTMLElement>(".ma"); if (a) a.style.display = "none" }}>

                            {showName && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: colorFor(msg.sender_id), marginBottom: 3, paddingLeft: 4 }}>
                                {msg.sender?.full_name}
                              </div>
                            )}

                            {editMsg?.id === msg.id ? (
                              <div style={{ display: "flex", gap: 6, alignItems: "center", background: "var(--card)", borderRadius: 12, padding: "8px 10px", border: "2px solid var(--accent)" }}>
                                <input value={editText} onChange={e => setEditText(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") editMutation.mutate({ id: msg.id, content: editText }); if (e.key === "Escape") { setEditMsg(null) } }}
                                  style={{ flex: 1, border: "none", background: "transparent", color: "var(--text)", fontSize: 14, outline: "none" }}
                                  autoFocus />
                                <button onClick={() => editMutation.mutate({ id: msg.id, content: editText })}
                                  style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "4px 8px", color: "white", cursor: "pointer", fontSize: 12 }}>Save</button>
                                <button onClick={() => setEditMsg(null)}
                                  style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={14} /></button>
                              </div>
                            ) : (
                              <div style={{
                                padding: "8px 14px",
                                borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                background: isMe ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--card)",
                                color: isMe ? "white" : "var(--text)",
                                fontSize: 14, lineHeight: 1.6, wordBreak: "break-word",
                                border: isMe ? "none" : "1px solid var(--border)",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                              }}>
                                {msg.is_deleted
                                  ? <em style={{ opacity: 0.5, fontSize: 13 }}>🚫 Message deleted</em>
                                  : msg.content
                                }
                              </div>
                            )}

                            <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", alignItems: "center", gap: 4, marginTop: 2, paddingLeft: 4 }}>
                              {msg.is_edited && <span style={{ fontSize: 10, color: "var(--muted)" }}>edited</span>}
                              <span style={{ fontSize: 10, color: "var(--muted)" }}>{formatTime(msg.created_at)}</span>
                              {isMe && !msg.is_deleted && <CheckCheck size={11} style={{ color: "var(--accent2)" }} />}
                            </div>

                            {/* Hover actions */}
                            {isMe && !msg.is_deleted && !editMsg && (
                              <div className="ma" style={{ display: "none", position: "absolute", top: 0, right: "calc(100% + 6px)", gap: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "4px 6px", boxShadow: "var(--shadow2)", alignItems: "center" }}>
                                <button onClick={() => { setEditMsg(msg); setEditText(msg.content) }}
                                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", padding: "3px", borderRadius: 6, display: "flex" }} title="Edit">
                                  <Edit2 size={13} />
                                </button>
                                <button onClick={() => window.confirm("Delete?") && deleteMutation.mutate(msg.id)}
                                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--danger)", padding: "3px", borderRadius: 6, display: "flex" }} title="Delete">
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
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: "12px 20px", background: "var(--card)", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", padding: "6px 6px 6px 16px", transition: "border-color 0.15s" }}
                  onFocusCapture={e => e.currentTarget.style.borderColor = "var(--accent)"}
                  onBlurCapture={e => e.currentTarget.style.borderColor = "var(--border)"}>
                  <input ref={inputRef} value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Type a message..."
                    style={{ flex: 1, border: "none", background: "transparent", color: "var(--text)", fontSize: 14, outline: "none", lineHeight: 1.5 }} />
                  <button onClick={handleSend} disabled={!text.trim() || sendMutation.isPending}
                    style={{ width: 38, height: 38, borderRadius: "50%", border: "none", flexShrink: 0, cursor: text.trim() ? "pointer" : "not-allowed", background: text.trim() ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--border)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                    {sendMutation.isPending ? <div className="spinner-small" /> : <Send size={16} />}
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