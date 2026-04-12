import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"

interface Lesson {
  id: number
  title: string
  description?: string
  class_id: number
  order: number
  created_at: string
}

interface CreateLessonData {
  title: string
  description: string
  class_id: number
  order: number
}

export default function LessonsPage() {
  const { isTeacher, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", class_id: "", order: "1" })
  const [error, setError] = useState("")

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await api.get(endpoints.lessons.list)
      return res.data as Lesson[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateLessonData) => {
      await api.post(endpoints.lessons.create, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      setShowForm(false)
      setForm({ title: "", description: "", class_id: "", order: "1" })
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || "Failed to create lesson")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(endpoints.lessons.delete(id))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lessons"] }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    createMutation.mutate({
      title: form.title,
      description: form.description,
      class_id: Number(form.class_id),
      order: Number(form.order),
    })
  }

  return (
    <AppShell>
      <div className="page-section">
        <div className="page-header">
          <div>
            <h1 className="page-title">Lessons</h1>
            <p className="page-sub">Manage and deliver structured lesson content.</p>
          </div>
          {(isTeacher || isAdmin) && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ New Lesson"}
            </button>
          )}
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="card" style={{ maxWidth: 540 }}>
            <div className="card-head">
              <span className="card-title">Create Lesson</span>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-field">
                <label className="form-label">Title</label>
                <input className="audit-control" required value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Introduction to Algebra" />
              </div>
              <div className="form-field">
                <label className="form-label">Description</label>
                <input className="audit-control" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What this lesson covers..." />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Class ID</label>
                  <input className="audit-control" required type="number" value={form.class_id}
                    onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}
                    placeholder="1" />
                </div>
                <div className="form-field">
                  <label className="form-label">Order</label>
                  <input className="audit-control" required type="number" value={form.order}
                    onChange={e => setForm(p => ({ ...p, order: e.target.value }))}
                    placeholder="1" />
                </div>
              </div>
              {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{error}</div>}
              <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Lesson"}
              </button>
            </form>
          </div>
        )}

        {/* Loading */}
        {isLoading && <div className="card">Loading lessons...</div>}

        {/* Empty */}
        {!isLoading && lessons.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
            <div className="card-title">No lessons yet</div>
            <p className="card-sub">
              {isTeacher || isAdmin ? "Create your first lesson to get started." : "No lessons have been published yet."}
            </p>
          </div>
        )}

        {/* Lessons Grid */}
        {!isLoading && lessons.length > 0 && (
          <div className="grid-2" style={{ gap: 16 }}>
            {lessons.map(lesson => (
              <div key={lesson.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="card-head">
                  <div>
                    <div className="card-title">{lesson.title}</div>
                    <div className="card-sub">Class #{lesson.class_id} · Lesson {lesson.order}</div>
                  </div>
                  <div className="chip">#{lesson.id}</div>
                </div>
                {lesson.description && (
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{lesson.description}</p>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span className="card-sub">{new Date(lesson.created_at).toLocaleDateString()}</span>
                  {(isTeacher || isAdmin) && (
                    <button
                      className="btn btn-danger"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      onClick={() => deleteMutation.mutate(lesson.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}