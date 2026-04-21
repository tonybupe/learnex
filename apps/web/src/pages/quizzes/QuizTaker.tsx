import { useState, useEffect, useRef, useCallback } from "react"
import { api } from "@/api/client"
import { useMutation } from "@tanstack/react-query"
import type { Quiz, QuizQuestion, QuizOption } from "./QuizzesPage"
import {
  ArrowLeft, ArrowRight, CheckCircle2, XCircle, Clock,
  Send, Brain, Award, AlertCircle, Star, Target,
  ChevronRight, Sparkles, BookOpen
} from "lucide-react"

interface Answer {
  question_id: number
  selected_option_id?: number
  answer_text?: string
}

interface AttemptResult {
  id: number; score: number; max_score: number; percentage: number
  status: string; attempt_number: number
}

interface QuizTakerProps { quiz: Quiz; onClose: () => void }

function ProgressBar({ current, total, color = "var(--accent)" }: { current: number; total: number; color?: string }) {
  return (
    <div style={{ height: 6, borderRadius: 999, background: "var(--bg2)", overflow: "hidden" }}>
      <div style={{ width: `${(current / total) * 100}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.4s ease" }} />
    </div>
  )
}

function ScoreRing({ percentage, size = 120 }: { percentage: number; size?: number }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const offset = circ - (percentage / 100) * circ
  const color = percentage >= 75 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#ef4444"
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg2)" strokeWidth={size*0.08} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.08}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontWeight: 900, fontSize: size * 0.22, color, lineHeight: 1 }}>{Math.round(percentage)}%</span>
        <span style={{ fontSize: size * 0.1, color: "var(--muted)", fontWeight: 600 }}>Score</span>
      </div>
    </div>
  )
}

export default function QuizTaker({ quiz, onClose }: QuizTakerProps) {
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [phase, setPhase] = useState<"start" | "quiz" | "submitted" | "results">("start")
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null)
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  // Timer
  useEffect(() => {
    if (phase !== "quiz" || timeLeft === null) return
    if (timeLeft <= 0) { handleSubmit(); return }
    timerRef.current = setInterval(() => setTimeLeft(t => (t ?? 1) - 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, timeLeft])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/quizzes/${quiz.id}/start`)
      return res.data
    },
    onSuccess: (data) => {
      setAttemptId(data.attempt_id)
      setPhase("quiz")
    }
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!attemptId) throw new Error("No attempt")
      const payload = {
        answers: Object.values(answers).map(a => ({
          question_id: a.question_id,
          selected_option_id: a.selected_option_id ?? null,
          answer_text: a.answer_text ?? null,
        }))
      }
      const res = await api.post(`/quizzes/${quiz.id}/attempts/${attemptId}/submit`, payload)
      return res.data as AttemptResult
    },
    onSuccess: (data) => {
      setResult(data)
      setPhase("results")
      if (timerRef.current) clearInterval(timerRef.current)
    }
  })

  const handleSubmit = useCallback(() => {
    setPhase("submitted")
    submitMutation.mutate()
  }, [submitMutation])

  const questions = quiz.questions?.slice().sort((a, b) => a.order_index - b.order_index) ?? []
  const currentQ = questions[currentIdx]
  const answeredCount = Object.keys(answers).length
  const isAnswered = currentQ ? !!answers[currentQ.id] : false

  const setAnswer = (questionId: number, update: Partial<Answer>) => {
    setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], question_id: questionId, ...update } }))
  }

  const scoreColor = result ? (result.percentage >= 75 ? "#22c55e" : result.percentage >= 50 ? "#f59e0b" : "#ef4444") : "var(--accent)"
  const scoreLabel = result ? (result.percentage >= 75 ? "Excellent! 🎉" : result.percentage >= 50 ? "Good effort! 👍" : "Keep practicing! 💪") : ""

  // ── START SCREEN ──
  if (phase === "start") return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card)", borderRadius: 24, width: "100%", maxWidth: 480, border: "1px solid var(--border)", overflow: "hidden" }}>
        {/* Gradient header */}
        <div style={{ background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", padding: "32px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📝</div>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: 22, margin: "0 0 8px" }}>{quiz.title}</h2>
          {quiz.description && <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, margin: 0 }}>{quiz.description}</p>}
        </div>

        <div style={{ padding: 24 }}>
          {/* Quiz info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[
              { icon: <BookOpen size={16} />, label: "Questions", value: String(questions.length), color: "#cb26e4" },
              { icon: <Target size={16} />, label: "Total Points", value: String(questions.reduce((s, q) => s + q.points, 0)), color: "#38bdf8" },
              { icon: <Clock size={16} />, label: "Time Limit", value: quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : "Unlimited", color: "#22c55e" },
              { icon: <Star size={16} />, label: "Attempts", value: String(quiz.attempts_allowed), color: "#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ color: s.color, flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Question types breakdown */}
          <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(203,38,228,0.06)", border: "1px solid rgba(203,38,228,0.15)", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Question Types</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {Object.entries(
                questions.reduce((acc, q) => ({ ...acc, [q.question_type]: (acc[q.question_type] ?? 0) + 1 }), {} as Record<string, number>)
              ).map(([type, count]) => (
                <span key={type} style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                  {type === "single_choice" ? "🔘" : type === "true_false" ? "✅" : type === "short_text" ? "✏️" : "📝"} {count} {type.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>

          {startMutation.isError && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
              {(startMutation.error as any)?.response?.data?.detail ?? "Failed to start quiz"}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", color: "var(--text)" }}>
              Cancel
            </button>
            <button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}
              style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(203,38,228,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {startMutation.isPending ? "Starting..." : <><Sparkles size={15} /> Start Quiz</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── SUBMITTING ──
  if (phase === "submitted") return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <Brain size={36} style={{ color: "white" }} />
        </div>
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>Submitting Quiz...</div>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>{quiz.is_auto_marked ? "AI is marking your answers..." : "Sending to your teacher for review..."}</div>
      </div>
    </div>
  )

  // ── RESULTS ──
  if (phase === "results" && result) return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 600, overflowY: "auto" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: isMobile ? "20px 16px 80px" : "40px 20px" }}>

        {/* Result header */}
        <div style={{ background: "var(--card)", borderRadius: 24, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 16 }}>
          <div style={{ background: `linear-gradient(135deg, ${scoreColor}20, ${scoreColor}08)`, padding: "32px 24px", textAlign: "center", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{result.percentage >= 75 ? "🎉" : result.percentage >= 50 ? "👍" : "💪"}</div>
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 4, color: "var(--text)" }}>{scoreLabel}</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>{quiz.title}</div>
          </div>

          <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 20 : 32, flexWrap: "wrap" }}>
            <ScoreRing percentage={result.percentage} size={isMobile ? 100 : 120} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Score", value: `${result.score} / ${result.max_score}`, color: scoreColor },
                { label: "Percentage", value: `${Math.round(result.percentage)}%`, color: scoreColor },
                { label: "Status", value: result.status === "graded" ? "Auto Graded" : "Pending Review", color: result.status === "graded" ? "#22c55e" : "#f59e0b" },
                { label: "Attempt", value: `#${result.attempt_number}`, color: "var(--text)" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Per-question review */}
        <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: isMobile ? 16 : 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen size={16} style={{ color: "var(--accent)" }} /> Question Review
          </div>
          {questions.map((q, i) => {
            const ans = answers[q.id]
            const selectedOpt = q.options?.find(o => o.id === ans?.selected_option_id)
            const isCorrect = selectedOpt?.is_correct
            const isText = q.question_type === "short_text"

            return (
              <div key={q.id} style={{ padding: "14px 0", borderBottom: i < questions.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: isText ? "rgba(139,92,246,0.12)" : isCorrect ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    {isText ? <Brain size={12} style={{ color: "#8b5cf6" }} /> : isCorrect ? <CheckCircle2 size={12} style={{ color: "#22c55e" }} /> : <XCircle size={12} style={{ color: "#ef4444" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Q{i + 1}. {q.question_text}</div>
                    {!isText && selectedOpt && (
                      <div style={{ fontSize: 12, color: isCorrect ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                        Your answer: {selectedOpt.option_text}
                      </div>
                    )}
                    {!isText && !selectedOpt && (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Not answered</div>
                    )}
                    {isText && ans?.answer_text && (
                      <div style={{ fontSize: 12, color: "#8b5cf6", fontWeight: 600 }}>
                        Your answer: {ans.answer_text}
                      </div>
                    )}
                    {!isText && !isCorrect && q.options?.find(o => o.is_correct) && (
                      <div style={{ fontSize: 12, color: "#22c55e", marginTop: 2 }}>
                        ✓ Correct: {q.options.find(o => o.is_correct)?.option_text}
                      </div>
                    )}
                    {isText && (
                      <div style={{ fontSize: 11, color: "#8b5cf6", marginTop: 4, fontStyle: "italic" }}>
                        {result.status === "graded" ? "AI graded" : "Pending teacher review"}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: isText ? "#8b5cf6" : isCorrect ? "#22c55e" : "#ef4444", flexShrink: 0 }}>
                    {isText ? `${q.points}pts` : isCorrect ? `+${q.points}` : "0"}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={onClose}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(203,38,228,0.35)" }}>
          Done
        </button>
      </div>
    </div>
  )

  // ── QUIZ TAKING ──
  if (phase === "quiz" && currentQ) return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 600, display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <button onClick={() => { if (confirm("Exit quiz? Your progress will be lost.")) onClose() }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 4 }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{quiz.title}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Question {currentIdx + 1} of {questions.length} · {answeredCount} answered</div>
          </div>
          {timeLeft !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: timeLeft < 60 ? "rgba(239,68,68,0.1)" : "var(--bg2)", border: `1px solid ${timeLeft < 60 ? "rgba(239,68,68,0.3)" : "var(--border)"}` }}>
              <Clock size={13} style={{ color: timeLeft < 60 ? "var(--danger)" : "var(--muted)" }} />
              <span style={{ fontWeight: 800, fontSize: 13, color: timeLeft < 60 ? "var(--danger)" : "var(--text)" }}>{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
        <ProgressBar current={currentIdx + 1} total={questions.length} />
      </div>

      {/* Question */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 16px" : "28px 24px" }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>

          {/* Question header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ padding: "4px 12px", borderRadius: 20, background: "var(--accent)", color: "white", fontWeight: 800, fontSize: 12 }}>
              Q{currentIdx + 1}
            </span>
            <span style={{ padding: "4px 12px", borderRadius: 20, background: "var(--bg2)", border: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
              {currentQ.question_type === "single_choice" ? "🔘 Multiple Choice"
                : currentQ.question_type === "true_false" ? "✅ True / False"
                : currentQ.question_type === "multiple_choice" ? "☑️ Multi-Select"
                : "✏️ Short Answer"}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{currentQ.points} pt{currentQ.points !== 1 ? "s" : ""}</span>
          </div>

          <div style={{ fontWeight: 800, fontSize: isMobile ? 17 : 20, lineHeight: 1.5, marginBottom: 24, color: "var(--text)" }}>
            {currentQ.question_text}
          </div>

          {/* Options */}
          {(currentQ.question_type === "single_choice" || currentQ.question_type === "true_false" || currentQ.question_type === "multiple_choice") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {currentQ.options?.map((opt, oi) => {
                const isSelected = answers[currentQ.id]?.selected_option_id === opt.id
                const letters = ["A", "B", "C", "D", "E"]
                return (
                  <button key={opt.id} onClick={() => setAnswer(currentQ.id, { selected_option_id: opt.id })}
                    style={{
                      display: "flex", alignItems: "center", gap: 14, padding: isMobile ? "14px 16px" : "16px 18px",
                      borderRadius: 14, border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                      background: isSelected ? "rgba(203,38,228,0.08)" : "var(--card)",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                      transition: "all 0.15s", transform: isSelected ? "scale(1.01)" : "none",
                    }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: isSelected ? "var(--accent)" : "var(--bg2)", border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: isSelected ? "white" : "var(--muted)", flexShrink: 0, transition: "all 0.15s" }}>
                      {letters[oi] ?? oi + 1}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: isSelected ? 700 : 500, color: isSelected ? "var(--accent)" : "var(--text)", flex: 1 }}>
                      {opt.option_text}
                    </span>
                    {isSelected && <CheckCircle2 size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          )}

          {/* Short text */}
          {currentQ.question_type === "short_text" && (
            <div>
              <textarea
                value={answers[currentQ.id]?.answer_text ?? ""}
                onChange={e => setAnswer(currentQ.id, { answer_text: e.target.value })}
                placeholder="Write your answer here..."
                rows={6}
                style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: `2px solid ${answers[currentQ.id]?.answer_text ? "var(--accent)" : "var(--border)"}`, background: "var(--card)", color: "var(--text)", fontSize: 15, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6, transition: "border-color 0.15s" }} />
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <Brain size={11} style={{ color: "#8b5cf6" }} />
                {quiz.is_auto_marked ? "This answer will be AI graded" : "This answer will be reviewed by your teacher"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ background: "var(--card)", borderTop: "1px solid var(--border)", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ maxWidth: 660, margin: "0 auto", display: "flex", gap: 10 }}>
          <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
            style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", cursor: currentIdx === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: currentIdx === 0 ? "var(--muted)" : "var(--text)", flexShrink: 0 }}>
            <ArrowLeft size={18} />
          </button>

          {/* Question dots */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, overflowX: "auto", scrollbarWidth: "none" as const, padding: "0 4px" }}>
            {questions.map((q, i) => (
              <button key={q.id} onClick={() => setCurrentIdx(i)}
                style={{ width: i === currentIdx ? 24 : 10, height: 10, borderRadius: 999, border: "none", background: i === currentIdx ? "var(--accent)" : answers[q.id] ? "#22c55e" : "var(--border)", cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }} />
            ))}
          </div>

          {currentIdx < questions.length - 1 ? (
            <button onClick={() => setCurrentIdx(i => i + 1)}
              style={{ padding: "0 20px", height: 44, borderRadius: 10, border: "none", background: isAnswered ? "var(--accent)" : "var(--bg2)", color: isAnswered ? "white" : "var(--muted)", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, transition: "all 0.15s" }}>
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitMutation.isPending}
              style={{ padding: "0 20px", height: 44, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, boxShadow: "0 4px 12px rgba(203,38,228,0.35)" }}>
              <Send size={15} /> Submit
            </button>
          )}
        </div>

        {/* Answered count */}
        <div style={{ maxWidth: 660, margin: "8px auto 0", textAlign: "center", fontSize: 11, color: "var(--muted)" }}>
          {answeredCount} of {questions.length} answered
          {answeredCount < questions.length && currentIdx === questions.length - 1 && (
            <span style={{ color: "#f59e0b", fontWeight: 600 }}> · {questions.length - answeredCount} unanswered</span>
          )}
        </div>
      </div>
    </div>
  )

  return null
}