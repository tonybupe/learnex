import { useState, useEffect } from "react"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Quiz } from "./QuizzesPage"
import {
  ArrowLeft, Brain, Users, Target, Award, CheckCircle2,
  XCircle, Clock, ChevronDown, ChevronUp, Sparkles,
  BarChart2, Star, AlertCircle, Eye, Download, Filter,
  TrendingUp, TrendingDown, Minus, BookOpen
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts"

interface Attempt {
  id: number; learner_id: number; quiz_id: number
  status: string; score: number; max_score: number
  percentage: number; attempt_number: number
  started_at: string; submitted_at: string; created_at: string
}

interface Answer {
  id: number; question_id: number; selected_option_id?: number
  answer_text?: string; is_correct?: boolean; points_awarded: number
}

// ── Helpers ──
function ScoreRing({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444"
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg2)" strokeWidth={size*0.09} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.09}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontWeight: 900, fontSize: size * 0.2, color, lineHeight: 1 }}>{Math.round(pct)}%</span>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: 14, padding: "14px 16px", border: "1px solid var(--border)", borderLeft: `3px solid ${color}`, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Main Component ──
export default function QuizAnalytics({ quiz, onClose }: { quiz: Quiz; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "learners" | "questions" | "review">("overview")
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null)
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768)
  const [filterStatus, setFilterStatus] = useState("all")
  const queryClient = useQueryClient()

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  // Fetch all attempts for this quiz
  const { data: attempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ["quiz-attempts", quiz.id],
    queryFn: async () => {
      const res = await api.get(`/quizzes/${quiz.id}/attempts`)
      return Array.isArray(res.data) ? res.data as Attempt[] : []
    },
    staleTime: 30000,
  })

  // Fetch learners who attempted
  const learnerIds = [...new Set(attempts.map(a => a.learner_id))]
  const { data: learnersMap = {} } = useQuery({
    queryKey: ["attempt-learners", quiz.id, learnerIds.join(",")],
    queryFn: async () => {
      if (learnerIds.length === 0) return {}
      const map: Record<number, string> = {}
      await Promise.all(learnerIds.map(async (id) => {
        try {
          const res = await api.get(`/users/${id}`)
          map[id] = res.data.full_name ?? `Learner #${id}`
        } catch { map[id] = `Learner #${id}` }
      }))
      return map
    },
    enabled: learnerIds.length > 0,
    staleTime: 300000,
  })
  const getLearnerName = (id: number) => (learnersMap as Record<number, string>)[id] ?? `Learner #${id}`

  // Fetch answers for selected attempt
  const { data: attemptAnswers = [] } = useQuery({
    queryKey: ["attempt-answers", selectedAttempt?.id],
    queryFn: async () => {
      const res = await api.get(`/quizzes/${quiz.id}/attempts/${selectedAttempt!.id}/answers`)
      return Array.isArray(res.data) ? res.data as Answer[] : []
    },
    enabled: !!selectedAttempt,
  })

  // AI grade mutation
  const aiGradeMutation = useMutation({
    mutationFn: async (attemptId: number) => {
      const res = await api.post(`/quizzes/${quiz.id}/attempts/${attemptId}/ai-grade`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-attempts", quiz.id] })
    }
  })

  // ── Computed stats ──
  const graded = attempts.filter(a => a.status === "graded")
  const submitted = attempts.filter(a => a.status === "submitted")
  const avgScore = graded.length > 0 ? Math.round(graded.reduce((s, a) => s + a.percentage, 0) / graded.length) : 0
  const passRate = graded.length > 0 ? Math.round(graded.filter(a => a.percentage >= 50).length / graded.length * 100) : 0
  const highScore = graded.length > 0 ? Math.max(...graded.map(a => a.percentage)) : 0
  const lowScore = graded.length > 0 ? Math.min(...graded.map(a => a.percentage)) : 0

  // Score distribution for chart
  const scoreDist = [
    { range: "0-20%", count: graded.filter(a => a.percentage < 20).length, color: "#ef4444" },
    { range: "20-40%", count: graded.filter(a => a.percentage >= 20 && a.percentage < 40).length, color: "#f97316" },
    { range: "40-60%", count: graded.filter(a => a.percentage >= 40 && a.percentage < 60).length, color: "#f59e0b" },
    { range: "60-80%", count: graded.filter(a => a.percentage >= 60 && a.percentage < 80).length, color: "#84cc16" },
    { range: "80-100%", count: graded.filter(a => a.percentage >= 80).length, color: "#22c55e" },
  ]

  // Question difficulty analysis
  const questionStats = quiz.questions.map(q => {
    const relatedAnswers = attemptAnswers.filter(a => a.question_id === q.id)
    const correct = relatedAnswers.filter(a => a.is_correct === true).length
    const total = relatedAnswers.length
    return {
      ...q,
      correctRate: total > 0 ? Math.round((correct / total) * 100) : null,
      totalAnswers: total,
      difficulty: total === 0 ? "unknown" : correct / total >= 0.7 ? "easy" : correct / total >= 0.4 ? "medium" : "hard"
    }
  })

  const filtered = attempts.filter(a => filterStatus === "all" || a.status === filterStatus)

  const TABS = [
    { key: "overview", label: isMobile ? "📊" : "📊 Overview" },
    { key: "learners", label: isMobile ? "👤" : "👤 Learners" },
    { key: "questions", label: isMobile ? "❓" : "❓ Questions" },
    { key: "review", label: isMobile ? "✏️" : "✏️ Review" },
  ]

  const scoreColor = (pct: number) => pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444"

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 500, overflowY: "auto" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "0 0 80px" : "0 20px 48px" }}>

        {/* Header */}
        <div style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", padding: isMobile ? "14px 16px" : "16px 20px", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", display: "flex", padding: 4 }}>
              <ArrowLeft size={20} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: isMobile ? 16 : 18, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{quiz.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{attempts.length} attempts · {graded.length} graded · {submitted.length} pending review</div>
            </div>
            {submitted.length > 0 && (
              <button onClick={() => submitted.forEach(a => aiGradeMutation.mutate(a.id))}
                disabled={aiGradeMutation.isPending}
                style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(203,38,228,0.3)", background: "rgba(203,38,228,0.08)", color: "var(--accent)", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={13} /> {aiGradeMutation.isPending ? "Grading..." : `AI Grade ${submitted.length}`}
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: isMobile ? "16px 12px" : "20px 0" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", scrollbarWidth: "none" as const }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key as any)}
                style={{ padding: isMobile ? "8px 14px" : "9px 18px", borderRadius: 24, border: `1.5px solid ${activeTab === t.key ? "var(--accent)" : "var(--border)"}`, background: activeTab === t.key ? "var(--accent)" : "var(--card)", color: activeTab === t.key ? "white" : "var(--muted)", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", fontFamily: "inherit", flexShrink: 0 }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
                <StatCard label="Total Attempts" value={attempts.length} icon={<Users size={16} />} color="#cb26e4" sub={`${graded.length} graded`} />
                <StatCard label="Average Score" value={`${avgScore}%`} icon={<Target size={16} />} color="#38bdf8" sub={`Pass rate ${passRate}%`} />
                <StatCard label="Highest Score" value={`${Math.round(highScore)}%`} icon={<Award size={16} />} color="#22c55e" />
                <StatCard label="Lowest Score" value={`${Math.round(lowScore)}%`} icon={<AlertCircle size={16} />} color="#f59e0b" />
              </div>

              {/* Charts */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 16 }}>
                {/* Score distribution */}
                <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: 18 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <BarChart2 size={15} style={{ color: "var(--accent)" }} /> Score Distribution
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={scoreDist} barSize={28}>
                      <XAxis dataKey="range" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {scoreDist.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Status breakdown */}
                <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: 18 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <Target size={15} style={{ color: "var(--accent)" }} /> Status Breakdown
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Graded", count: graded.length, color: "#22c55e" },
                      { label: "Pending Review", count: submitted.length, color: "#f59e0b" },
                      { label: "In Progress", count: attempts.filter(a => a.status === "in_progress").length, color: "#38bdf8" },
                    ].map(s => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s.label}</span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: s.color }}>{s.count}</span>
                      </div>
                    ))}
                  </div>

                  {attempts.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>Overall Progress</div>
                      <div style={{ height: 8, borderRadius: 999, background: "var(--bg2)", overflow: "hidden" }}>
                        <div style={{ width: `${(graded.length / attempts.length) * 100}%`, height: "100%", background: "#22c55e", borderRadius: 999, transition: "width 0.5s ease" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{Math.round((graded.length / attempts.length) * 100)}% graded</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Grade bands */}
              <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: 18 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Star size={15} style={{ color: "var(--accent)" }} /> Grade Bands
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,1fr)", gap: 10 }}>
                  {[
                    { grade: "A", range: "80-100%", count: graded.filter(a => a.percentage >= 80).length, color: "#22c55e" },
                    { grade: "B", range: "65-79%", count: graded.filter(a => a.percentage >= 65 && a.percentage < 80).length, color: "#84cc16" },
                    { grade: "C", range: "50-64%", count: graded.filter(a => a.percentage >= 50 && a.percentage < 65).length, color: "#f59e0b" },
                    { grade: "D", range: "35-49%", count: graded.filter(a => a.percentage >= 35 && a.percentage < 50).length, color: "#f97316" },
                    { grade: "F", range: "0-34%", count: graded.filter(a => a.percentage < 35).length, color: "#ef4444" },
                  ].map(g => (
                    <div key={g.grade} style={{ textAlign: "center", padding: "14px 10px", borderRadius: 12, background: `${g.color}10`, border: `1px solid ${g.color}25` }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: g.color }}>{g.grade}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>{g.count}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{g.range}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── LEARNERS TAB ── */}
          {activeTab === "learners" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Filter */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{filtered.length} attempt{filtered.length !== 1 ? "s" : ""}</div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {["all", "graded", "submitted", "in_progress"].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${filterStatus === s ? "var(--accent)" : "var(--border)"}`, background: filterStatus === s ? "var(--accent)" : "var(--bg2)", color: filterStatus === s ? "white" : "var(--muted)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {attemptsLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
                  <div className="spinner" style={{ margin: "0 auto 12px" }} />Loading attempts...
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)" }}>
                  <Users size={40} style={{ color: "var(--muted)", opacity: 0.3, marginBottom: 12 }} />
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No attempts yet</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>Learners haven't attempted this quiz yet</div>
                </div>
              ) : (
                <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
                  {/* Table header */}
                  {!isMobile && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 120px 100px", gap: 12, padding: "12px 20px", background: "var(--bg2)", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <span>Learner</span>
                      <span style={{ textAlign: "center" }}>Score</span>
                      <span style={{ textAlign: "center" }}>%</span>
                      <span style={{ textAlign: "center" }}>Status</span>
                      <span style={{ textAlign: "center" }}>Submitted</span>
                      <span style={{ textAlign: "center" }}>Actions</span>
                    </div>
                  )}
                  {filtered.map((attempt, i) => {
                    const color = scoreColor(attempt.percentage)
                    return (
                      <div key={attempt.id} style={{ display: isMobile ? "flex" : "grid", gridTemplateColumns: "1fr 100px 100px 100px 120px 100px", gap: isMobile ? 12 : 12, padding: isMobile ? "14px 16px" : "14px 20px", borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
                        {isMobile ? (
                          <>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>Attempt #{attempt.attempt_number}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : "In progress"}</div>
                            </div>
                            <ScoreRing pct={attempt.percentage} size={52} />
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => { setSelectedAttempt(attempt); setActiveTab("review") }}
                                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", color: "var(--text)" }}>
                                <Eye size={12} />
                              </button>
                              {attempt.status === "submitted" && (
                                <button onClick={() => aiGradeMutation.mutate(attempt.id)}
                                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(203,38,228,0.3)", background: "rgba(203,38,228,0.08)", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", color: "var(--accent)" }}>
                                  <Sparkles size={12} />
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{getLearnerName(attempt.learner_id)}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>Attempt #{attempt.attempt_number}</div>
                            </div>
                            <div style={{ textAlign: "center", fontWeight: 800, fontSize: 14, color }}>
                              {attempt.score ?? 0}/{attempt.max_score ?? quiz.questions.reduce((s, q) => s + q.points, 0)}
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <ScoreRing pct={attempt.percentage ?? 0} size={48} />
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: attempt.status === "graded" ? "rgba(34,197,94,0.1)" : attempt.status === "submitted" ? "rgba(245,158,11,0.1)" : "rgba(56,189,248,0.1)", color: attempt.status === "graded" ? "#22c55e" : attempt.status === "submitted" ? "#f59e0b" : "#38bdf8" }}>
                                {attempt.status}
                              </span>
                            </div>
                            <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
                              {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                            </div>
                            <div style={{ textAlign: "center", display: "flex", gap: 6, justifyContent: "center" }}>
                              <button onClick={() => { setSelectedAttempt(attempt); setActiveTab("review") }}
                                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
                                <Eye size={11} /> View
                              </button>
                              {attempt.status === "submitted" && (
                                <button onClick={() => aiGradeMutation.mutate(attempt.id)} disabled={aiGradeMutation.isPending}
                                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(203,38,228,0.3)", background: "rgba(203,38,228,0.08)", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}>
                                  <Sparkles size={11} /> Grade
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── QUESTIONS TAB ── */}
          {activeTab === "questions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--muted)" }}>
                Question-by-question difficulty analysis based on {graded.length} graded attempts
              </div>
              {quiz.questions.map((q, i) => {
                const qs = questionStats[i]
                const diffColor = qs.difficulty === "easy" ? "#22c55e" : qs.difficulty === "medium" ? "#f59e0b" : qs.difficulty === "hard" ? "#ef4444" : "var(--muted)"
                return (
                  <div key={q.id} style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${diffColor}15`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: diffColor, flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, lineHeight: 1.4 }}>{q.question_text}</div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
                            {q.question_type === "single_choice" ? "🔘 MCQ" : q.question_type === "true_false" ? "✅ T/F" : "✏️ Short Answer"}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>{q.points} pts</span>
                          {qs.correctRate !== null && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: diffColor, padding: "2px 8px", borderRadius: 20, background: `${diffColor}12`, border: `1px solid ${diffColor}25` }}>
                              {qs.difficulty === "easy" ? "🟢 Easy" : qs.difficulty === "medium" ? "🟡 Medium" : "🔴 Hard"}
                            </span>
                          )}
                        </div>
                        {qs.correctRate !== null ? (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                              <span style={{ color: "var(--muted)", fontWeight: 600 }}>Correct rate</span>
                              <span style={{ fontWeight: 800, color: diffColor }}>{qs.correctRate}% ({qs.totalAnswers} responses)</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 999, background: "var(--bg2)", overflow: "hidden" }}>
                              <div style={{ width: `${qs.correctRate}%`, height: "100%", background: diffColor, borderRadius: 999, transition: "width 0.6s ease" }} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>No responses yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── REVIEW TAB ── */}
          {activeTab === "review" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {!selectedAttempt ? (
                <>
                  <div style={{ fontSize: 14, color: "var(--muted)", fontWeight: 600 }}>
                    Select an attempt to review answers
                  </div>
                  {attempts.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 48, background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)" }}>
                      <BookOpen size={40} style={{ color: "var(--muted)", opacity: 0.3, marginBottom: 12 }} />
                      <div style={{ fontWeight: 700 }}>No attempts to review</div>
                    </div>
                  ) : attempts.map((attempt, i) => (
                    <button key={attempt.id} onClick={() => setSelectedAttempt(attempt)}
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}>
                      <ScoreRing pct={attempt.percentage ?? 0} size={56} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>Attempt #{attempt.attempt_number} — {getLearnerName(attempt.learner_id)}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                          {attempt.submitted_at ? `Submitted ${new Date(attempt.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : "In progress"}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: attempt.status === "graded" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: attempt.status === "graded" ? "#22c55e" : "#f59e0b", border: `1px solid ${attempt.status === "graded" ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)"}` }}>
                            {attempt.status}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>{attempt.score ?? 0}/{attempt.max_score ?? 0} pts</span>
                        </div>
                      </div>
                      <ChevronDown size={18} style={{ color: "var(--muted)", transform: "rotate(-90deg)" }} />
                    </button>
                  ))}
                </>
              ) : (
                <div>
                  {/* Back to list */}
                  <button onClick={() => setSelectedAttempt(null)}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontWeight: 700, fontSize: 13, fontFamily: "inherit", marginBottom: 16, padding: 0 }}>
                    <ArrowLeft size={14} /> Back to attempts
                  </button>

                  {/* Attempt summary */}
                  <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", padding: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <ScoreRing pct={selectedAttempt.percentage ?? 0} size={80} />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 18 }}>Attempt #{selectedAttempt.attempt_number}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{getLearnerName(selectedAttempt.learner_id)}</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{selectedAttempt.score ?? 0}/{selectedAttempt.max_score ?? 0} pts</span>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>·</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(selectedAttempt.percentage) }}>{Math.round(selectedAttempt.percentage)}%</span>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>·</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: selectedAttempt.status === "graded" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: selectedAttempt.status === "graded" ? "#22c55e" : "#f59e0b" }}>
                          {selectedAttempt.status}
                        </span>
                      </div>
                    </div>
                    {selectedAttempt.status === "submitted" && (
                      <button onClick={() => aiGradeMutation.mutate(selectedAttempt.id)} disabled={aiGradeMutation.isPending}
                        style={{ marginLeft: "auto", padding: "10px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                        <Sparkles size={14} /> {aiGradeMutation.isPending ? "Grading..." : "AI Grade Now"}
                      </button>
                    )}
                  </div>

                  {/* Answers */}
                  {quiz.questions.map((q, i) => {
                    const ans = attemptAnswers.find(a => a.question_id === q.id)
                    const selectedOpt = q.options?.find(o => o.id === ans?.selected_option_id)
                    const isText = q.question_type === "short_text"

                    return (
                      <div key={q.id} style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 16, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: isText ? "rgba(139,92,246,0.12)" : ans?.is_correct === true ? "rgba(34,197,94,0.12)" : ans?.is_correct === false ? "rgba(239,68,68,0.12)" : "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {isText ? <Brain size={13} style={{ color: "#8b5cf6" }} /> : ans?.is_correct === true ? <CheckCircle2 size={13} style={{ color: "#22c55e" }} /> : ans?.is_correct === false ? <XCircle size={13} style={{ color: "#ef4444" }} /> : <AlertCircle size={13} style={{ color: "var(--muted)" }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Q{i + 1}. {q.question_text}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{q.question_type.replace("_", " ")} · {q.points} pts</div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: isText ? "#8b5cf6" : ans?.is_correct ? "#22c55e" : "#ef4444", flexShrink: 0 }}>
                            {ans?.points_awarded ?? 0}/{q.points}
                          </div>
                        </div>

                        {/* Options review */}
                        {!isText && q.options?.map(opt => (
                          <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, marginBottom: 6, background: opt.is_correct ? "rgba(34,197,94,0.08)" : ans?.selected_option_id === opt.id && !opt.is_correct ? "rgba(239,68,68,0.08)" : "var(--bg2)", border: `1px solid ${opt.is_correct ? "rgba(34,197,94,0.25)" : ans?.selected_option_id === opt.id && !opt.is_correct ? "rgba(239,68,68,0.25)" : "var(--border)"}` }}>
                            {opt.is_correct ? <CheckCircle2 size={13} style={{ color: "#22c55e", flexShrink: 0 }} /> : ans?.selected_option_id === opt.id ? <XCircle size={13} style={{ color: "#ef4444", flexShrink: 0 }} /> : <div style={{ width: 13, height: 13, flexShrink: 0 }} />}
                            <span style={{ fontSize: 13, color: opt.is_correct ? "#22c55e" : "var(--text)", fontWeight: opt.is_correct || ans?.selected_option_id === opt.id ? 700 : 400 }}>
                              {opt.option_text}
                            </span>
                            {ans?.selected_option_id === opt.id && (
                              <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: opt.is_correct ? "#22c55e" : "#ef4444" }}>
                                {opt.is_correct ? "✓ Correct" : "✗ Selected"}
                              </span>
                            )}
                          </div>
                        ))}

                        {/* Text answer */}
                        {isText && ans?.answer_text && (
                          <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg2)", border: "1px solid var(--border)", fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>
                            {ans.answer_text}
                          </div>
                        )}
                        {isText && !ans?.answer_text && (
                          <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>Not answered</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}