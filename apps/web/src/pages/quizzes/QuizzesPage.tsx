import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useState, useEffect } from "react"
import QuizTaker from "./QuizTaker"
import QuizBuilder from "./QuizBuilder"
import {
  Clock, Users, BookOpen, Plus, Pencil, Trash2, Eye,
  Sparkles, Brain, CheckCircle2, XCircle, AlertCircle,
  ChevronRight, BarChart2, Filter, Search, Zap, Star,
  GraduationCap, FileText, Target, Award
} from "lucide-react"

export interface QuizOption { id: number; option_text: string; is_correct: boolean }
export interface QuizQuestion {
  id: number; question_text: string; question_type: string
  points: number; order_index: number; options: QuizOption[]
}
export interface Quiz {
  id: number; title: string; description?: string
  class_id: number; subject_id: number; lesson_id?: number; teacher_id: number
  assessment_type: string; status: string
  time_limit_minutes?: number; attempts_allowed: number
  questions: QuizQuestion[]; created_at: string; updated_at: string
  is_auto_marked: boolean
}

const STATUS_COLOR: Record<string, string> = {
  published: "#22c55e", draft: "#f59e0b", closed: "#ef4444", archived: "#94a3b8"
}
const STATUS_BG: Record<string, string> = {
  published: "rgba(34,197,94,0.1)", draft: "rgba(245,158,11,0.1)", closed: "rgba(239,68,68,0.1)", archived: "rgba(148,163,184,0.1)"
}
const TYPE_ICON: Record<string, string> = {
  quiz: "📝", test: "📋", exam: "🎓", assignment: "📚"
}
const TYPE_COLOR: Record<string, string> = {
  quiz: "#cb26e4", test: "#38bdf8", exam: "#ef4444", assignment: "#22c55e"
}

// ── AI Generator Modal ──────────────────────────────
function AIGeneratorModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: (quiz: Quiz) => void }) {
  const [step, setStep] = useState<"params" | "generating" | "done">("params")
  const [lessonId, setLessonId] = useState("")
  const [classId, setClassId] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const [title, setTitle] = useState("")
  const [mcCount, setMcCount] = useState(5)
  const [tfCount, setTfCount] = useState(3)
  const [saCount, setSaCount] = useState(2)
  const [essayCount, setEssayCount] = useState(0)
  const [difficulty, setDifficulty] = useState("medium")
  const [error, setError] = useState("")

  const { data: lessons = [] } = useQuery({
    queryKey: ["my-lessons-quiz"],
    queryFn: async () => {
      const res = await api.get("/lessons?mine=true&limit=50").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    }
  })
  const { data: classes = [] } = useQuery({
    queryKey: ["my-classes-quiz"],
    queryFn: async () => {
      const res = await api.get("/classes?mine=true").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    }
  })
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await api.get("/subjects").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    }
  })

  // Auto fill from lesson
  useEffect(() => {
    if (lessonId) {
      const lesson = lessons.find((l: any) => String(l.id) === lessonId)
      if (lesson) {
        if (!title) setTitle(`Quiz: ${lesson.title}`)
        if (lesson.class_id) setClassId(String(lesson.class_id))
        if (lesson.subject_id) setSubjectId(String(lesson.subject_id))
      }
    }
  }, [lessonId, lessons])

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/quizzes/ai/generate", {
        lesson_id: parseInt(lessonId),
        class_id: parseInt(classId),
        subject_id: parseInt(subjectId),
        title: title || "AI Generated Quiz",
        multiple_choice: mcCount,
        true_false: tfCount,
        short_answer: saCount,
        essay: essayCount,
        difficulty,
      })
      return res.data as Quiz
    },
    onSuccess: (quiz) => {
      setStep("done")
      setTimeout(() => { onGenerated(quiz); onClose() }, 1500)
    },
    onError: (e: any) => {
      setError(e?.response?.data?.detail || "Generation failed. Try again.")
      setStep("params")
    }
  })

  const totalQ = mcCount + tfCount + saCount + essayCount

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 13px", borderRadius: 10,
    border: "1.5px solid var(--border)", background: "var(--bg2)",
    color: "var(--text)", fontSize: 14, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card)", borderRadius: 20, width: "100%", maxWidth: 560, border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", background: "linear-gradient(135deg,rgba(203,38,228,0.06),rgba(139,92,246,0.06))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={18} style={{ color: "white" }} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>AI Quiz Generator</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Generate from lesson content using Claude AI</div>
            </div>
          </div>
        </div>

        {step === "generating" && (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "spin 1s linear infinite" }}>
              <Brain size={28} style={{ color: "white" }} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Generating Quiz...</div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
              Claude AI is reading your lesson and crafting {totalQ} questions.<br />This takes about 10-20 seconds.
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{ padding: 48, textAlign: "center" }}>
            <CheckCircle2 size={56} style={{ color: "#22c55e", marginBottom: 16 }} />
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: "#22c55e" }}>Quiz Generated!</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Opening quiz builder...</div>
          </div>
        )}

        {step === "params" && (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>
                {error}
              </div>
            )}

            {/* Step 1: Select Lesson */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Step 1 — Select Lesson Source
              </div>
              <select style={inp} value={lessonId} onChange={e => setLessonId(e.target.value)}>
                <option value="">Choose a lesson to generate from...</option>
                {lessons.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>

            {/* Step 2: Class + Subject */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Step 2 — Class & Subject
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <select style={inp} value={classId} onChange={e => setClassId(e.target.value)}>
                  <option value="">Select class...</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select style={inp} value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                  <option value="">Select subject...</option>
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quiz Title */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Quiz Title
              </div>
              <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 3 Quiz" />
            </div>

            {/* Step 3: Question counts */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Step 3 — Question Mix ({totalQ} total questions)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Multiple Choice", key: "mc", value: mcCount, set: setMcCount, icon: "🔘", color: "#cb26e4", desc: "2 pts each" },
                  { label: "True / False", key: "tf", value: tfCount, set: setTfCount, icon: "✅", color: "#38bdf8", desc: "1 pt each" },
                  { label: "Short Answer", key: "sa", value: saCount, set: setSaCount, icon: "✏️", color: "#22c55e", desc: "3 pts each" },
                  { label: "Essay", key: "essay", value: essayCount, set: setEssayCount, icon: "📝", color: "#f59e0b", desc: "5 pts each" },
                ].map(q => (
                  <div key={q.key} style={{ padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${q.color}20`, background: `${q.color}06` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{q.icon} {q.label}</div>
                        <div style={{ fontSize: 10, color: q.color, fontWeight: 600 }}>{q.desc}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => q.set(Math.max(0, q.value - 1))}
                          style={{ width: 26, height: 26, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontWeight: 900, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>−</button>
                        <span style={{ fontWeight: 900, fontSize: 18, color: q.color, minWidth: 24, textAlign: "center" }}>{q.value}</span>
                        <button onClick={() => q.set(Math.min(20, q.value + 1))}
                          style={{ width: 26, height: 26, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontWeight: 900, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: q.color }}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Difficulty Level
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["easy", "medium", "hard"].map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${difficulty === d ? (d === "easy" ? "#22c55e" : d === "medium" ? "#f59e0b" : "#ef4444") : "var(--border)"}`, background: difficulty === d ? (d === "easy" ? "rgba(34,197,94,0.1)" : d === "medium" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)") : "var(--bg2)", cursor: "pointer", fontWeight: 700, fontSize: 13, color: difficulty === d ? (d === "easy" ? "#22c55e" : d === "medium" ? "#f59e0b" : "#ef4444") : "var(--muted)", fontFamily: "inherit", transition: "all 0.15s" }}>
                    {d === "easy" ? "🟢 Easy" : d === "medium" ? "🟡 Medium" : "🔴 Hard"}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {totalQ > 0 && lessonId && classId && subjectId && (
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(203,38,228,0.06)", border: "1px solid rgba(203,38,228,0.15)" }}>
                <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>
                  ✨ Ready to generate {totalQ} questions from "{lessons.find((l: any) => String(l.id) === lessonId)?.title}"
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button onClick={onClose}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", color: "var(--text)" }}>
                Cancel
              </button>
              <button
                disabled={!lessonId || !classId || !subjectId || totalQ === 0}
                onClick={() => { setStep("generating"); generateMutation.mutate() }}
                style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: !lessonId || !classId || !subjectId || totalQ === 0 ? "var(--bg2)" : "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: !lessonId || !classId || !subjectId || totalQ === 0 ? "var(--muted)" : "white", cursor: !lessonId || !classId || !subjectId || totalQ === 0 ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: lessonId && classId && subjectId && totalQ > 0 ? "0 4px 14px rgba(203,38,228,0.35)" : "none" }}>
                <Sparkles size={16} /> Generate {totalQ} Questions with AI
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Quiz Card ────────────────────────────────────────
function QuizCard({ quiz, isTeacher, onTake, onEdit, onDelete, isMobile }: {
  quiz: Quiz; isTeacher: boolean; onTake: () => void; onEdit: () => void; onDelete: () => void; isMobile: boolean
}) {
  const qCount = quiz.questions?.length ?? 0
  const totalPts = quiz.questions?.reduce((s, q) => s + q.points, 0) ?? 0
  const color = TYPE_COLOR[quiz.assessment_type] ?? "var(--accent)"

  return (
    <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none" }}>

      {/* Color bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}80)` }} />

      <div style={{ padding: isMobile ? 14 : 18 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 16 }}>{TYPE_ICON[quiz.assessment_type] ?? "📝"}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: STATUS_BG[quiz.status] ?? "var(--bg2)", color: STATUS_COLOR[quiz.status] ?? "var(--muted)", border: `1px solid ${STATUS_COLOR[quiz.status] ?? "var(--muted)"}30` }}>
                {quiz.status.toUpperCase()}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${color}12`, color, border: `1px solid ${color}25` }}>
                {quiz.assessment_type}
              </span>
              {quiz.is_auto_marked && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", gap: 3 }}>
                  <Brain size={10} /> AI Marked
                </span>
              )}
            </div>
            <div style={{ fontWeight: 800, fontSize: isMobile ? 15 : 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{quiz.title}</div>
            {quiz.description && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{quiz.description}</div>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          {[
            { icon: <FileText size={12} />, label: `${qCount} questions` },
            { icon: <Target size={12} />, label: `${totalPts} pts` },
            { icon: <Clock size={12} />, label: quiz.time_limit_minutes ? `${quiz.time_limit_minutes}min` : "No limit" },
            { icon: <Award size={12} />, label: `${quiz.attempts_allowed} attempt${quiz.attempts_allowed !== 1 ? "s" : ""}` },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
              {s.icon} {s.label}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          {isTeacher ? (
            <>
              <button onClick={onEdit}
                style={{ flex: 1, padding: "9px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--text)", fontFamily: "inherit" }}>
                <Pencil size={13} /> Edit
              </button>
              <button onClick={onDelete}
                style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--danger)" }}>
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <button onClick={onTake} disabled={quiz.status !== "published"}
              style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: quiz.status === "published" ? `linear-gradient(135deg,${color},${color}cc)` : "var(--bg2)", color: quiz.status === "published" ? "white" : "var(--muted)", cursor: quiz.status === "published" ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit", boxShadow: quiz.status === "published" ? `0 4px 12px ${color}40` : "none" }}>
              <Zap size={14} /> {quiz.status === "published" ? "Take Quiz" : "Not Available"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────
export default function QuizzesPage() {
  const { isTeacher, isAdmin, isLearner } = useAuth()
  const queryClient = useQueryClient()
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null)
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [showAIGen, setShowAIGen] = useState(false)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const res = await api.get(endpoints.quizzes.list)
      return Array.isArray(res.data) ? res.data as Quiz[] : []
    },
    staleTime: 0,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(endpoints.quizzes.detail(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
  })

  const filtered = quizzes.filter(q => {
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || q.status === filterStatus
    const matchType = filterType === "all" || q.assessment_type === filterType
    return matchSearch && matchStatus && matchType
  })

  const stats = {
    total: quizzes.length,
    published: quizzes.filter(q => q.status === "published").length,
    draft: quizzes.filter(q => q.status === "draft").length,
    totalQuestions: quizzes.reduce((s, q) => s + (q.questions?.length ?? 0), 0),
  }

  if (takingQuiz) return <QuizTaker quiz={takingQuiz} onClose={() => setTakingQuiz(null)} />
  if (showBuilder || editingQuiz) return (
    <QuizBuilder
      quiz={editingQuiz ?? undefined}
      onClose={() => { setShowBuilder(false); setEditingQuiz(null); queryClient.invalidateQueries({ queryKey: ["quizzes"] }) }}
    />
  )

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "12px 12px 80px" : "20px 20px 48px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
              <Brain size={isMobile ? 20 : 24} style={{ color: "var(--accent)" }} /> Quizzes
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              {stats.total} quiz{stats.total !== 1 ? "zes" : ""} · {stats.published} published · {stats.totalQuestions} questions
            </p>
          </div>
          {(isTeacher || isAdmin) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setShowAIGen(true)}
                style={{ padding: isMobile ? "9px 14px" : "10px 18px", borderRadius: 10, border: "1px solid rgba(203,38,228,0.3)", background: "rgba(203,38,228,0.08)", color: "var(--accent)", cursor: "pointer", fontWeight: 700, fontSize: isMobile ? 12 : 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}>
                <Sparkles size={14} /> AI Generate
              </button>
              <button onClick={() => setShowBuilder(true)}
                style={{ padding: isMobile ? "9px 14px" : "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", cursor: "pointer", fontWeight: 700, fontSize: isMobile ? 12 : 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(203,38,228,0.35)" }}>
                <Plus size={14} /> New Quiz
              </button>
            </div>
          )}
        </div>

        {/* Stats row - teacher only */}
        {(isTeacher || isAdmin) && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
            {[
              { label: "Total Quizzes", value: stats.total, color: "#cb26e4", icon: <Brain size={16} /> },
              { label: "Published", value: stats.published, color: "#22c55e", icon: <CheckCircle2 size={16} /> },
              { label: "Drafts", value: stats.draft, color: "#f59e0b", icon: <AlertCircle size={16} /> },
              { label: "Questions", value: stats.totalQuestions, color: "#38bdf8", icon: <FileText size={16} /> },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--card)", borderRadius: 14, padding: "14px 16px", border: "1px solid var(--border)", borderLeft: `3px solid ${s.color}`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)" }}>
            <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quizzes..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 14, color: "var(--text)", width: "100%", fontFamily: "inherit" }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
            <option value="all">All Types</option>
            <option value="quiz">Quiz</option>
            <option value="test">Test</option>
            <option value="exam">Exam</option>
            <option value="assignment">Assignment</option>
          </select>
        </div>

        {/* Quiz Grid */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Loading quizzes...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 56, background: "var(--card)", borderRadius: 20, border: "1px solid var(--border)" }}>
            <Brain size={48} style={{ color: "var(--muted)", opacity: 0.3, marginBottom: 16 }} />
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              {search || filterStatus !== "all" || filterType !== "all" ? "No quizzes match" : "No quizzes yet"}
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
              {(isTeacher || isAdmin) ? "Create your first quiz or use AI to generate one from your lesson content." : "No quizzes available yet. Check back later."}
            </div>
            {(isTeacher || isAdmin) && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => setShowAIGen(true)}
                  style={{ padding: "11px 20px", borderRadius: 10, border: "1px solid rgba(203,38,228,0.3)", background: "rgba(203,38,228,0.08)", color: "var(--accent)", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={15} /> Generate with AI
                </button>
                <button onClick={() => setShowBuilder(true)}
                  style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                  <Plus size={15} /> Create Manually
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {filtered.map(quiz => (
              <QuizCard key={quiz.id} quiz={quiz}
                isTeacher={isTeacher || isAdmin}
                isMobile={isMobile}
                onTake={() => setTakingQuiz(quiz)}
                onEdit={() => setEditingQuiz(quiz)}
                onDelete={() => { if (confirm(`Delete "${quiz.title}"?`)) deleteMutation.mutate(quiz.id) }}
              />
            ))}
          </div>
        )}
      </div>

      {/* AI Generator Modal */}
      {showAIGen && (
        <AIGeneratorModal
          onClose={() => setShowAIGen(false)}
          onGenerated={(quiz) => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] })
            setEditingQuiz(quiz)
          }}
        />
      )}
    </AppShell>
  )
}