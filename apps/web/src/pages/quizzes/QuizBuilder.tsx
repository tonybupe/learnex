import { useState, useCallback } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQueryClient } from "@tanstack/react-query"
import type { Quiz, QuizQuestion, QuizOption } from "./QuizzesPage"
import { ChevronLeft, Plus, Trash2, GripVertical, CheckCircle, Circle, Type, List, ToggleLeft } from "lucide-react"

type QuestionType = "single_choice" | "multiple_choice" | "true_false" | "short_text"

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ReactNode }[] = [
  { value: "single_choice",   label: "Multiple Choice",  icon: <Circle size={14} /> },
  { value: "multiple_choice", label: "Checkboxes",       icon: <CheckCircle size={14} /> },
  { value: "true_false",      label: "True / False",     icon: <ToggleLeft size={14} /> },
  { value: "short_text",      label: "Short Answer",     icon: <Type size={14} /> },
]

interface DraftQuestion {
  id?: number
  question_text: string
  question_type: QuestionType
  points: number
  order_index: number
  is_required: boolean
  options: { option_text: string; is_correct: boolean }[]
  saved?: boolean
  saving?: boolean
  error?: string
}

const defaultQuestion = (index: number): DraftQuestion => ({
  question_text: "",
  question_type: "single_choice",
  points: 1,
  order_index: index + 1,
  is_required: true,
  options: [
    { option_text: "", is_correct: false },
    { option_text: "", is_correct: false },
  ],
})

type Props = { quiz: Quiz; onExit: () => void }

export default function QuizBuilder({ quiz, onExit }: Props) {
  const queryClient = useQueryClient()

  // Initialize with existing questions
  const [questions, setQuestions] = useState<DraftQuestion[]>(
    quiz.questions.length > 0
      ? quiz.questions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type as QuestionType,
          points: q.points,
          order_index: q.order_index,
          is_required: true,
          options: q.options.map(o => ({ option_text: o.option_text, is_correct: o.is_correct })),
          saved: true,
        }))
      : [defaultQuestion(0)]
  )

  const [activeIdx, setActiveIdx] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState("")

  const updateQuestion = useCallback((idx: number, updates: Partial<DraftQuestion>) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...updates, saved: false } : q))
  }, [])

  const addQuestion = useCallback(() => {
    const newQ = defaultQuestion(questions.length)
    setQuestions(prev => [...prev, newQ])
    setActiveIdx(questions.length)
  }, [questions.length])

  const removeQuestion = useCallback((idx: number) => {
    if (questions.length <= 1) return
    setQuestions(prev => prev.filter((_, i) => i !== idx))
    setActiveIdx(prev => Math.min(prev, questions.length - 2))
  }, [questions.length])

  const updateOption = useCallback((qIdx: number, oIdx: number, text: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      const options = q.options.map((o, j) => j === oIdx ? { ...o, option_text: text } : o)
      return { ...q, options, saved: false }
    }))
  }, [])

  const toggleCorrect = useCallback((qIdx: number, oIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      const isSingle = q.question_type === "single_choice" || q.question_type === "true_false"
      const options = q.options.map((o, j) => ({
        ...o,
        is_correct: isSingle ? j === oIdx : (j === oIdx ? !o.is_correct : o.is_correct)
      }))
      return { ...q, options, saved: false }
    }))
  }, [])

  const addOption = useCallback((qIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      return { ...q, options: [...q.options, { option_text: "", is_correct: false }], saved: false }
    }))
  }, [])

  const removeOption = useCallback((qIdx: number, oIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx || q.options.length <= 2) return q
      return { ...q, options: q.options.filter((_, j) => j !== oIdx), saved: false }
    }))
  }, [])

  const setTrueFalse = useCallback((qIdx: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      return { ...q, options: [{ option_text: "True", is_correct: false }, { option_text: "False", is_correct: false }], saved: false }
    }))
  }, [])

  const saveQuestion = useCallback(async (idx: number) => {
    const q = questions[idx]
    if (!q.question_text.trim()) {
      updateQuestion(idx, { error: "Question text is required" }); return
    }
    if (q.question_type !== "short_text" && q.options.every(o => !o.is_correct)) {
      updateQuestion(idx, { error: "Please mark at least one correct answer" }); return
    }
    updateQuestion(idx, { saving: true, error: undefined })
    try {
      const res = await api.post(endpoints.quizzes.questions(quiz.id), {
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        order_index: q.order_index,
        is_required: q.is_required,
        options: q.question_type === "short_text" ? [] : q.options,
      })
      updateQuestion(idx, { id: res.data.id, saved: true, saving: false })
      queryClient.invalidateQueries({ queryKey: ["quizzes"] })
    } catch (err: any) {
      updateQuestion(idx, { error: err?.response?.data?.detail || "Failed to save question", saving: false })
    }
  }, [questions, quiz.id, updateQuestion, queryClient])

  const handlePublish = async () => {
    setPublishing(true); setPublishError("")
    try {
      await api.patch(endpoints.quizzes.update(quiz.id), { status: "published" })
      queryClient.invalidateQueries({ queryKey: ["quizzes"] })
      onExit()
    } catch (err: any) {
      setPublishError(err?.response?.data?.detail || "Failed to publish")
      setPublishing(false)
    }
  }

  const savedCount = questions.filter(q => q.saved).length
  const totalPoints = questions.reduce((sum, q) => sum + (q.saved ? q.points : 0), 0)
  const active = questions[activeIdx]

  return (
    <AppShell>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px" }}>

        {/* Top Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn" onClick={onExit}><ChevronLeft size={16} /> Back</button>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{quiz.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {savedCount}/{questions.length} questions saved · {totalPoints} total points
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {publishError && <span style={{ color: "var(--danger)", fontSize: 13, alignSelf: "center" }}>{publishError}</span>}
            <button className="btn btn-primary" onClick={handlePublish} disabled={publishing || savedCount === 0}
              style={{ padding: "10px 20px" }}>
              {publishing ? "Publishing..." : "✅ Publish Quiz"}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>

          {/* Left Panel - Question List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {questions.map((q, idx) => (
              <div key={idx}
                onClick={() => setActiveIdx(idx)}
                style={{
                  padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                  border: `2px solid ${idx === activeIdx ? "var(--accent)" : "var(--border)"}`,
                  background: idx === activeIdx ? "color-mix(in srgb, var(--accent) 8%, var(--card))" : "var(--card)",
                  display: "flex", alignItems: "flex-start", gap: 10, transition: "all 0.15s"
                }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0, fontSize: 11, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: q.saved ? "var(--success)" : idx === activeIdx ? "var(--accent)" : "var(--bg2)",
                  color: q.saved || idx === activeIdx ? "white" : "var(--muted)"
                }}>
                  {q.saved ? "✓" : idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>
                    {q.question_text || `Question ${idx + 1}`}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    {QUESTION_TYPES.find(t => t.value === q.question_type)?.label} · {q.points}pt
                  </div>
                </div>
              </div>
            ))}

            <button className="btn" onClick={addQuestion}
              style={{ padding: "10px", borderStyle: "dashed", color: "var(--accent)", borderColor: "var(--accent)" }}>
              <Plus size={14} /> Add Question
            </button>
          </div>

          {/* Right Panel - Question Editor */}
          {active && (
            <div className="card" style={{ padding: 24, borderTop: `4px solid var(--accent)` }}>

              {/* Question Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {/* Type Selector */}
                  <select
                    className="audit-control select"
                    style={{ width: "auto", padding: "6px 28px 6px 10px", fontSize: 13 }}
                    value={active.question_type}
                    onChange={e => {
                      const type = e.target.value as QuestionType
                      updateQuestion(activeIdx, { question_type: type })
                      if (type === "true_false") setTrueFalse(activeIdx)
                    }}>
                    {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>

                  {/* Points */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    <span style={{ color: "var(--muted)" }}>Points:</span>
                    <input type="number" min="1" value={active.points}
                      onChange={e => updateQuestion(activeIdx, { points: Number(e.target.value) })}
                      style={{ width: 60, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 13 }} />
                  </div>
                </div>

                <button onClick={() => removeQuestion(activeIdx)} disabled={questions.length <= 1}
                  style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", padding: 6, borderRadius: 8 }}
                  title="Remove question">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Question Text */}
              <div className="form-field" style={{ marginBottom: 20 }}>
                <textarea
                  value={active.question_text}
                  onChange={e => updateQuestion(activeIdx, { question_text: e.target.value })}
                  placeholder="Type your question here..."
                  style={{
                    width: "100%", minHeight: 80, padding: "12px 14px", borderRadius: 12,
                    border: "2px solid var(--border)", background: "var(--bg2)", color: "var(--text)",
                    fontSize: 16, fontFamily: "inherit", resize: "vertical", outline: "none",
                    fontWeight: 600, lineHeight: 1.5
                  }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
              </div>

              {/* Options */}
              {active.question_type !== "short_text" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>
                    {active.question_type === "multiple_choice" ? "Check all correct answers:" : "Select the correct answer:"}
                  </div>
                  {active.options.map((opt, oIdx) => (
                    <div key={oIdx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Correct toggle */}
                      <button onClick={() => toggleCorrect(activeIdx, oIdx)}
                        style={{
                          width: active.question_type === "multiple_choice" ? 22 : 22,
                          height: active.question_type === "multiple_choice" ? 22 : 22,
                          borderRadius: active.question_type === "multiple_choice" ? 4 : "50%",
                          border: `2px solid ${opt.is_correct ? "var(--success)" : "var(--border)"}`,
                          background: opt.is_correct ? "var(--success)" : "transparent",
                          cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                        {opt.is_correct && <span style={{ color: "white", fontSize: 12, fontWeight: 800 }}>✓</span>}
                      </button>

                      {/* Option text */}
                      <input
                        value={opt.option_text}
                        onChange={e => updateOption(activeIdx, oIdx, e.target.value)}
                        placeholder={`Option ${oIdx + 1}`}
                        disabled={active.question_type === "true_false"}
                        style={{
                          flex: 1, padding: "8px 12px", borderRadius: 8,
                          border: `1px solid ${opt.is_correct ? "var(--success)" : "var(--border)"}`,
                          background: opt.is_correct ? "color-mix(in srgb, var(--success) 8%, var(--card))" : "var(--bg2)",
                          color: "var(--text)", fontSize: 14, outline: "none",
                          fontWeight: opt.is_correct ? 600 : 400
                        }}
                      />

                      {/* Remove option */}
                      {active.question_type !== "true_false" && active.options.length > 2 && (
                        <button onClick={() => removeOption(activeIdx, oIdx)}
                          style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}>
                          ×
                        </button>
                      )}
                    </div>
                  ))}

                  {active.question_type !== "true_false" && (
                    <button onClick={() => addOption(activeIdx)}
                      style={{ alignSelf: "flex-start", background: "transparent", border: "1px dashed var(--border)", borderRadius: 8, padding: "6px 14px", color: "var(--muted)", cursor: "pointer", fontSize: 13 }}>
                      + Add option
                    </button>
                  )}
                </div>
              )}

              {/* Short Answer Preview */}
              {active.question_type === "short_text" && (
                <div style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
                  📝 Learners will type their answer here...
                </div>
              )}

              {/* Error */}
              {active.error && (
                <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                  ⚠️ {active.error}
                </div>
              )}

              {/* Save Button */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="btn btn-primary" onClick={() => saveQuestion(activeIdx)}
                  disabled={active.saving}
                  style={{ padding: "10px 24px" }}>
                  {active.saving ? "Saving..." : active.saved ? "✓ Saved — Update" : "Save Question"}
                </button>
                {active.saved && (
                  <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>✓ Saved</span>
                )}
                {activeIdx < questions.length - 1 && (
                  <button className="btn" onClick={() => setActiveIdx(activeIdx + 1)} style={{ fontSize: 13 }}>
                    Next Question →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}