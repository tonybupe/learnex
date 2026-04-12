import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useState } from "react"
import QuizTaker from "./QuizTaker"
import { Clock, Users, CheckCircle, BookOpen } from "lucide-react"

interface QuizOption { id: number; option_text: string; is_correct: boolean }
interface QuizQuestion { id: number; question_text: string; question_type: string; points: number; order_index: number; options: QuizOption[] }
interface Quiz {
  id: number; title: string; description?: string
  class_id: number; subject_id: number; teacher_id: number
  assessment_type: string; status: string
  time_limit_minutes?: number; attempts_allowed: number
  questions: QuizQuestion[]; created_at: string
}

export default function QuizzesPage() {
  const { isTeacher, isAdmin, isLearner } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [form, setForm] = useState({
    title: "", description: "", class_id: "", subject_id: "1",
    time_limit_minutes: "", attempts_allowed: "1", status: "published"
  })
  const [error, setError] = useState("")

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const res = await api.get(endpoints.quizzes.list)
      return res.data as Quiz[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post(endpoints.quizzes.create, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["quizzes"] }); setShowForm(false); setForm({ title: "", description: "", class_id: "", subject_id: "1", time_limit_minutes: "", attempts_allowed: "1", status: "published" }) },
    onError: (err: any) => setError(err?.response?.data?.detail || "Failed to create quiz"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    createMutation.mutate({
      title: form.title, description: form.description || undefined,
      class_id: Number(form.class_id), subject_id: Number(form.subject_id),
      time_limit_minutes: form.time_limit_minutes ? Number(form.time_limit_minutes) : undefined,
      attempts_allowed: Number(form.attempts_allowed), status: form.status,
    })
  }

  if (activeQuiz) {
    return <QuizTaker quiz={activeQuiz} onExit={() => { setActiveQuiz(null); queryClient.invalidateQueries({ queryKey: ["quizzes"] }) }} />
  }

  const statusColor = (s: string) => ({ published: "var(--success)", draft: "var(--muted)", closed: "var(--danger)", archived: "var(--muted)" }[s] || "var(--muted)")

  return (
    <AppShell>
      <div className="page-section">
        <div className="page-header">
          <div>
            <h1 className="page-title">📝 Quizzes</h1>
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
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="card-head"><span className="card-title">Create Quiz</span></div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-field">
                <label className="form-label">Title *</label>
                <input className="audit-control" required value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Algebra Chapter 1 Quiz" />
              </div>
              <div className="form-field">
                <label className="form-label">Description</label>
                <input className="audit-control" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What this quiz covers..." />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
                  <label className="form-label">Time Limit (min)</label>
                  <input className="audit-control" type="number" value={form.time_limit_minutes}
                    onChange={e => setForm(p => ({ ...p, time_limit_minutes: e.target.value }))} placeholder="30" />
                </div>
                <div className="form-field">
                  <label className="form-label">Attempts Allowed</label>
                  <input className="audit-control" type="number" min="1" value={form.attempts_allowed}
                    onChange={e => setForm(p => ({ ...p, attempts_allowed: e.target.value }))} />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select className="audit-control select" value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{error}</div>}
              <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Quiz"}
              </button>
            </form>
          </div>
        )}

        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="card" style={{ height: 100, opacity: 0.5 }} />)}
          </div>
        )}

        {!isLoading && quizzes.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            <div className="card-title" style={{ marginBottom: 8 }}>No quizzes yet</div>
            <p className="card-sub">
              {isTeacher || isAdmin ? "Create your first quiz to assess learners." : "No quizzes available yet."}
            </p>
          </div>
        )}

        {!isLoading && quizzes.length > 0 && (
          <div className="grid-2" style={{ gap: 16 }}>
            {quizzes.map(quiz => (
              <div key={quiz.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Header */}
                <div className="card-head">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div className="card-title">{quiz.title}</div>
                      <span className="chip" style={{ color: statusColor(quiz.status), borderColor: statusColor(quiz.status), fontSize: 11 }}>
                        {quiz.status}
                      </span>
                    </div>
                    <div className="card-sub">{quiz.assessment_type}</div>
                  </div>
                </div>

                {quiz.description && <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{quiz.description}</p>}

                {/* Meta */}
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <BookOpen size={12} /> {quiz.questions?.length ?? 0} questions
                  </span>
                  {quiz.time_limit_minutes && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={12} /> {quiz.time_limit_minutes} min
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Users size={12} /> {quiz.attempts_allowed} attempt{quiz.attempts_allowed !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  {isLearner && quiz.status === "published" && (
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: 13 }}
                      onClick={() => setActiveQuiz(quiz)}
                      disabled={quiz.questions?.length === 0}
                    >
                      {quiz.questions?.length === 0 ? "No questions yet" : "🚀 Start Quiz"}
                    </button>
                  )}
                  {(isTeacher || isAdmin) && (
                    <button
                      className="btn"
                      style={{ flex: 1, fontSize: 13 }}
                      onClick={() => setActiveQuiz(quiz)}
                    >
                      👁️ Preview Quiz
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