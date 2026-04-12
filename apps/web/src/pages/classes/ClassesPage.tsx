import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import ClassDetail from "./ClassDetail"
import type { Class } from "@/features/classes/types/class.types"
import { Users, BookOpen, Lock, Globe, Plus, Trash2, Edit2 } from "lucide-react"

export default function ClassesPage() {
  const { isTeacher, isAdmin, isLearner } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [activeClass, setActiveClass] = useState<Class | null>(null)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    title: "", description: "", class_code: "",
    subject_id: "", grade_level: "", visibility: "public"
  })

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await api.get(endpoints.classes.list)
      return (Array.isArray(res.data) ? res.data : res.data?.items ?? []) as Class[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post(endpoints.classes.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      setShowForm(false)
      setForm({ title: "", description: "", class_code: "", subject_id: "", grade_level: "", visibility: "public" })
      setError("")
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Failed to create class"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(endpoints.classes.delete(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  })

  const joinMutation = useMutation({
    mutationFn: async (id: number) => api.post(endpoints.classes.join(id), {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      class_code: form.class_code,
      subject_id: Number(form.subject_id),
      grade_level: form.grade_level || undefined,
      visibility: form.visibility,
    })
  }

  if (activeClass) {
    return <ClassDetail cls={activeClass} onBack={() => setActiveClass(null)} />
  }

  return (
    <AppShell>
      <div className="page-section">

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">🎓 Classes</h1>
            <p className="page-sub">
              {isTeacher || isAdmin ? "Manage your learning classes." : "Your enrolled classes."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isLearner && (
              <button className="btn" onClick={() => window.location.href = "/classes/discover"}>
                🔍 Discover
              </button>
            )}
            {(isTeacher || isAdmin) && (
              <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                <Plus size={16} /> {showForm ? "Cancel" : "New Class"}
              </button>
            )}
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="card" style={{ maxWidth: 580 }}>
            <div className="card-head"><span className="card-title">Create New Class</span></div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Class Title *</label>
                  <input className="audit-control" required value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Mathematics Grade 10" />
                </div>
                <div className="form-field">
                  <label className="form-label">Class Code *</label>
                  <input className="audit-control" required value={form.class_code}
                    onChange={e => setForm(p => ({ ...p, class_code: e.target.value }))}
                    placeholder="e.g. MATH101" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Description</label>
                <input className="audit-control" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What will students learn?" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Subject ID *</label>
                  <input className="audit-control" required type="number" value={form.subject_id}
                    onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))} placeholder="1" />
                </div>
                <div className="form-field">
                  <label className="form-label">Grade Level</label>
                  <input className="audit-control" value={form.grade_level}
                    onChange={e => setForm(p => ({ ...p, grade_level: e.target.value }))}
                    placeholder="e.g. Grade 10" />
                </div>
                <div className="form-field">
                  <label className="form-label">Visibility</label>
                  <select className="audit-control select" value={form.visibility}
                    onChange={e => setForm(p => ({ ...p, visibility: e.target.value }))}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
              {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{error}</div>}
              <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Class"}
              </button>
            </form>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid-2" style={{ gap: 16 }}>
            {[1,2,3,4].map(i => <div key={i} className="card" style={{ height: 160, opacity: 0.4 }} />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && classes.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
            <div className="card-title" style={{ marginBottom: 8 }}>No classes yet</div>
            <p className="card-sub">
              {isTeacher || isAdmin
                ? "Create your first class to start teaching."
                : "You are not enrolled in any classes. Discover classes to join!"}
            </p>
            {isLearner && (
              <button className="btn btn-primary" style={{ marginTop: 16 }}
                onClick={() => window.location.href = "/classes/discover"}>
                🔍 Discover Classes
              </button>
            )}
          </div>
        )}

        {/* Class Cards Grid */}
        {!isLoading && classes.length > 0 && (
          <div className="grid-2" style={{ gap: 16 }}>
            {classes.map(cls => (
              <div key={cls.id} className="card hover-lift"
                style={{ display: "flex", flexDirection: "column", gap: 12, cursor: "pointer", position: "relative" }}
                onClick={() => setActiveClass(cls)}>

                {/* Status badge */}
                <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 6 }}>
                  <span className="chip" style={{ fontSize: 10 }}>
                    {cls.visibility === "public" ? <Globe size={10} /> : <Lock size={10} />}
                    {" "}{cls.visibility}
                  </span>
                  {cls.status && (
                    <span className="chip" style={{ fontSize: 10, color: cls.status === "active" ? "var(--success)" : "var(--muted)" }}>
                      {cls.status}
                    </span>
                  )}
                </div>

                {/* Subject color bar */}
                <div style={{ height: 4, borderRadius: "12px 12px 0 0", margin: "-14px -14px 0", background: "linear-gradient(90deg, var(--accent), var(--accent2))" }} />

                {/* Class Info */}
                <div style={{ paddingTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="chip" style={{ fontSize: 11 }}>{cls.class_code}</span>
                    {cls.grade_level && <span className="chip" style={{ fontSize: 11 }}>{cls.grade_level}</span>}
                  </div>
                  <div className="card-title" style={{ fontSize: 17, marginBottom: 4 }}>{cls.title}</div>
                  {cls.subject && <div className="card-sub">📚 {cls.subject.name}</div>}
                  {cls.teacher && <div className="card-sub">👤 {cls.teacher.full_name}</div>}
                </div>

                {cls.description && (
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {cls.description}
                  </p>
                )}

                {/* Footer actions */}
                <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border)" }}
                  onClick={e => e.stopPropagation()}>
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: 13 }}
                    onClick={() => setActiveClass(cls)}>
                    Open Class →
                  </button>
                  {isLearner && (
                    <button className="btn" style={{ fontSize: 13 }}
                      onClick={() => joinMutation.mutate(cls.id)}
                      disabled={joinMutation.isPending}>
                      <Users size={14} /> Join
                    </button>
                  )}
                  {(isTeacher || isAdmin) && (
                    <button className="btn btn-danger" style={{ fontSize: 13, padding: "8px 12px" }}
                      onClick={() => {
                        if (window.confirm(`Delete "${cls.title}"?`)) deleteMutation.mutate(cls.id)
                      }}>
                      <Trash2 size={14} />
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