import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useState } from "react"

interface Quiz {
  id: number
  title: string
  description?: string
  class_id?: number
  passing_score: number
  questions_count: number
  time_limit?: number
  created_at: string
}

export default function QuizzesPage() {
  const { isTeacher, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", class_id: "", passing_score: "50", time_limit: "" })
  const [error, setError] = useState("")
  const [startingId, setStartingId] = useState<number | null>(null)

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const res = await api.get(endpoints.quizzes.list)
      return res.data as Quiz[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => { await api.post(endpoints.quizzes.create, data) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["quizzes"] }); setShowForm(false) },
    onError: (err: any) => setError(err?.response?.data?.detail || "Failed to create quiz"),
  })

  const startMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(endpoints.quizzes.start(id), {})
      return res.data
    },
    onSuccess: () => { setStartingId(null) },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    createMutation.mutate({
      title: form.title,
      description: form.description,
      class_id: form.class_id ? Number(form.class_id) : undefined,
      passing_score: Number(form.passing_score),
      time_limit: form.time_limit ? Number(form.time_limit) : undefined,
    })
  }

  return (
    <AppShell>
      <div className="page-section">
        <div className="page-header">
          <div>
            <h1 className="page-title">Quizzes</h1>
            <p className="page-sub">Create assessments and test learner knowledge.</p>
          </div>
          {(isTeacher || isAdmin) && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ New Quiz"}
            </button>
          )}
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="card" style={{ maxWidth: 540 }}>
            <div className="card-head"><span className="card-title">Create Quiz</span></div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-field">
                <label className="form-label">Title</label>
                <input className="audit-control" required value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Algebra Chapter 1 Quiz" />
              </div>
              <div className="form-field">
                <label className="form-label">Description</label>
                <input className="audit-control" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Quiz description..." />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Class ID</label>
                  <input className="audit-control" type="number" value={form.class_id}
                    onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))} placeholder="1" />
                </div>
                <div className="form-field">
                  <label className="form-label">Passing Score %</label>
                  <input className="audit-control" required type="number" value={form.passing_score}
                    onChange={e => setForm(p => ({ ...p, passing_score: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Time Limit (min)</label>
                  <input className="audit-control" type="number" value={form.time_limit}
                    onChange={e => setForm(p => ({ ...p, time_limit: e.target.value }))} placeholder="30" />
                </div>
              </div>
              {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{error}</div>}
              <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Quiz"}
              </button>
            </form>
          </div>
        )}

        {isLoading && <div className="card">Loading quizzes...</div>}

        {!isLoading && quizzes.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <div className="card-title">No quizzes yet</div>
            <p className="card-sub">
              {isTeacher || isAdmin ? "Create your first quiz to assess learners." : "No quizzes available yet."}
            </p>
          </div>
        )}

        {!isLoading && quizzes.length > 0 && (
          <div className="grid-2" style={{ gap: 16 }}>
            {quizzes.map(quiz => (
              <div key={quiz.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="card-head">
                  <div>
                    <div className="card-title">{quiz.title}</div>
                    <div className="card-sub">
                      {quiz.questions_count} questions · Pass: {quiz.passing_score}%
                      {quiz.time_limit && ` · ${quiz.time_limit} min`}
                    </div>
                  </div>
                  {quiz.class_id && <div className="chip">Class #{quiz.class_id}</div>}
                </div>
                {quiz.description && (
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{quiz.description}</p>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span className="card-sub">{new Date(quiz.created_at).toLocaleDateString()}</span>
                  {!isTeacher && !isAdmin && (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 13, padding: "8px 14px" }}
                      disabled={startMutation.isPending && startingId === quiz.id}
                      onClick={() => { setStartingId(quiz.id); startMutation.mutate(quiz.id) }}
                    >
                      {startMutation.isPending && startingId === quiz.id ? "Starting..." : "Start Quiz"}
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