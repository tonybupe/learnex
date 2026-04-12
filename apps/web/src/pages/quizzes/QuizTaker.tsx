import { useState, useEffect, useCallback } from "react"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import AppShell from "@/components/layout/AppShell"
import { Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface QuizOption { id: number; option_text: string }
interface QuizQuestion {
  id: number; question_text: string; question_type: string
  points: number; order_index: number; options: QuizOption[]
}
interface Quiz {
  id: number; title: string; description?: string
  time_limit_minutes?: number; questions: QuizQuestion[]
  attempts_allowed: number; assessment_type: string
}

type Phase = "intro" | "taking" | "submitting" | "result"

interface Answer { question_id: number; selected_option_id?: number; answer_text?: string }
interface Result {
  id: number; score: number; max_score: number
  percentage: number; status: string; submitted_at: string
}

type Props = { quiz: Quiz; onExit: () => void }

export default function QuizTaker({ quiz, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>("intro")
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const questions = [...quiz.questions].sort((a, b) => a.order_index - b.order_index)
  const total = questions.length
  const current = questions[currentQ]
  const answered = Object.keys(answers).length
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0

  // Timer
  useEffect(() => {
    if (phase !== "taking" || !quiz.time_limit_minutes) return
    setTimeLeft(quiz.time_limit_minutes * 60)
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) { clearInterval(interval); handleSubmit(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0")
    const s = (secs % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const startQuiz = async () => {
    setLoading(true); setError("")
    try {
      const res = await api.post(endpoints.quizzes.start(quiz.id), {})
      setAttemptId(res.data.attempt_id)
      setPhase("taking")
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to start quiz")
    } finally { setLoading(false) }
  }

  const handleAnswer = (questionId: number, optionId?: number, text?: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { question_id: questionId, selected_option_id: optionId, answer_text: text }
    }))
  }

  const handleSubmit = useCallback(async () => {
    if (!attemptId) return
    setPhase("submitting"); setLoading(true); setError("")
    try {
      const answersList = Object.values(answers)
      const res = await api.post(endpoints.quizzes.submit(quiz.id, attemptId), { answers: answersList })
      setResult(res.data)
      setPhase("result")
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to submit quiz")
      setPhase("taking")
    } finally { setLoading(false) }
  }, [attemptId, answers, quiz.id])

  const isPassed = result && result.percentage >= 50
  const timerWarning = timeLeft !== null && timeLeft < 60

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === "intro") return (
    <AppShell>
      <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 16px" }}>
        <button className="btn" onClick={onExit} style={{ marginBottom: 24 }}>
          <ChevronLeft size={16} /> Back to Quizzes
        </button>

        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>{quiz.title}</h1>
          {quiz.description && <p style={{ color: "var(--muted)", marginBottom: 24 }}>{quiz.description}</p>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, margin: "24px 0", padding: "20px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)" }}>{total}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Questions</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent2)" }}>
                {quiz.time_limit_minutes ? `${quiz.time_limit_minutes}m` : "∞"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Time Limit</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--success)" }}>{quiz.attempts_allowed}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Attempts</div>
            </div>
          </div>

          <div style={{ background: "var(--bg2)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, textAlign: "left", fontSize: 13, color: "var(--muted)" }}>
            <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>📋 Instructions</div>
            <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 2 }}>
              <li>Read each question carefully before answering</li>
              <li>You can navigate between questions freely</li>
              {quiz.time_limit_minutes && <li>The quiz will auto-submit when time runs out</li>}
              <li>Once submitted, you cannot change your answers</li>
            </ul>
          </div>

          {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16, fontWeight: 600 }}>{error}</div>}

          {total === 0 ? (
            <div style={{ color: "var(--muted)", padding: 16 }}>This quiz has no questions yet.</div>
          ) : (
            <button className="btn btn-primary" style={{ width: "100%", padding: 14, fontSize: 15 }}
              onClick={startQuiz} disabled={loading}>
              {loading ? "Starting..." : "🚀 Start Quiz"}
            </button>
          )}
        </div>
      </div>
    </AppShell>
  )

  // ── TAKING ─────────────────────────────────────────────────────────────────
  if (phase === "taking" && current) return (
    <AppShell>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px" }}>

        {/* Top Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{quiz.title}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Question {currentQ + 1} of {total}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {timeLeft !== null && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                borderRadius: 999, fontWeight: 800, fontSize: 14,
                background: timerWarning ? "color-mix(in srgb, var(--danger) 15%, transparent)" : "var(--bg2)",
                color: timerWarning ? "var(--danger)" : "var(--text)",
                border: `1px solid ${timerWarning ? "var(--danger)" : "var(--border)"}`,
                animation: timerWarning ? "pulse 1s infinite" : "none"
              }}>
                <Clock size={14} />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ background: "var(--border)", borderRadius: 999, height: 6, marginBottom: 20, overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))", height: "100%", width: `${progress}%`, borderRadius: 999, transition: "width 0.3s" }} />
        </div>

        {/* Question Card */}
        <div className="card" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: answers[current.id] ? "var(--success)" : "var(--accent)",
              color: "white", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 14
            }}>
              {currentQ + 1}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5, marginBottom: 4 }}>{current.question_text}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{current.points} point{current.points !== 1 ? "s" : ""} · {current.question_type.replace("_", " ")}</div>
            </div>
          </div>

          {/* Options */}
          {(current.question_type === "single_choice" || current.question_type === "true_false") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {current.options.map(opt => {
                const selected = answers[current.id]?.selected_option_id === opt.id
                return (
                  <button key={opt.id}
                    onClick={() => handleAnswer(current.id, opt.id)}
                    style={{
                      padding: "14px 18px", borderRadius: 12, border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                      background: selected ? "color-mix(in srgb, var(--accent) 12%, var(--card))" : "var(--card)",
                      color: "var(--text)", cursor: "pointer", textAlign: "left", fontSize: 14,
                      fontWeight: selected ? 700 : 400, transition: "all 0.15s",
                      display: "flex", alignItems: "center", gap: 12
                    }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                      background: selected ? "var(--accent)" : "transparent", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                    </div>
                    {opt.option_text}
                  </button>
                )
              })}
            </div>
          )}

          {current.question_type === "multiple_choice" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {current.options.map(opt => {
                const selected = answers[current.id]?.selected_option_id === opt.id
                return (
                  <button key={opt.id}
                    onClick={() => handleAnswer(current.id, opt.id)}
                    style={{
                      padding: "14px 18px", borderRadius: 12, border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                      background: selected ? "color-mix(in srgb, var(--accent) 12%, var(--card))" : "var(--card)",
                      color: "var(--text)", cursor: "pointer", textAlign: "left", fontSize: 14,
                      fontWeight: selected ? 700 : 400, transition: "all 0.15s",
                      display: "flex", alignItems: "center", gap: 12
                    }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 4, border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                      background: selected ? "var(--accent)" : "transparent", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12
                    }}>
                      {selected && "✓"}
                    </div>
                    {opt.option_text}
                  </button>
                )
              })}
            </div>
          )}

          {current.question_type === "short_text" && (
            <textarea
              value={answers[current.id]?.answer_text ?? ""}
              onChange={e => handleAnswer(current.id, undefined, e.target.value)}
              placeholder="Type your answer here..."
              style={{
                width: "100%", minHeight: 100, padding: "12px 14px", borderRadius: 12,
                border: "2px solid var(--border)", background: "var(--bg2)", color: "var(--text)",
                fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none"
              }}
              onFocus={e => e.target.style.borderColor = "var(--accent)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button className="btn" onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}>
            <ChevronLeft size={16} /> Previous
          </button>

          <div style={{ display: "flex", gap: 6 }}>
            {questions.map((q, i) => (
              <button key={q.id}
                onClick={() => setCurrentQ(i)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: i === currentQ ? "var(--accent)" : answers[q.id] ? "var(--success)" : "var(--bg2)",
                  color: i === currentQ || answers[q.id] ? "white" : "var(--muted)",
                  transition: "all 0.15s"
                }}>
                {i + 1}
              </button>
            ))}
          </div>

          {currentQ < total - 1 ? (
            <button className="btn btn-primary" onClick={() => setCurrentQ(q => Math.min(total - 1, q + 1))}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button className="btn btn-primary"
              onClick={() => {
                const unanswered = total - answered
                if (unanswered > 0 && !window.confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. Submit anyway?`)) return
                handleSubmit()
              }}
              disabled={loading}>
              <CheckCircle size={16} /> {loading ? "Submitting..." : "Submit Quiz"}
            </button>
          )}
        </div>

        {/* Answer Summary */}
        <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
          {answered} of {total} questions answered
        </div>

        {error && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 12, textAlign: "center", fontWeight: 600 }}>{error}</div>}
      </div>
    </AppShell>
  )

  // ── SUBMITTING ─────────────────────────────────────────────────────────────
  if (phase === "submitting") return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
        <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
        <div style={{ fontWeight: 700, fontSize: 18 }}>Submitting your quiz...</div>
        <div style={{ color: "var(--muted)" }}>Please wait while we calculate your score</div>
      </div>
    </AppShell>
  )

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (phase === "result" && result) return (
    <AppShell>
      <div style={{ maxWidth: 560, margin: "40px auto", padding: "0 16px" }}>
        <div className="card" style={{ padding: 36, textAlign: "center" }}>

          {/* Icon */}
          <div style={{ fontSize: 64, marginBottom: 16 }}>
            {isPassed ? "🎉" : "😔"}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
            {isPassed ? "Congratulations!" : "Better luck next time!"}
          </h2>
          <p style={{ color: "var(--muted)", marginBottom: 32 }}>
            {isPassed ? "You passed the quiz successfully." : "You didn't reach the passing score. Review the material and try again."}
          </p>

          {/* Score Circle */}
          <div style={{
            width: 140, height: 140, borderRadius: "50%", margin: "0 auto 32px",
            background: `conic-gradient(${isPassed ? "var(--success)" : "var(--danger)"} ${result.percentage}%, var(--border) 0%)`,
            display: "flex", alignItems: "center", justifyContent: "center", position: "relative"
          }}>
            <div style={{
              width: 110, height: 110, borderRadius: "50%", background: "var(--card)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: isPassed ? "var(--success)" : "var(--danger)" }}>
                {Math.round(result.percentage)}%
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Score</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32, padding: "20px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{result.score}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Points Earned</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{result.max_score}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Total Points</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: isPassed ? "var(--success)" : "var(--danger)" }}>
                {isPassed ? "PASS" : "FAIL"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Result</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn" style={{ flex: 1 }} onClick={onExit}>
              ← Back to Quizzes
            </button>
            {!isPassed && (
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setPhase("intro"); setAnswers({}); setCurrentQ(0); setResult(null) }}>
                🔄 Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )

  return null
}