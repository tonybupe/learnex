import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useState, useRef } from "react"
import LessonDetail from "./LessonDetail"
import {
  BookOpen, Clock, FileText, Video, Eye,
  PlusCircle, ChevronDown, ChevronRight, Search,
  Sparkles, Filter, Edit2, Trash2
} from "lucide-react"

interface LessonResource { id: number; resource_type: string; url: string; title?: string; mime_type?: string }
interface Lesson {
  id: number; title: string; description?: string; content: string
  class_id: number; subject_id: number; teacher_id: number
  lesson_type: string; visibility: string; status: string
  resources: LessonResource[]; created_at: string; updated_at: string
}
interface ClassRoom { id: number; title: string; class_code: string }

const TYPE_ICONS: Record<string, React.ReactNode> = {
  note: <FileText size={15} />, video: <Video size={15} />,
  live: <Eye size={15} />, assignment: <BookOpen size={15} />,
}
const TYPE_COLOR: Record<string, string> = {
  note: "#cb26e4", video: "#38bdf8", live: "#ef4444", assignment: "#22c55e"
}
const STATUS_COLOR: Record<string, string> = {
  published: "var(--success)", draft: "var(--muted)", archived: "var(--danger)"
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ── AI Content Generator ──
function AIGenerator({ topic, onGenerated }: { topic: string; onGenerated: (content: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<{ videos: string[]; links: string[] } | null>(null)

  const generate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await api.post("/lessons/ai/generate", { topic })
      const parsed = res.data
      onGenerated(parsed.content ?? "")
      setSuggestions({
        videos: parsed.youtube_searches ?? [],
        links: parsed.resource_links ?? []
      })
    } catch (e) {
      console.error("AI generation failed:", e)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ borderRadius: 12, border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))", background: "color-mix(in srgb, var(--accent) 5%, var(--card))", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Sparkles size={16} style={{ color: "var(--accent)" }} />
        <span style={{ fontWeight: 800, fontSize: 13, color: "var(--accent)" }}>AI Content Generator</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
        Enter a topic/title above, then click Generate to auto-create lesson content, diagrams and resource suggestions.
      </p>
      <button className="btn btn-primary" style={{ fontSize: 13, alignSelf: "flex-start" }}
        onClick={generate} disabled={loading || !topic.trim()}>
        {loading ? <><span className="spinner-small" /> Generating...</> : <><Sparkles size={14} /> Generate Content</>}
      </button>
      {suggestions && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          {suggestions.videos.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: "var(--text)" }}>🎥 Suggested YouTube Searches</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {suggestions.videos.map((v, i) => (
                  <a key={i} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v)}`}
                    target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    <Video size={11} /> {v}
                  </a>
                ))}
              </div>
            </div>
          )}
          {suggestions.links.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: "var(--text)" }}>🔗 Resource Links</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {suggestions.links.map((l: any, i: number) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: "var(--accent2)", textDecoration: "none" }}>
                    📄 {l.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Lesson Card (collapsible) ──
function LessonCard({ lesson, onOpen, onDelete, canEdit, isTeacher }: {
  lesson: Lesson; onOpen: () => void; onDelete: () => void; canEdit: boolean; isTeacher: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const color = TYPE_COLOR[lesson.lesson_type] ?? "var(--accent)"

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", borderLeft: `4px solid ${color}` }}>
      {/* Header row - always visible */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
          {TYPE_ICONS[lesson.lesson_type]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>{lesson.title}</span>
            <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: lesson.status === "published" ? "rgba(34,197,94,0.12)" : "var(--bg2)", color: STATUS_COLOR[lesson.status] }}>{lesson.status}</span>
            {lesson.visibility === "public" && <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "rgba(56,189,248,0.12)", color: "var(--accent2)" }}>public</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, display: "flex", gap: 10 }}>
            <span>{timeAgo(lesson.created_at)}</span>
            {lesson.resources.length > 0 && <span>· {lesson.resources.length} resources</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {expanded ? <ChevronDown size={16} style={{ color: "var(--muted)" }} /> : <ChevronRight size={16} style={{ color: "var(--muted)" }} />}
        </div>
      </div>

      {/* Expanded preview */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
          {lesson.description && (
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "12px 0 8px", lineHeight: 1.5 }}>{lesson.description}</p>
          )}
          <p style={{ fontSize: 13, color: "var(--text)", margin: "8px 0 14px", lineHeight: 1.6,
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {lesson.content}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 16px" }} onClick={onOpen}>
              Open Lesson →
            </button>
            {canEdit && (
              <>
                <button className="btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={onOpen}>
                  <Edit2 size={13} /> Edit
                </button>
                <button className="btn" style={{ fontSize: 12, padding: "6px 12px", color: "var(--danger)" }} onClick={e => { e.stopPropagation(); onDelete() }}>
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LessonsPage() {
  const { isTeacher, isAdmin, user } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filterClass, setFilterClass] = useState("")
  const [filterType, setFilterType] = useState("")
  const [form, setForm] = useState({
    title: "", description: "", content: "",
    class_id: "", subject_id: "1",
    lesson_type: "note", status: "published", visibility: "class"
  })

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await api.get("/lessons")
      return Array.isArray(res.data) ? res.data as Lesson[] : []
    },
  })

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-mine"],
    queryFn: async () => {
      const res = await api.get("/classes")
      return Array.isArray(res.data) ? res.data as ClassRoom[] : []
    },
    enabled: isTeacher || isAdmin,
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post("/lessons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      setShowForm(false)
      setForm({ title: "", description: "", content: "", class_id: "", subject_id: "1", lesson_type: "note", status: "published", visibility: "class" })
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Failed to create lesson"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/lessons/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessons"] }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    if (!form.content.trim()) { setError("Content is required"); return }
    if (!form.class_id) { setError("Please select a class"); return }
    createMutation.mutate({
      title: form.title, description: form.description || undefined,
      content: form.content, class_id: Number(form.class_id),
      subject_id: Number(form.subject_id), lesson_type: form.lesson_type,
      status: form.status, visibility: form.visibility,
    })
  }

  // Group lessons by class
  const filtered = lessons.filter(l =>
    (search === "" || l.title.toLowerCase().includes(search.toLowerCase()) || l.content.toLowerCase().includes(search.toLowerCase())) &&
    (filterClass === "" || String(l.class_id) === filterClass) &&
    (filterType === "" || l.lesson_type === filterType)
  )

  const byClass = filtered.reduce((acc, l) => {
    const key = String(l.class_id)
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {} as Record<string, Lesson[]>)

  if (activeLesson) return <LessonDetail lesson={activeLesson} onBack={() => setActiveLesson(null)} />

  return (
    <AppShell>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 40px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
              <BookOpen size={24} style={{ color: "var(--accent)" }} /> Lessons
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
              {isTeacher || isAdmin ? "Create and manage your class lessons" : "Browse your class lessons"}
            </p>
          </div>
          {(isTeacher || isAdmin) && (
            <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
              <PlusCircle size={15} /> {showForm ? "Cancel" : "New Lesson"}
            </button>
          )}
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <PlusCircle size={18} style={{ color: "var(--accent)" }} /> Create New Lesson
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Title + AI */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
                <div className="form-field">
                  <label className="form-label">Topic / Title *</label>
                  <input className="audit-control" required value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Introduction to Algebra, Photosynthesis..." />
                </div>
              </div>

              {/* AI Generator */}
              <AIGenerator
                topic={form.title}
                onGenerated={content => setForm(p => ({ ...p, content }))}
              />

              {/* Description */}
              <div className="form-field">
                <label className="form-label">Description</label>
                <input className="audit-control" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief overview..." />
              </div>

              {/* Content */}
              <div className="form-field">
                <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Content *</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>Supports markdown formatting</span>
                </label>
                <textarea required value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Write your lesson content here... Use ## for headings, - for bullet points"
                  style={{ width: "100%", minHeight: 200, padding: "12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.6 }} />
              </div>

              {/* Class + Subject + Type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Class *</label>
                  {classes.length > 0 ? (
                    <select className="audit-control select" required value={form.class_id}
                      onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}>
                      <option value="">Select class...</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  ) : (
                    <input className="audit-control" required type="number" value={form.class_id}
                      onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))} placeholder="Class ID" />
                  )}
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
                <div className="form-field">
                  <label className="form-label">Visibility</label>
                  <select className="audit-control select" value={form.visibility}
                    onChange={e => setForm(p => ({ ...p, visibility: e.target.value }))}>
                    <option value="class">🔒 Class only</option>
                    <option value="public">🌐 Public</option>
                  </select>
                </div>
              </div>

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
                  <label className="form-label">Subject ID</label>
                  <input className="audit-control" type="number" value={form.subject_id}
                    onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))} />
                </div>
              </div>

              {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600, padding: "8px 12px", borderRadius: 8, background: "color-mix(in srgb, var(--danger) 10%, transparent)" }}>{error}</div>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Lesson"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search + Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input className="audit-control" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search lessons..." style={{ paddingLeft: 36 }} />
          </div>
          <select className="audit-control select" style={{ width: 160 }} value={filterType}
            onChange={e => setFilterType(e.target.value)}>
            <option value="">All types</option>
            <option value="note">📝 Note</option>
            <option value="video">🎥 Video</option>
            <option value="live">🔴 Live</option>
            <option value="assignment">📋 Assignment</option>
          </select>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="card" style={{ height: 80, opacity: 0.4 }} />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
            <h3 style={{ margin: "0 0 8px" }}>No lessons found</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
              {(isTeacher || isAdmin) ? "Create your first lesson above." : "No lessons available yet."}
            </p>
          </div>
        )}

        {/* Lessons grouped by class */}
        {!isLoading && Object.keys(byClass).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {Object.entries(byClass).map(([classId, classLessons]) => {
              const cls = classes.find(c => c.id === Number(classId))
              return (
                <div key={classId}>
                  {/* Class header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 14px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--card)", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>
                      🎓 {cls?.title ?? `Class ${classId}`}
                      <span className="chip" style={{ fontSize: 10 }}>{classLessons.length} lessons</span>
                    </div>
                    <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
                  </div>

                  {/* Lesson cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {classLessons.map(lesson => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        onOpen={() => setActiveLesson(lesson)}
                        onDelete={() => { if (window.confirm("Delete this lesson?")) deleteMutation.mutate(lesson.id) }}
                        canEdit={(isTeacher && lesson.teacher_id === user?.id) || !!isAdmin}
                        isTeacher={!!isTeacher}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}