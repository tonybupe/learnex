import AppShell from "@/components/layout/AppShell"
import RichEditor from "@/components/editor/RichEditor"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useAuthStore } from "@/features/auth/auth.store"
import { useState, useMemo } from "react"
import LessonDetail from "./LessonDetail"
import { useNavigate } from "react-router-dom"
import {
  BookOpen, FileText, Video, Eye, PlusCircle,
  ChevronDown, ChevronRight, Search, Sparkles,
  Trash2, Image, Link2, Crown, Globe, Lock,
  ChevronLeft, X, AlertCircle, Filter
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────
interface LessonResource { id: number; resource_type: string; url: string; title?: string }
interface Lesson {
  id: number; title: string; description?: string; content: string
  class_id: number; subject_id: number; teacher_id: number
  lesson_type: string; visibility: string; status: string
  resources: LessonResource[]; created_at: string; updated_at: string
}
interface ClassRoom { id: number; title: string; class_code: string; teacher_id?: number }

// ── Constants ──────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, React.ReactNode> = {
  note: <FileText size={14} />, video: <Video size={14} />,
  live: <Eye size={14} />, assignment: <BookOpen size={14} />,
}
const TYPE_COLOR: Record<string, string> = {
  note: "#cb26e4", video: "#38bdf8", live: "#ef4444", assignment: "#22c55e"
}

const PAGE_SIZE = 12

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ── AI Result types ────────────────────────────────────────────────
interface AIResult {
  content: string; summary: string
  key_terms?: { term: string; definition: string }[]
  youtube_searches?: string[]
  image_searches?: string[]
  resource_links?: { title: string; url: string; type: string }[]
  diagram_suggestions?: string[]
  presentation_slides?: { slide: number; title: string; points: string[] }[]
}

// ── AI Generator ───────────────────────────────────────────────────
function AIGenerator({ topic, subtopic, onGenerated }: {
  topic: string; subtopic: string
  onGenerated: (content: string, result: AIResult) => void
}) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIResult | null>(null)
  const [error, setError] = useState("")
  const [level, setLevel] = useState("secondary")

  const generate = async () => {
    if (!topic.trim()) { setError("Enter a topic first"); return }
    setLoading(true); setError("")
    try {
      const res = await api.post("/lessons/ai/generate", { topic, subtopic, level })
      const data: AIResult = res.data
      setResult(data)
      onGenerated(data.content, data)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Generation failed"
      setError(msg.includes("credit") || msg.includes("billing") ? "AI credits needed." : msg)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ borderRadius: 14, border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))", background: "color-mix(in srgb, var(--accent) 4%, var(--card))", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} style={{ color: "var(--accent)" }} />
          <span style={{ fontWeight: 800, fontSize: 14, color: "var(--accent)" }}>AI Content Generator</span>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--accent2)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}
          onClick={() => navigate("/subscription")}>
          <Crown size={12} /> Upgrade for more AI
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 10 }}>
        <div className="form-field">
          <label className="form-label" style={{ fontSize: 11 }}>Topic *</label>
          <input className="audit-control" value={topic} readOnly placeholder="Enter topic above..." style={{ fontSize: 13, opacity: topic ? 1 : 0.6 }} />
        </div>
        <div className="form-field">
          <label className="form-label" style={{ fontSize: 11 }}>Subtopic (optional)</label>
          <input className="audit-control" value={subtopic} readOnly placeholder="e.g. Light reactions" style={{ fontSize: 13, opacity: subtopic ? 1 : 0.6 }} />
        </div>
        <div className="form-field">
          <label className="form-label" style={{ fontSize: 11 }}>Level</label>
          <select className="audit-control select" value={level} onChange={e => setLevel(e.target.value)} style={{ fontSize: 13 }}>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="college">College</option>
            <option value="university">University</option>
          </select>
        </div>
      </div>
      {error && (
        <div style={{ fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertCircle size={13} /> {error}
          {error.includes("credits") && (
            <button className="btn btn-primary" style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => navigate("/subscription")}>Get Credits</button>
          )}
        </div>
      )}
      <button className="btn btn-primary" style={{ alignSelf: "flex-start", fontSize: 13 }}
        onClick={generate} disabled={loading || !topic.trim()}>
        {loading ? <><span className="spinner-small" /> Generating...</> : <><Sparkles size={14} /> Generate with AI</>}
      </button>
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, color: "var(--success)", fontWeight: 700 }}>✅ Content generated! Scroll down to edit.</div>
          {result.key_terms && result.key_terms.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>📖 Key Terms</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {result.key_terms.map((t, i) => <span key={i} className="chip" title={t.definition} style={{ fontSize: 11, cursor: "help" }}>{t.term}</span>)}
              </div>
            </div>
          )}
          {result.youtube_searches && result.youtube_searches.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>🎥 Video Suggestions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {result.youtube_searches.map((q, i) => (
                  <a key={i} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#ef4444", textDecoration: "none", padding: "4px 8px", borderRadius: 6, background: "rgba(239,68,68,0.06)" }}>
                    <Video size={11} /> {q}
                  </a>
                ))}
              </div>
            </div>
          )}
          {result.presentation_slides && result.presentation_slides.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>📊 Slide Outline</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                {result.presentation_slides.map((s, i) => (
                  <div key={i} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", fontSize: 12 }}>
                    <div style={{ fontWeight: 800, color: "var(--accent)", marginBottom: 3 }}>Slide {s.slide}: {s.title}</div>
                    {s.points.map((p, j) => <div key={j} style={{ color: "var(--muted)", paddingLeft: 8 }}>• {p}</div>)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Lesson Card ────────────────────────────────────────────────────
function LessonCard({ lesson, onOpen, onDelete, canEdit, className }: {
  lesson: Lesson; onOpen: () => void; onDelete: () => void; canEdit: boolean; className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const color = TYPE_COLOR[lesson.lesson_type] ?? "var(--accent)"
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", borderLeft: `4px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
          {TYPE_ICONS[lesson.lesson_type]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
            <span style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{lesson.title}</span>
            <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700,
              background: lesson.status === "published" ? "rgba(34,197,94,0.12)" : "var(--bg2)",
              color: lesson.status === "published" ? "var(--success)" : "var(--muted)" }}>
              {lesson.status}
            </span>
            {lesson.visibility === "public" && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "rgba(56,189,248,0.1)", color: "#38bdf8" }}>
                <Globe size={9} /> public
              </span>
            )}
            {lesson.visibility === "class" && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "var(--bg2)", color: "var(--muted)" }}>
                <Lock size={9} /> class
              </span>
            )}
            {className && <span style={{ fontSize: 10, color: "var(--muted)" }}>· {className}</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{timeAgo(lesson.created_at)}</div>
        </div>
        {expanded ? <ChevronDown size={15} style={{ color: "var(--muted)" }} /> : <ChevronRight size={15} style={{ color: "var(--muted)" }} />}
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)" }}>
          {lesson.description && <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 6px" }}>{lesson.description}</p>}
          <p style={{ fontSize: 13, color: "var(--text)", margin: "6px 0 12px", lineHeight: 1.6,
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {lesson.content?.replace(/<[^>]+>/g, "").slice(0, 200)}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 16px" }} onClick={e => { e.stopPropagation(); onOpen() }}>Open →</button>
            {canEdit && (
              <button className="btn" style={{ fontSize: 12, padding: "6px 10px", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)" }}
                onClick={e => { e.stopPropagation(); onDelete() }}>
                <Trash2 size={13} />
              </button>
            )}
            {!canEdit && lesson.visibility === "public" && (
              <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <Globe size={11} /> Shared publicly — view only
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────
export default function LessonsPage() {
  const { isTeacher, isAdmin, isLearner, user } = useAuth()
  const currentUser = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [tab, setTab] = useState<"mine"|"class"|"public">("mine")
  const [page, setPage] = useState(1)
  const [form, setForm] = useState({
    title: "", subtopic: "", description: "", content: "",
    class_id: "", subject_id: "",
    lesson_type: "note", status: "published", visibility: "class"
  })

  // Data queries
  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await api.get("/lessons")
      return Array.isArray(res.data) ? res.data as Lesson[] : []
    },
  })

  const { data: myClasses = [] } = useQuery({
    queryKey: ["classes-mine"],
    queryFn: async () => {
      const res = await api.get("/classes?mine=true")
      return Array.isArray(res.data) ? res.data as ClassRoom[] : []
    },
    enabled: isTeacher || isAdmin,
  })

  const { data: allClasses = [] } = useQuery({
    queryKey: ["classes-all"],
    queryFn: async () => {
      const res = await api.get("/classes")
      return Array.isArray(res.data) ? res.data as ClassRoom[] : []
    },
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await api.get("/subjects")).data,
    staleTime: 60000,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post("/lessons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      setShowForm(false)
      setForm({ title: "", subtopic: "", description: "", content: "", class_id: "", subject_id: "", lesson_type: "note", status: "published", visibility: "class" })
      setError("")
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Failed to create lesson"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/lessons/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessons"] }),
    onError: (err: any) => alert(err?.response?.data?.detail || "Failed to delete"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    if (!form.content.trim()) { setError("Content is required"); return }
    if (!form.class_id) { setError("Please select a class"); return }
    if (!form.subject_id) { setError("Please select a subject"); return }
    createMutation.mutate({
      title: form.title, description: form.description || undefined,
      content: form.content, class_id: Number(form.class_id),
      subject_id: Number(form.subject_id), lesson_type: form.lesson_type,
      status: form.status, visibility: form.visibility,
    })
  }

  // Classify lessons
  const myLessons = lessons.filter(l => l.teacher_id === currentUser?.id)
  const classLessons = lessons.filter(l => l.teacher_id !== currentUser?.id)
  const publicLessons = lessons.filter(l => l.visibility === "public" && l.teacher_id !== currentUser?.id)

  const activeSet = isLearner && tab === "mine"
    ? lessons  // backend already returns only accessible lessons for learners
    : tab === "mine" ? myLessons
    : tab === "public" ? publicLessons
    : classLessons

  // Filter + search
  const filtered = useMemo(() => {
    return activeSet.filter(l => {
      const matchSearch = !search.trim() || l.title.toLowerCase().includes(search.toLowerCase())
      const matchType = !filterType || l.lesson_type === filterType
      const matchStatus = !filterStatus || l.status === filterStatus
      return matchSearch && matchType && matchStatus
    })
  }, [activeSet, search, filterType, filterStatus])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Group by class
  const byClass = useMemo(() => {
    return paginated.reduce((acc, l) => {
      const key = String(l.class_id)
      if (!acc[key]) acc[key] = []
      acc[key].push(l)
      return acc
    }, {} as Record<string, Lesson[]>)
  }, [paginated])

  const getClassName = (classId: number) => {
    const cls = allClasses.find((c: ClassRoom) => c.id === classId)
    return cls?.title ?? `Class ${classId}`
  }

  const TABS = [
    { key: "mine",   label: isTeacher || isAdmin ? "My Lessons" : "My Classes", count: myLessons.length },
    { key: "class",  label: "Other Classes",  count: classLessons.length },
    { key: "public", label: "🌐 Public",       count: publicLessons.length },
  ]

  if (activeLesson) return <LessonDetail lesson={activeLesson} onBack={() => setActiveLesson(null)} />

  return (
    <AppShell>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 48px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
              <BookOpen size={22} style={{ color: "var(--accent)" }} /> Lessons
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
              {isTeacher || isAdmin ? "Create and manage your class lessons." : "Browse lessons from your enrolled classes."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(isTeacher || isAdmin) && (
              <>
                <button className="btn" style={{ fontSize: 12, color: "var(--accent)" }} onClick={() => navigate("/subscription")}>
                  <Sparkles size={13} /> AI Plans
                </button>
                <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => { setShowForm(s => !s) }}>
                  <PlusCircle size={15} /> {showForm ? "Cancel" : "New Lesson"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── RBAC notice ── */}
        {isTeacher && (
          <div style={{ padding: "10px 16px", borderRadius: 10, marginBottom: 16, background: "rgba(203,38,228,0.06)", border: "1px solid rgba(203,38,228,0.2)", fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
            🔒 <span>You can only <strong style={{ color: "var(--text)" }}>create, edit or delete lessons in your own classes</strong>. Other lessons are view-only.</span>
          </div>
        )}

        {/* ── Create Form ── */}
        {showForm && (isTeacher || isAdmin) && (
          <div className="card" style={{ padding: 22, marginBottom: 22 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <PlusCircle size={17} style={{ color: "var(--accent)" }} /> Create New Lesson
            </div>

            {/* No classes warning */}
            {myClasses.length === 0 && (
              <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 13, color: "#f59e0b", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={15} />
                You don't have any classes yet.{" "}
                <button className="btn" style={{ fontSize: 12, padding: "3px 10px", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }} onClick={() => navigate("/classes")}>
                  Create a Class First
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Title + Subtopic */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Topic / Title *</label>
                  <input className="audit-control" required value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Photosynthesis, World War II..." />
                </div>
                <div className="form-field">
                  <label className="form-label">Subtopic (optional)</label>
                  <input className="audit-control" value={form.subtopic}
                    onChange={e => setForm(p => ({ ...p, subtopic: e.target.value }))}
                    placeholder="e.g. Light reactions..." />
                </div>
              </div>

              {/* AI Generator */}
              <AIGenerator topic={form.title} subtopic={form.subtopic}
                onGenerated={(content) => setForm(p => ({ ...p, content }))} />

              {/* Description */}
              <div className="form-field">
                <label className="form-label">Description</label>
                <input className="audit-control" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief overview of this lesson..." />
              </div>

              {/* Rich Editor */}
              <div className="form-field">
                <label className="form-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Content *</span>
                  {form.content && <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>✓ Content loaded — edit below</span>}
                </label>
                <RichEditor value={form.content}
                  onChange={(md) => setForm(p => ({ ...p, content: md }))}
                  placeholder="Write your lesson content here, or use AI Generate above..."
                  minHeight={280} />
              </div>

              {/* Class + Subject + Type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Class * <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 400 }}>(your classes only)</span></label>
                  {myClasses.length > 0 ? (
                    <select className="audit-control select" required value={form.class_id}
                      onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}>
                      <option value="">Select your class...</option>
                      {myClasses.map((c: ClassRoom) => (
                        <option key={c.id} value={c.id}>{c.title} ({c.class_code})</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", fontSize: 13, color: "var(--muted)" }}>
                      No classes — create one first
                    </div>
                  )}
                </div>
                <div className="form-field">
                  <label className="form-label">Subject *</label>
                  <select className="audit-control select" required value={form.subject_id}
                    onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}>
                    <option value="">Select subject...</option>
                    {(Array.isArray(subjects) ? subjects : []).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Lesson Type</label>
                  <select className="audit-control select" value={form.lesson_type}
                    onChange={e => setForm(p => ({ ...p, lesson_type: e.target.value }))}>
                    <option value="note">📝 Note</option>
                    <option value="video">🎥 Video</option>
                    <option value="live">🔴 Live</option>
                    <option value="assignment">📋 Assignment</option>
                  </select>
                </div>
              </div>

              {/* Status + Visibility */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Status</label>
                  <select className="audit-control select" value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Visibility</label>
                  <select className="audit-control select" value={form.visibility}
                    onChange={e => setForm(p => ({ ...p, visibility: e.target.value }))}>
                    <option value="class">🔒 Class only</option>
                    <option value="public">🌐 Public (anyone can view)</option>
                  </select>
                </div>
              </div>

              {error && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>
                  {error}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || myClasses.length === 0}>
                  {createMutation.isPending ? "Creating..." : "Create Lesson"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Tabs + Filters ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div className="tabs-bar" style={{ flex: 1, margin: 0 }}>
            {TABS.map(t => (
              <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`}
                onClick={() => { setTab(t.key as any); setPage(1) }}>
                {t.label}
                <span style={{ marginLeft: 5, padding: "1px 7px", borderRadius: 999, fontSize: 10,
                  background: tab === t.key ? "var(--accent)" : "var(--bg2)",
                  color: tab === t.key ? "white" : "var(--muted)" }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search + type + status filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg2)" }}>
            <Search size={14} style={{ color: "var(--muted)" }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              id="search" name="search" placeholder="Search lessons..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--text)", width: "100%", fontFamily: "inherit" }} />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><X size={13} /></button>}
          </div>
          <select className="audit-control select" style={{ width: 140, fontSize: 13 }} value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1) }}>
            <option value="">All types</option>
            <option value="note">📝 Note</option>
            <option value="video">🎥 Video</option>
            <option value="live">🔴 Live</option>
            <option value="assignment">📋 Assignment</option>
          </select>
          {(isTeacher || isAdmin) && (
            <select className="audit-control select" style={{ width: 130, fontSize: 13 }} value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
              <option value="">All status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          )}
        </div>

        {/* ── Loading ── */}
        {isLoading && [1,2,3].map(i => <div key={i} className="card" style={{ height: 72, opacity: 0.3, marginBottom: 8 }} />)}

        {/* ── Empty ── */}
        {!isLoading && filtered.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>📚</div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
              {search ? `No lessons match "${search}"` : isLearner && tab === "mine" ? "No lessons in your enrolled classes yet" : tab === "mine" ? "No lessons yet" : "No lessons here"}
            </div>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 16px" }}>
              {isLearner && tab === "mine" ? "Join a class to see its lessons here." : isTeacher && tab === "mine" ? "Create your first lesson with AI." : "Try a different filter or tab."}
            </p>
            {(isTeacher || isAdmin) && tab === "mine" && (
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <PlusCircle size={14} /> Create Lesson
              </button>
            )}
            {isLearner && tab === "mine" && (
              <button className="btn" onClick={() => window.location.href = "/classes"}>
                Browse Classes →
              </button>
            )}
          </div>
        )}

        {/* ── Lessons grouped by class ── */}
        {!isLoading && Object.keys(byClass).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {Object.entries(byClass).map(([classId, classLessons]) => {
              const clsName = getClassName(Number(classId))
              return (
                <div key={classId}>
                  {/* Class divider */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 14px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--card)", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>
                      🎓 {clsName}
                      <span className="chip" style={{ fontSize: 10 }}>{classLessons.length}</span>
                    </div>
                    <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {classLessons.map(lesson => (
                      <LessonCard key={lesson.id} lesson={lesson}
                        className={clsName}
                        onOpen={() => setActiveLesson(lesson)}
                        onDelete={() => {
                          if (window.confirm(`Delete "${lesson.title}"? This cannot be undone.`))
                            deleteMutation.mutate(lesson.id)
                        }}
                        canEdit={(isTeacher && lesson.teacher_id === currentUser?.id) || !!isAdmin}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {!isLoading && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 28 }}>
            <button className="btn" style={{ fontSize: 12, padding: "7px 14px" }}
              disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} /> Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p}
                style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${p === page ? "var(--accent)" : "var(--border)"}`, background: p === page ? "var(--accent)" : "var(--card)", color: p === page ? "white" : "var(--text)", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}
                onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="btn" style={{ fontSize: 12, padding: "7px 14px" }}
              disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Pagination info */}
        {!isLoading && filtered.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
            Showing {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length} lessons
          </div>
        )}
      </div>
    </AppShell>
  )
}