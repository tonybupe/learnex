import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useState } from "react"
import QuizTaker from "./QuizTaker"
import QuizBuilder from "./QuizBuilder"
import { Clock, Users, BookOpen, Plus, Pencil, Trash2, Eye } from "lucide-react"

export interface QuizOption { id: number; option_text: string; is_correct: boolean }
export interface QuizQuestion { id: number; question_text: string; question_type: string; points: number; order_index: number; options: QuizOption[] }
export interface Quiz {
  id: number; title: string; description?: string
  class_id: number; subject_id: number; teacher_id: number
  assessment_type: string; status: string
  time_limit_minutes?: number; attempts_allowed: number
  questions: QuizQuestion[]; created_at: string; updated_at: string
}

const STATUS_COLOR: Record<string, string> = {
  published: "var(--success)", draft: "#f59e0b", closed: "var(--danger)", archived: "var(--muted)"
}

const TYPE_ICON: Record<string, string> = {
  quiz: "📝", test: "📋", exam: "🎓", assignment: "📚"
}

export default function QuizzesPage() {
  const { isTeacher, isAdmin, isLearner } = useAuth()
  const queryClient = useQueryClient()
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [buildingQuiz, setBuildingQuiz] = useState<Quiz | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    title: "", description: "", class_id: "", subject_id: "1",
    time_limit_minutes: "", attempts_allowed: "1",
    assessment_type: "quiz", status: "draft"
  })

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const res = await api.get(endpoints.quizzes.list)
      return Array.isArray(res.data) ? res.data as Quiz[] : []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post(endpoints.quizzes.create, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] })
      setShowCreateForm(false)
      setError("")
      // Open quiz builder immediately after creation
      setBuildingQuiz(res.data)
      setForm({ title: "", description: "", class_id: "", subject_id: "1", time_limit_minutes: "", attempts_allowed: "1", assessment_type: "quiz", status: "draft" })
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Failed to create quiz"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(endpoints.quizzes.delete(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      class_id: Number(form.class_id),
      subject_id: Number(form.subject_id),
      time_limit_minutes: form.time_limit_minutes ? Number(form.time_limit_minutes) : undefined,
      attempts_allowed: Number(form.attempts_allowed),
      assessment_type: form.assessment_type,
      status: form.status,
    })
  }

  // Quiz taker (learner)
  if (activeQuiz) return (
    <QuizTaker quiz={activeQuiz} onExit={() => { setActiveQuiz(null); queryClient.invalidateQueries({ queryKey: ["quizzes"] }) }} />
  )

  // Quiz builder (teacher)
  if (buildingQuiz) return (
    <QuizBuilder quiz={buildingQuiz} onExit={() => { setBuildingQuiz(null); queryClient.invalidateQueries({ queryKey: ["quizzes"] }) }} />
  )

  return (
    <AppShell>
      <div className="page-section">

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">📝 Quizzes</h1>
            <p className="page-sub">
              {isTeacher || isAdmin ? "Create and manage assessments for your classes." : "Take quizzes and track your performance."}
            </p>
          </div>
          {(isTeacher || isAdmin) && (
            <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus size={16} /> {showCreateForm ? "Cancel" : "New Quiz"}
            </button>
          )}
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="card" style={{ maxWidth: 580, borderLeft: "4px solid var(--accent)" }}>
            <div className="card-head">
              <span className="card-title">📝 Create New Quiz</span>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Quiz Title *</label>
                  <input className="audit-control" required value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Chapter 1 - Algebra Quiz" />
                </div>
                <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Description</label>
                  <input className="audit-control" value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="What topics does this quiz cover?" />
                </div>
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
                  <select className="audit-control select" value={form.assessment_type}
                    onChange={e => setForm(p => ({ ...p, assessment_type: e.target.value }))}>
                    <option value="quiz">Quiz</option>
                    <option value="test">Test</option>
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Time Limit (min)</label>
                  <input className="audit-control" type="number" value={form.time_limit_minutes}
                    onChange={e => setForm(p => ({ ...p, time_limit_minutes: e.target.value }))} placeholder="e.g. 30" />
                </div>
                <div className="form-field">
                  <label className="form-label">Attempts Allowed</label>
                  <input className="audit-control" type="number" min="1" value={form.attempts_allowed}
                    onChange={e => setForm(p => ({ ...p, attempts_allowed: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Status</label>
                  <select className="audit-control select" value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="draft">Draft (add questions first)</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{error}</div>}
              <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}
                style={{ alignSelf: "flex-start", padding: "10px 24px" }}>
                {createMutation.isPending ? "Creating..." : "Create & Add Questions →"}
              </button>
            </form>
          </div>
        )}

        {isLoading && (
          <div className="grid-2" style={{ gap: 16 }}>
            {[1,2,3].map(i => <div key={i} className="card" style={{ height: 160, opacity: 0.4 }} />)}
          </div>
        )}

        {!isLoading && quizzes.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 56 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📝</div>
            <div className="card-title" style={{ fontSize: 20, marginBottom: 8 }}>No quizzes yet</div>
            <p className="card-sub" style={{ maxWidth: 400, margin: "0 auto 20px" }}>
              {isTeacher || isAdmin
                ? "Create your first quiz to assess your learners. You can add questions after creating."
                : "No quizzes are available yet. Check back later."}
            </p>
            {(isTeacher || isAdmin) && (
              <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
                <Plus size={16} /> Create First Quiz
              </button>
            )}
          </div>
        )}

        {!isLoading && quizzes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {quizzes.map(quiz => (
              <div key={quiz.id} className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>

                {/* Type Icon */}
                <div style={{
                  width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                  background: "color-mix(in srgb, var(--accent) 12%, var(--card))",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24
                }}>
                  {TYPE_ICON[quiz.assessment_type] ?? "📝"}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{quiz.title}</span>
                    <span className="chip" style={{ color: STATUS_COLOR[quiz.status], borderColor: STATUS_COLOR[quiz.status], fontSize: 11 }}>
                      {quiz.status}
                    </span>
                    <span className="chip" style={{ fontSize: 11 }}>{quiz.assessment_type}</span>
                  </div>
                  {quiz.description && (
                    <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>{quiz.description}</div>
                  )}
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
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {(isTeacher || isAdmin) && (
                    <>
                      <button className="btn" style={{ fontSize: 13, padding: "8px 14px" }}
                        onClick={() => setBuildingQuiz(quiz)}
                        title="Edit quiz & questions">
                        <Pencil size={14} /> Edit
                      </button>
                      <button className="btn btn-danger" style={{ fontSize: 13, padding: "8px 12px" }}
                        onClick={() => { if (window.confirm(`Delete "${quiz.title}"?`)) deleteMutation.mutate(quiz.id) }}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  {isLearner && quiz.status === "published" && (
                    <button className="btn btn-primary" style={{ fontSize: 13, padding: "8px 18px" }}
                      onClick={() => setActiveQuiz(quiz)}
                      disabled={quiz.questions?.length === 0}>
                      {quiz.questions?.length === 0 ? "No questions" : "🚀 Take Quiz"}
                    </button>
                  )}
                  {isLearner && quiz.status !== "published" && (
                    <span className="chip" style={{ fontSize: 12, color: "var(--muted)" }}>Not available</span>
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