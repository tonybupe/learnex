import { useState, useRef, useEffect } from "react"
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
  CheckCircle2, ShieldAlert, GraduationCap, Sparkles, MoreVertical
} from "lucide-react"

interface Lesson { id: number; title: string; content: string; lesson_type: string; status: string; visibility: string; created_at: string }
interface Quiz { id: number; title: string; status: string; time_limit_minutes?: number; created_at: string }
interface ChatMessage {
  id: number; content: string; user_id: number; lesson_id: number; created_at: string
  author: { id: number; full_name: string; role: string } | null
}

type Tab = "overview" | "lessons" | "members" | "discussion"

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

// ── Join Wall ──────────────────────────────────────────────────────
function JoinWall({ cls, onJoin, joining }: { cls: Class; onJoin: () => void; joining: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", maxWidth: 440, margin: "0 auto" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(203,38,228,0.1)", border: "2px solid rgba(203,38,228,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <Lock size={32} style={{ color: "#cb26e4" }} />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 8px" }}>Members only</h3>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
        This content is available to members of <strong style={{ color: "var(--text)" }}>{cls.title}</strong> only.
        Join the class to access all lessons, discussions, and resources.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <button onClick={onJoin} disabled={joining}
          style={{ padding: "13px 32px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 800, fontSize: 15, cursor: joining ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(203,38,228,0.35)" }}>
          <UserPlus size={16} /> {joining ? "Joining..." : "Join Class"}
        </button>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          {[
            { icon: "📚", text: "All lessons" },
            { icon: "💬", text: "Discussions" },
            { icon: "📝", text: "Quizzes" },
          ].map((f, i) => (
            <div key={i} style={{ fontSize: 12, color: "var(--muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── WhatsApp-style Class Chat ─────────────────────────────────────
function ClassChat({ cls, currentUser }: { cls: Class; currentUser: any }) {
  const queryClient = useQueryClient()
  const [text, setText] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Use lesson discussion of a "general" post, or class feed posts
  // We'll use the class feed endpoint
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["class-chat", cls.id],
    queryFn: async () => {
      // Fetch posts for this class as chat messages
      const res = await api.get(`/posts?class_id=${cls.id}&limit=100`).catch(() => ({ data: [] }))
      const raw = Array.isArray(res.data) ? res.data : res.data?.data ?? []
      return raw.map((p: any) => ({
        id: p.id,
        content: p.content,
        user_id: p.author_id ?? p.author?.id,
        created_at: p.created_at,
        author: p.author ? { id: p.author.id, full_name: p.author.full_name, role: p.author.role } : null,
      })) as ChatMessage[]
    },
    refetchInterval: 5000, // poll every 5s for real-time feel
  })

  const sendMutation = useMutation({
    mutationFn: async (content: string) => api.post("/posts", {
      content,
      class_id: cls.id,
      post_type: "discussion",
      status: "published",
      visibility: "class",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-chat", cls.id] })
      setText("")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["class-chat", cls.id] }),
  })

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handleSend = () => {
    if (!text.trim()) return
    sendMutation.mutate(text.trim())
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Group messages by date
  const grouped: { date: string; msgs: ChatMessage[] }[] = []
  messages.forEach(m => {
    const date = new Date(m.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    const last = grouped[grouped.length - 1]
    if (last && last.date === date) last.msgs.push(m)
    else grouped.push({ date, msgs: [m] })
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "60vh", minHeight: 400, background: "var(--bg2)", borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }}>
      {/* Chat header */}
      <div style={{ padding: "12px 16px", background: "var(--card)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <GraduationCap size={18} style={{ color: "white" }} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{cls.title}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Class group · members only</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 700 }}>Live</span>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {isLoading && (
          <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: 20 }}>Loading messages...</div>
        )}
        {!isLoading && messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: "40px 20px" }}>
            <MessageCircle size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>No messages yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Be the first to say something! 👋</div>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            {/* Date divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 8px" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "var(--card)", border: "1px solid var(--border)" }}>
                {group.date}
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            {group.msgs.map((msg, i) => {
              const isMe = msg.user_id === currentUser?.id || msg.author?.id === currentUser?.id
              const showAvatar = !isMe && (i === 0 || group.msgs[i - 1]?.user_id !== msg.user_id)
              const showName = !isMe && showAvatar

              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: 6, marginBottom: 3 }}
                  className="chat-msg-row">
                  {/* Avatar placeholder for alignment */}
                  {!isMe && (
                    <div style={{ width: 28, flexShrink: 0 }}>
                      {showAvatar && <Avatar name={msg.author?.full_name ?? "?"} role={msg.author?.role} size={28} />}
                    </div>
                  )}

                  <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                    {showName && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#cb26e4", marginBottom: 2, paddingLeft: 4 }}>
                        {msg.author?.full_name}
                        {msg.author?.role !== "learner" && (
                          <span style={{ marginLeft: 5, fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "rgba(203,38,228,0.15)", color: "#cb26e4" }}>
                            {msg.author?.role}
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ position: "relative" }} className="chat-bubble-wrap">
                      <div style={{
                        padding: "8px 12px", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: isMe ? "linear-gradient(135deg,#cb26e4,#8b5cf6)" : "var(--card)",
                        color: isMe ? "white" : "var(--text)",
                        border: isMe ? "none" : "1px solid var(--border)",
                        fontSize: 14, lineHeight: 1.5,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0, textAlign: isMe ? "right" : "left", display: "flex", alignItems: "center", gap: 4, justifyContent: isMe ? "flex-end" : "flex-start" }}>
                        {timeAgo(msg.created_at)}
                        {isMe && <CheckCircle2 size={10} style={{ color: "var(--success)" }} />}
                      </div>
                    </div>
                  </div>

                  {/* Delete button for own or admin */}
                  {(isMe || currentUser?.role === "admin" || currentUser?.role === "teacher") && (
                    <button onClick={() => deleteMutation.mutate(msg.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "transparent", padding: 3, borderRadius: 4, flexShrink: 0, alignSelf: "center" }}
                      className="chat-delete-btn"
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--danger)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "transparent"}>
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: "10px 12px", background: "var(--card)", borderTop: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <Avatar name={currentUser?.full_name ?? "?"} role={currentUser?.role} size={34} />
        <div style={{ flex: 1, padding: "8px 14px", borderRadius: 24, border: "1px solid var(--border)", background: "var(--bg2)", display: "flex", alignItems: "center", gap: 8, transition: "border-color 0.15s" }}
          onFocusCapture={e => e.currentTarget.style.borderColor = "var(--accent)"}
          onBlurCapture={e => e.currentTarget.style.borderColor = "var(--border)"}>
          <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
            placeholder="Type a message..."
            style={{ flex: 1, border: "none", background: "transparent", color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
          {text.trim() && (
            <button onClick={handleSend} disabled={sendMutation.isPending}
              style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

type Props = { cls: Class; onBack: () => void }

export default function ClassDetail({ cls, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("overview")
  const { isLearner, isTeacher, isAdmin, user } = useAuth()
  const currentUser = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const isOwner = cls.teacher_id === currentUser?.id

  const { data: lessons = [] } = useQuery({
    queryKey: ["class-lessons", cls.id],
    queryFn: async () => {
      const res = await api.get(`/lessons?class_id=${cls.id}`)
      return Array.isArray(res.data) ? res.data as Lesson[] : []
    },
  })

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["class-members", cls.id],
    queryFn: async () => {
      const res = await api.get(endpoints.classes.members(cls.id)).catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data as ClassMember[] : []
    },
  })

  const joinMutation = useMutation({
    mutationFn: async () => api.post(endpoints.classes.join(cls.id), {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      queryClient.invalidateQueries({ queryKey: ["class-members", cls.id] })
      queryClient.invalidateQueries({ queryKey: ["classes-enrolled"] })
    },
  })

  const leaveMutation = useMutation({
    mutationFn: async () => api.post(endpoints.classes.leave(cls.id), {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      queryClient.invalidateQueries({ queryKey: ["class-members", cls.id] })
      queryClient.invalidateQueries({ queryKey: ["classes-enrolled"] })
    },
  })

  const isMember = isOwner || isAdmin || members.some(m => m.learner_id === currentUser?.id)
  const canAccess = isMember || isTeacher || isAdmin

  // Visible lessons: members see all, non-members only public
  const visibleLessons = canAccess
    ? lessons
    : lessons.filter(l => l.visibility === "public")
  const lockedLessons = canAccess ? [] : lessons.filter(l => l.visibility !== "public")

  const TABS = [
    { key: "overview" as Tab,    label: "Overview",    icon: <BookOpen size={14} /> },
    { key: "lessons" as Tab,     label: `Lessons (${lessons.length})`, icon: <FileText size={14} /> },
    { key: "members" as Tab,     label: `Members (${members.length})`, icon: <Users size={14} /> },
    { key: "discussion" as Tab,  label: "Discussion",  icon: <MessageCircle size={14} /> },
  ]

  return (
    <AppShell>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 48px" }}>

        {/* Back */}
        <button className="btn" onClick={onBack} style={{ marginBottom: 20, fontSize: 13 }}>
          <ChevronLeft size={15} /> Back to Classes
        </button>

        {/* Class Header */}
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
              {cls.subject && <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 3 }}>📚 {cls.subject.name}</div>}
              {cls.teacher && <div style={{ color: "var(--muted)", fontSize: 13 }}>👤 {cls.teacher.full_name}</div>}
              {cls.description && <p style={{ color: "var(--muted)", fontSize: 13, margin: "10px 0 0", lineHeight: 1.6 }}>{cls.description}</p>}
            </div>

            {/* Join/Leave */}
            {isLearner && !isOwner && (
              <div>
                {isMember ? (
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
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderTop: "1px solid var(--border)" }}>
            {[
              { label: "Lessons", value: lessons.length, icon: <FileText size={15} />, color: "#cb26e4" },
              { label: "Members", value: members.length, icon: <Users size={15} />, color: "#38bdf8" },
              { label: "Status", value: cls.status ?? "Active", icon: <CheckCircle2 size={15} />, color: "#22c55e" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "14px", textAlign: "center", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
                <div style={{ color: s.color, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-bar" style={{ marginBottom: 20 }}>
          {TABS.map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Non-member banner */}
            {!canAccess && lessons.some(l => l.visibility !== "public") && (
              <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(203,38,228,0.06)", border: "1px solid rgba(203,38,228,0.2)", display: "flex", alignItems: "center", gap: 14 }}>
                <ShieldAlert size={22} style={{ color: "#cb26e4", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3 }}>Some content is members-only</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{lockedLessons.length} lesson{lockedLessons.length !== 1 ? "s" : ""} require class membership. Join to unlock full access.</div>
                </div>
                <button onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}
                  style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                  <UserPlus size={13} style={{ marginRight: 5 }} /> Join
                </button>
              </div>
            )}

            {/* Recent lessons */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">📖 Recent Lessons</span>
                <button className="btn" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setTab("lessons")}>View all</button>
              </div>
              {lessons.length === 0
                ? <p className="card-sub">No lessons yet.</p>
                : lessons.slice(0, 5).map(l => (
                  <div key={l.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {l.visibility !== "public" && !canAccess && <Lock size={13} style={{ color: "var(--muted)" }} />}
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: l.visibility !== "public" && !canAccess ? "var(--muted)" : "var(--text)" }}>{l.title}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.lesson_type}</div>
                      </div>
                    </div>
                    <span className="chip" style={{ fontSize: 10 }}>{l.status}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ── LESSONS ── */}
        {tab === "lessons" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleLessons.map(l => (
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

            {/* Locked lessons for non-members */}
            {lockedLessons.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Lock size={11} /> {lockedLessons.length} lesson{lockedLessons.length !== 1 ? "s" : ""} require membership
                </div>
                {lockedLessons.map(l => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)", marginBottom: 8, opacity: 0.7 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Lock size={16} style={{ color: "var(--muted)" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--muted)" }}>{l.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Join class to access</div>
                    </div>
                  </div>
                ))}
                <JoinWall cls={cls} onJoin={() => joinMutation.mutate()} joining={joinMutation.isPending} />
              </div>
            )}

            {lessons.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: 40 }}>
                <FileText size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p className="card-sub">No lessons in this class yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── MEMBERS ── */}
        {tab === "members" && (
          <div className="card">
            <div className="card-head">
              <span className="card-title">👥 Class Members</span>
              <span className="chip">{members.length}</span>
            </div>

            {/* Teacher */}
            {cls.teacher && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <Avatar name={cls.teacher.full_name} role="teacher" size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cls.teacher.full_name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{cls.teacher.email}</div>
                </div>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "rgba(203,38,228,0.12)", color: "#cb26e4", fontWeight: 700 }}>
                  👩‍🏫 Teacher
                </span>
              </div>
            )}

            {/* Learner members - only shown to members */}
            {canAccess ? (
              members.length === 0
                ? <p className="card-sub" style={{ marginTop: 12 }}>No learners have joined yet.</p>
                : members.map(m => (
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
                <Lock size={24} style={{ opacity: 0.4, marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>Join the class to see the member list.</div>
              </div>
            )}
          </div>
        )}

        {/* ── DISCUSSION ── */}
        {tab === "discussion" && (
          canAccess ? (
            <ClassChat cls={cls} currentUser={currentUser} />
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <MessageCircle size={16} style={{ color: "#cb26e4" }} />
                <span style={{ fontWeight: 800, fontSize: 15 }}>Class Discussion</span>
              </div>
              <JoinWall cls={cls} onJoin={() => joinMutation.mutate()} joining={joinMutation.isPending} />
            </div>
          )
        )}
      </div>
    </AppShell>
  )
}