import AppShell from "@/components/layout/AppShell"
import RichEditor from "@/components/editor/RichEditor"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useState } from "react"
import LessonDetail from "./LessonDetail"
import { useNavigate } from "react-router-dom"
import {
  BookOpen, FileText, Video, Eye, PlusCircle,
  ChevronDown, ChevronRight, Search, Sparkles,
  Edit2, Trash2, Image, Link2, Crown
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

interface AIResult {
  content: string; summary: string
  key_terms?: { term: string; definition: string }[]
  youtube_searches?: string[]
  image_searches?: string[]
  resource_links?: { title: string; url: string; type: string }[]
  diagram_suggestions?: string[]
  presentation_slides?: { slide: number; title: string; points: string[] }[]
}

function AIGenerator({ topic, subtopic, onGenerated }: {
  topic: string; subtopic: string; onGenerated: (content: string, result: AIResult) => void
}) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIResult | null>(null)
  const [level, setLevel] = useState("secondary")
  const [error, setError] = useState("")

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
      if (msg.includes("credit") || msg.includes("billing")) {
        setError("AI credits needed. ")
      } else {
        setError(msg)
      }
    } finally { setLoading(false) }
  }

  return (
    <div style={{ borderRadius: 14, border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))", background: "color-mix(in srgb, var(--accent) 4%, var(--card))", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} style={{ color: "var(--accent)" }} />
          <span style={{ fontWeight: 800, fontSize: 14, color: "var(--accent)" }}>AI Content Generator</span>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--accent2)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}
          onClick={() => navigate("/subscription")}>
          <Crown size={12} /> Upgrade for more AI power
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
          {error}
          {error.includes("credits") && (
            <button className="btn btn-primary" style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => navigate("/subscription")}>
              Get Credits
            </button>
          )}
        </div>
      )}

      <button className="btn btn-primary" style={{ alignSelf: "flex-start", fontSize: 13, gap: 8 }}
        onClick={generate} disabled={loading || !topic.trim()}>
        {loading ? <><span className="spinner-small" /> Generating lesson...</> : <><Sparkles size={14} /> Generate with AI</>}
      </button>

      {/* AI Results */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, color: "var(--success)", fontWeight: 700 }}>✅ Content generated! Scroll down to edit.</div>

          {/* Key Terms */}
          {result.key_terms && result.key_terms.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: "var(--text)" }}>📖 Key Terms</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.key_terms.map((t, i) => (
                  <span key={i} className="chip" title={t.definition} style={{ fontSize: 11, cursor: "help" }}>{t.term}</span>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {result.youtube_searches && result.youtube_searches.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: "var(--text)" }}>🎥 Video Suggestions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {result.youtube_searches.map((q, i) => (
                  <a key={i} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#ef4444", textDecoration: "none", padding: "4px 8px", borderRadius: 6, background: "rgba(239,68,68,0.06)" }}>
                    <Video size={12} /> {q}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Images */}
          {result.image_searches && result.image_searches.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: "var(--text)" }}>🖼️ Image & Diagram Searches</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.image_searches.map((q, i) => (
                  <a key={i} href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--accent2)", textDecoration: "none", padding: "4px 10px", borderRadius: 999, border: "1px solid color-mix(in srgb, var(--accent2) 30%, var(--border))", background: "color-mix(in srgb, var(--accent2) 6%, transparent)" }}>
                    <Image size={10} /> {q}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Diagrams */}
          {result.diagram_suggestions && result.diagram_suggestions.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: "var(--text)" }}>📊 Diagram Ideas</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {result.diagram_suggestions.map((d, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--accent)", fontSize: 14 }}>◆</span> {d}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slide Outline */}
          {result.presentation_slides && result.presentation_slides.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: "var(--text)" }}>📊 Presentation Outline</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {result.presentation_slides.map((s, i) => (
                  <div key={i} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", fontSize: 12 }}>
                    <div style={{ fontWeight: 800, color: "var(--accent)", marginBottom: 4 }}>Slide {s.slide}: {s.title}</div>
                    {s.points.map((p, j) => <div key={j} style={{ color: "var(--muted)", paddingLeft: 8 }}>• {p}</div>)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          {result.resource_links && result.resource_links.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: "var(--text)" }}>🔗 Resources</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {result.resource_links.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                    <Link2 size={10} /> {r.title}
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

function LessonCard({ lesson, onOpen, onDelete, canEdit }: {
  lesson: Lesson; onOpen: () => void; onDelete: () => void; canEdit: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const color = TYPE_COLOR[lesson.lesson_type] ?? "var(--accent)"
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", borderLeft: `4px solid ${color}` }}>
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
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{timeAgo(lesson.created_at)}</div>
        </div>
        {expanded ? <ChevronDown size={16} style={{ color: "var(--muted)" }} /> : <ChevronRight size={16} style={{ color: "var(--muted)" }} />}
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
          {lesson.description && <p style={{ fontSize: 13, color: "var(--muted)", margin: "12px 0 8px" }}>{lesson.description}</p>}
          <p style={{ fontSize: 13, color: "var(--text)", margin: "8px 0 14px", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {lesson.content}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 16px" }} onClick={onOpen}>Open →</button>
            {canEdit && (
              <button className="btn" style={{ fontSize: 12, padding: "6px 12px", color: "var(--danger)" }} onClick={e => { e.stopPropagation(); onDelete() }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LessonsPage() {
  const { isTeacher, isAdmin, user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("")
  const [form, setForm] = useState({
    title: "", subtopic: "", description: "", content: "",
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
      setForm({ title: "", subtopic: "", description: "", content: "", class_id: "", subject_id: "1", lesson_type: "note", status: "published", visibility: "class" })
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

  const filtered = lessons.filter(l =>
    (search === "" || l.title.toLowerCase().includes(search.toLowerCase())) &&
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

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
              <BookOpen size={24} style={{ color: "var(--accent)" }} /> Lessons
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
              {isTeacher || isAdmin ? "AI-powered lesson creation for your classes" : "Browse your class lessons"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(isTeacher || isAdmin) && (
              <>
                <button className="btn" style={{ fontSize: 12, color: "var(--accent)" }} onClick={() => navigate("/subscription")}>
                  <Sparkles size={13} /> AI Plans
                </button>
                <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
                  <PlusCircle size={15} /> {showForm ? "Cancel" : "New Lesson"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <PlusCircle size={18} style={{ color: "var(--accent)" }} /> Create New Lesson
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Topic + Subtopic */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Topic / Title *</label>
                  <input className="audit-control" required value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Photosynthesis, Algebra, World War II..." />
                </div>
                <div className="form-field">
                  <label className="form-label">Subtopic (optional)</label>
                  <input className="audit-control" value={form.subtopic}
                    onChange={e => setForm(p => ({ ...p, subtopic: e.target.value }))}
                    placeholder="e.g. Light reactions, Quadratic equations..." />
                </div>
              </div>

              {/* AI Generator */}
              <AIGenerator
                topic={form.title}
                subtopic={form.subtopic}
                onGenerated={(content) => setForm(p => ({ ...p, content }))}
              />

              <div className="form-field">
                <label className="form-label">Description</label>
                <input className="audit-control" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief overview..." />
              </div>

              <div className="form-field">
                <label className="form-label">Content *</label>
                <RichEditor
                  value={form.content}
                  onChange={(md) => setForm(p => ({ ...p, content: md }))}
                  placeholder="Write your lesson content here..."
                  minHeight={280}
                />
              </div>

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
                  <label className="form-label">Type</label>
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

        {/* Search + Filter */}
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

        {isLoading && [1,2,3].map(i => <div key={i} className="card" style={{ height: 80, opacity: 0.4, marginBottom: 8 }} />)}

        {!isLoading && filtered.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
            <h3 style={{ margin: "0 0 8px" }}>No lessons found</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
              {(isTeacher || isAdmin) ? "Create your first lesson above." : "No lessons available yet."}
            </p>
          </div>
        )}

        {!isLoading && Object.keys(byClass).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {Object.entries(byClass).map(([classId, classLessons]) => {
              const cls = classes.find(c => c.id === Number(classId))
              return (
                <div key={classId}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 14px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--card)", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>
                      🎓 {cls?.title ?? `Class ${classId}`}
                      <span className="chip" style={{ fontSize: 10 }}>{classLessons.length} lessons</span>
                      {cls?.class_code && <span style={{ fontSize: 10, color: "var(--muted)" }}>Code: {cls.class_code}</span>}
                    </div>
                    <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {classLessons.map(lesson => (
                      <LessonCard key={lesson.id} lesson={lesson}
                        onOpen={() => setActiveLesson(lesson)}
                        onDelete={() => { if (window.confirm("Delete this lesson?")) deleteMutation.mutate(lesson.id) }}
                        canEdit={(isTeacher && lesson.teacher_id === user?.id) || !!isAdmin}
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