import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useState } from "react"
import LessonDetail from "./LessonDetail"
import { BookOpen, Clock, Eye, FileText, Video, Link2 } from "lucide-react"

interface LessonResource { id: number; resource_type: string; url: string; title?: string; mime_type?: string }
interface Lesson {
  id: number; title: string; description?: string; content: string
  class_id: number; subject_id: number; teacher_id: number
  lesson_type: string; visibility: string; status: string
  resources: LessonResource[]; created_at: string; updated_at: string
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  note: <FileText size={16} />,
  video: <Video size={16} />,
  live: <Eye size={16} />,
  assignment: <BookOpen size={16} />,
}

const STATUS_COLOR: Record<string, string> = {
  published: "var(--success)", draft: "var(--muted)", archived: "var(--danger)"
}

export default function LessonsPage() {
  const { isTeacher, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    title: "", description: "", content: "", class_id: "",
    subject_id: "1", lesson_type: "note", status: "published", visibility: "class"
  })

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await api.get(endpoints.lessons.list)
      return Array.isArray(res.data) ? res.data as Lesson[] : []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post(endpoints.lessons.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      setShowForm(false)
      setForm({ title: "", description: "", content: "", class_id: "", subject_id: "1", lesson_type: "note", status: "published", visibility: "class" })
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Failed to create lesson"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    if (!form.content.trim()) { setError("Content is required"); return }
    createMutation.mutate({
      title: form.title, description: form.description || undefined,
      content: form.content, class_id: Number(form.class_id),
      subject_id: Number(form.subject_id), lesson_type: form.lesson_type,
      status: form.status, visibility: form.visibility,
    })
  }

  if (activeLesson) return <LessonDetail lesson={activeLesson} onBack={() => setActiveLesson(null)} />

  return (
    <AppShell>
      <div className="page-section">
        <div className="page-header">
          <div>
            <h1 className="page-title">📚 Lessons</h1>
            <p className="page-sub">Structured learning content for your classes.</p>
          </div>
          {(isTeacher || isAdmin) && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ New Lesson"}
            </button>
          )}
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="card" style={{ maxWidth: 600 }}>
            <div className="card-head"><span className="card-title">Create Lesson</span></div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-field">
                <label className="form-label">Title *</label>
                <input className="audit-control" required value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Introduction to Algebra" />
              </div>
              <div className="form-field">
                <label className="form-label">Description</label>
                <input className="audit-control" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief overview of this lesson..." />
              </div>
              <div className="form-field">
                <label className="form-label">Content *</label>
                <textarea
                  required value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Write your lesson content here... (supports markdown)"
                  style={{ width: "100%", minHeight: 160, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Class ID *</label>
                  <input className="audit-control" required type="number" value={form.class_id}
                    onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))} placeholder="1" />
                </div>
                <div className="form-field">
                  <label className="form-label">Subject ID *</label>
                  <input className="audit-control" required type="number" value={form.subject_id}
                    onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Type</label>
                  <select className="audit-control select" value={form.lesson_type}
                    onChange={e => setForm(p => ({ ...p, lesson_type: e.target.value }))}>
                    <option value="note">Note</option>
                    <option value="video">Video</option>
                    <option value="live">Live</option>
                    <option value="assignment">Assignment</option>
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
                  <label className="form-label">Visibility</label>
                  <select className="audit-control select" value={form.visibility}
                    onChange={e => setForm(p => ({ ...p, visibility: e.target.value }))}>
                    <option value="class">Class only</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
              {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{error}</div>}
              <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Lesson"}
              </button>
            </form>
          </div>
        )}

        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="card" style={{ height: 120, opacity: 0.5 }} />)}
          </div>
        )}

        {!isLoading && lessons.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
            <div className="card-title" style={{ marginBottom: 8 }}>No lessons yet</div>
            <p className="card-sub">
              {isTeacher || isAdmin ? "Create your first lesson to start teaching." : "No lessons available yet."}
            </p>
          </div>
        )}

        {!isLoading && lessons.length > 0 && (
          <div className="grid-2" style={{ gap: 16 }}>
            {lessons.map(lesson => (
              <div key={lesson.id} className="card hover-lift"
                style={{ display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }}
                onClick={() => setActiveLesson(lesson)}>

                {/* Header */}
                <div className="card-head">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ color: "var(--accent)" }}>{TYPE_ICONS[lesson.lesson_type]}</span>
                      <div className="card-title">{lesson.title}</div>
                      <span className="chip" style={{ color: STATUS_COLOR[lesson.status], borderColor: STATUS_COLOR[lesson.status], fontSize: 10 }}>
                        {lesson.status}
                      </span>
                    </div>
                    <div className="card-sub">Class #{lesson.class_id} · {lesson.lesson_type}</div>
                  </div>
                </div>

                {lesson.description && (
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{lesson.description}</p>
                )}

                {/* Content Preview */}
                <p style={{ fontSize: 13, color: "var(--text)", margin: 0, lineHeight: 1.5,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {lesson.content}
                </p>

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--muted)" }}>
                    <span>{new Date(lesson.created_at).toLocaleDateString()}</span>
                    {lesson.resources.length > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Link2 size={12} /> {lesson.resources.length} resource{lesson.resources.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}
                    onClick={e => { e.stopPropagation(); setActiveLesson(lesson) }}>
                    Open →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}