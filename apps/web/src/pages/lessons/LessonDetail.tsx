import { useState, useRef, useEffect } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft, FileText, Video, Link2, Download, BookOpen,
  Eye, Clock, Edit2, Save, X, Share2, MessageCircle,
  Send, Trash2, Sparkles, ExternalLink
} from "lucide-react"

interface LessonResource { id: number; resource_type: string; url: string; title?: string; mime_type?: string }
interface Lesson {
  id: number; title: string; description?: string; content: string
  class_id: number; subject_id: number; teacher_id: number
  lesson_type: string; visibility: string; status: string
  resources: LessonResource[]; created_at: string; updated_at: string
}
interface Comment {
  id: number; content: string; user_id: number; lesson_id: number
  created_at: string; author: { id: number; full_name: string; role: string } | null
}

type Props = { lesson: Lesson; onBack: () => void }

const TYPE_LABEL: Record<string, string> = {
  note: "📝 Note", video: "🎥 Video", live: "🔴 Live", assignment: "📋 Assignment"
}
const RESOURCE_ICON: Record<string, React.ReactNode> = {
  file: <FileText size={15} />, image: <Eye size={15} />,
  video: <Video size={15} />, link: <Link2 size={15} />,
}

function getBaseUrl() { return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1","") || "http://localhost:8000" }
function resolveAvatar(url?: string | null) {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `${getBaseUrl()}${url}`
}

function Avatar({ user, size = 32 }: { user: any; size?: number }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[(user?.full_name?.charCodeAt(0) ?? 0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38, flexShrink: 0 }}>
      {user?.full_name?.[0]?.toUpperCase() ?? "?"}
    </div>
  )
}

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("# ")) return <h1 key={i} style={{ fontSize: 26, fontWeight: 900, margin: "20px 0 10px", color: "var(--text)" }}>{line.slice(2)}</h1>
    if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: 20, fontWeight: 800, margin: "18px 0 8px", color: "var(--text)" }}>{line.slice(3)}</h2>
    if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 16, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>{line.slice(4)}</h3>
    if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} style={{ marginLeft: 24, lineHeight: 1.8, color: "var(--text)" }}>{line.slice(2)}</li>
    if (line.startsWith("**") && line.endsWith("**")) return <strong key={i} style={{ display: "block", margin: "6px 0" }}>{line.slice(2, -2)}</strong>
    if (line === "") return <div key={i} style={{ height: 8 }} />
    return <p key={i} style={{ margin: "6px 0", lineHeight: 1.8, color: "var(--text)" }}>{line}</p>
  })
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(d).toLocaleDateString()
}

export default function LessonDetail({ lesson, onBack }: Props) {
  const { isTeacher, isAdmin, user } = useAuth()
  const currentUser = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: lesson.title, description: lesson.description ?? "", content: lesson.content, status: lesson.status, visibility: lesson.visibility })
  const [commentText, setCommentText] = useState("")
  const [tab, setTab] = useState<"content"|"discussion"|"resources">("content")
  const [shareLoading, setShareLoading] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const { data: fresh, refetch } = useQuery({
    queryKey: ["lesson", lesson.id],
    queryFn: async () => (await api.get(`/lessons/${lesson.id}`)).data as Lesson,
    initialData: lesson, staleTime: 30000,
  })

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["lesson-discussion", lesson.id],
    queryFn: async () => {
      const res = await api.get(`/lessons/${lesson.id}/discussion`).catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data as Comment[] : []
    },
    enabled: tab === "discussion",
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => api.patch(`/lessons/${lesson.id}`, data),
    onSuccess: () => { refetch(); setEditing(false); queryClient.invalidateQueries({ queryKey: ["lessons"] }) },
  })

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => api.post(`/lessons/${lesson.id}/discussion`, { content }),
    onSuccess: () => { setCommentText(""); refetchComments() },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async (cid: number) => api.delete(`/lessons/${lesson.id}/discussion/${cid}`),
    onSuccess: () => refetchComments(),
  })

  const shareToFeed = async () => {
    setShareLoading(true)
    try {
      const shareContent = `📚 **${fresh.title}**\n\n${fresh.description || fresh.content.slice(0, 200)}...\n\n🔗 Join the class to access the full lesson!`
      await api.post("/posts", {
        content: shareContent, post_type: "note", visibility: "public",
        title: fresh.title,
      })
      setShareSuccess(true)
      setTimeout(() => setShareSuccess(false), 3000)
    } catch (e) { console.error("Share failed", e) }
    finally { setShareLoading(false) }
  }

  const l = fresh ?? lesson
  const wordCount = l.content.split(/\s+/).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))
  const canEdit = (isTeacher && l.teacher_id === currentUser?.id) || !!isAdmin

  return (
    <AppShell>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 16px 40px" }}>

        {/* Back */}
        <button className="btn" onClick={onBack} style={{ marginBottom: 16 }}>
          <ChevronLeft size={16} /> Back to Lessons
        </button>

        {/* Header */}
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>✏️ Edit Lesson</div>
              <div className="form-field">
                <label className="form-label">Title</label>
                <input className="audit-control" value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Description</label>
                <input className="audit-control" value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Content</label>
                <textarea value={editForm.content}
                  onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))}
                  style={{ width: "100%", minHeight: 240, padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.6 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Status</label>
                  <select className="audit-control select" value={editForm.status}
                    onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Visibility</label>
                  <select className="audit-control select" value={editForm.visibility}
                    onChange={e => setEditForm(p => ({ ...p, visibility: e.target.value }))}>
                    <option value="class">Class only</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => setEditing(false)}><X size={14} /> Cancel</button>
                <button className="btn btn-primary" onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending}>
                  <Save size={14} /> {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span className="chip">{TYPE_LABEL[l.lesson_type] ?? l.lesson_type}</span>
                  <span className="chip" style={{ color: l.status === "published" ? "var(--success)" : "var(--muted)" }}>{l.status}</span>
                  {l.visibility === "public" && <span className="chip" style={{ color: "var(--accent2)" }}>🌐 Public</span>}
                  <span className="chip">Class #{l.class_id}</span>
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 8px", lineHeight: 1.3 }}>{l.title}</h1>
                {l.description && <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 12px", lineHeight: 1.5 }}>{l.description}</p>}
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> ~{readTime} min read</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><BookOpen size={12} /> {wordCount} words</span>
                  <span>Updated {new Date(l.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {/* Share to feed */}
                <button className="btn" style={{ fontSize: 12 }} onClick={shareToFeed} disabled={shareLoading}>
                  {shareSuccess ? "✅ Shared!" : shareLoading ? "Sharing..." : <><Share2 size={13} /> Share to Feed</>}
                </button>
                {canEdit && (
                  <button className="btn" style={{ fontSize: 12 }} onClick={() => setEditing(true)}>
                    <Edit2 size={13} /> Edit
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs-bar" style={{ marginBottom: 16 }}>
          {[
            { key: "content", label: "📖 Content" },
            { key: "discussion", label: `💬 Discussion ${comments.length > 0 ? `(${comments.length})` : ""}` },
            { key: "resources", label: `🔗 Resources ${l.resources.length > 0 ? `(${l.resources.length})` : ""}` },
          ].map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key as any)}>{t.label}</button>
          ))}
        </div>

        {/* CONTENT TAB */}
        {tab === "content" && (
          <div className="card" style={{ padding: 28 }}>
            <div style={{ fontSize: 15, lineHeight: 1.8 }}>
              {renderContent(l.content)}
            </div>

            {/* Share prompt at bottom */}
            <div style={{ marginTop: 32, padding: 16, borderRadius: 12, background: "color-mix(in srgb, var(--accent) 6%, var(--bg2))", border: "1px solid color-mix(in srgb, var(--accent) 20%, var(--border))" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>📢 Share this lesson</div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>Share a preview to the feed so others can discover and join the class.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={shareToFeed} disabled={shareLoading}>
                  <Share2 size={13} /> {shareLoading ? "Sharing..." : "Share to Feed"}
                </button>
                <button className="btn" style={{ fontSize: 12 }}
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/lessons/${l.id}`).then(() => alert("Link copied!"))}>
                  <Link2 size={13} /> Copy Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DISCUSSION TAB */}
        {tab === "discussion" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>💬 Class Discussion</div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
                Ask questions, share insights, and discuss this lesson with your classmates.
              </p>

              {/* Comment Input */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20 }}>
                <Avatar user={currentUser} size={36} />
                <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)" }}>
                  <input ref={commentInputRef} value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && commentText.trim()) { e.preventDefault(); addCommentMutation.mutate(commentText) } }}
                    placeholder="Add a comment or question..."
                    style={{ flex: 1, border: "none", background: "transparent", color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px" }}
                    onClick={() => commentText.trim() && addCommentMutation.mutate(commentText)}
                    disabled={!commentText.trim() || addCommentMutation.isPending}>
                    {addCommentMutation.isPending ? "..." : <Send size={14} />}
                  </button>
                </div>
              </div>

              {/* Comments List */}
              {comments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)" }}>
                  <MessageCircle size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div style={{ fontSize: 14 }}>No comments yet — be the first!</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {comments.map((c, i) => (
                    <div key={c.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < comments.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <Avatar user={c.author} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 800, fontSize: 14 }}>{c.author?.full_name ?? "Unknown"}</span>
                          {c.author?.role !== "learner" && (
                            <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
                              {c.author?.role}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>{timeAgo(c.created_at)}</span>
                          {(c.user_id === currentUser?.id || isAdmin || isTeacher) && (
                            <button onClick={() => deleteCommentMutation.mutate(c.id)}
                              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", padding: 2, borderRadius: 4, opacity: 0, transition: "opacity 0.15s" }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                              onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>{c.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESOURCES TAB */}
        {tab === "resources" && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>🔗 Lesson Resources</div>
            {l.resources.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)" }}>
                <Link2 size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: 14 }}>No resources attached to this lesson</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {l.resources.map(res => (
                  <a key={res.id} href={res.url} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)", textDecoration: "none", color: "var(--text)", transition: "all 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                    <span style={{ color: "var(--accent)", flexShrink: 0 }}>{RESOURCE_ICON[res.resource_type] ?? <Link2 size={15} />}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, fontWeight: 600 }}>{res.title ?? res.url}</span>
                    <ExternalLink size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}