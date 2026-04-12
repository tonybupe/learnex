import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import type { Class, ClassMember } from "@/features/classes/types/class.types"
import { ChevronLeft, Users, BookOpen, FileText, MessageCircle, Globe, Lock, UserPlus, UserMinus } from "lucide-react"
import FeedSection from "@/pages/shared/FeedSection"

interface Lesson { id: number; title: string; content: string; lesson_type: string; status: string; created_at: string }
interface Quiz { id: number; title: string; status: string; time_limit_minutes?: number; created_at: string }

type Tab = "overview" | "lessons" | "quizzes" | "members" | "discussion"

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overview",    label: "Overview",    icon: <BookOpen size={15} /> },
  { key: "lessons",    label: "Lessons",     icon: <FileText size={15} /> },
  { key: "quizzes",    label: "Quizzes",     icon: <FileText size={15} /> },
  { key: "members",    label: "Members",     icon: <Users size={15} /> },
  { key: "discussion", label: "Discussion",  icon: <MessageCircle size={15} /> },
]

type Props = { cls: Class; onBack: () => void }

export default function ClassDetail({ cls, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("overview")
  const { isLearner, isTeacher, isAdmin, user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch lessons for this class
  const { data: lessons = [] } = useQuery({
    queryKey: ["class-lessons", cls.id],
    queryFn: async () => {
      const res = await api.get(endpoints.lessons.list)
      const all = Array.isArray(res.data) ? res.data as Lesson[] : []
      return all.filter((l: any) => l.class_id === cls.id)
    },
    enabled: tab === "lessons" || tab === "overview",
  })

  // Fetch quizzes for this class
  const { data: quizzes = [] } = useQuery({
    queryKey: ["class-quizzes", cls.id],
    queryFn: async () => {
      const res = await api.get(endpoints.quizzes.list)
      const all = Array.isArray(res.data) ? res.data as Quiz[] : []
      return all.filter((q: any) => q.class_id === cls.id)
    },
    enabled: tab === "quizzes" || tab === "overview",
  })

  // Fetch members
  const { data: members = [] } = useQuery({
    queryKey: ["class-members", cls.id],
    queryFn: async () => {
      const res = await api.get(endpoints.classes.members(cls.id))
      return Array.isArray(res.data) ? res.data as ClassMember[] : []
    },
    enabled: tab === "members",
  })

  const joinMutation = useMutation({
    mutationFn: async () => api.post(endpoints.classes.join(cls.id), {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes"] }); queryClient.invalidateQueries({ queryKey: ["class-members", cls.id] }) },
  })

  const leaveMutation = useMutation({
    mutationFn: async () => api.post(endpoints.classes.leave(cls.id), {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes"] }); queryClient.invalidateQueries({ queryKey: ["class-members", cls.id] }) },
  })

  const isMember = members.some(m => m.learner_id === user?.id)

  return (
    <AppShell>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>

        {/* Back */}
        <button className="btn" onClick={onBack} style={{ marginBottom: 20 }}>
          <ChevronLeft size={16} /> Back to Classes
        </button>

        {/* Class Header */}
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ height: 6, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }} />
          <div style={{ padding: "20px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span className="chip">{cls.class_code}</span>
                {cls.grade_level && <span className="chip">{cls.grade_level}</span>}
                <span className="chip" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {cls.visibility === "public" ? <Globe size={10} /> : <Lock size={10} />} {cls.visibility}
                </span>
                <span className="chip" style={{ color: cls.status === "active" ? "var(--success)" : "var(--muted)" }}>
                  {cls.status ?? "active"}
                </span>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 6px" }}>{cls.title}</h1>
              {cls.subject && <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 4 }}>📚 {cls.subject.name} ({cls.subject.code})</div>}
              {cls.teacher && <div style={{ color: "var(--muted)", fontSize: 14 }}>👤 {cls.teacher.full_name}</div>}
              {cls.description && <p style={{ color: "var(--muted)", fontSize: 14, margin: "10px 0 0", lineHeight: 1.6 }}>{cls.description}</p>}
            </div>

            {/* Join/Leave */}
            {isLearner && (
              <div>
                {isMember ? (
                  <button className="btn btn-danger" style={{ fontSize: 13 }}
                    onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending}>
                    <UserMinus size={14} /> {leaveMutation.isPending ? "Leaving..." : "Leave Class"}
                  </button>
                ) : (
                  <button className="btn btn-primary" style={{ fontSize: 13 }}
                    onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}>
                    <UserPlus size={14} /> {joinMutation.isPending ? "Joining..." : "Join Class"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "1px solid var(--border)" }}>
            {[
              { label: "Lessons", value: lessons.length, icon: <FileText size={16} /> },
              { label: "Quizzes", value: quizzes.length, icon: <BookOpen size={16} /> },
              { label: "Members", value: members.length || "—", icon: <Users size={16} /> },
            ].map((s, i) => (
              <div key={i} style={{ padding: "14px 20px", textAlign: "center", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
                <div style={{ color: "var(--accent)", marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-bar" style={{ marginBottom: 20 }}>
          {TABS.map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Recent Lessons */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">📖 Recent Lessons</span>
                <button className="btn" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setTab("lessons")}>View all</button>
              </div>
              {lessons.length === 0
                ? <p className="card-sub">No lessons yet.</p>
                : lessons.slice(0, 4).map(l => (
                  <div key={l.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{l.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.lesson_type}</div>
                    </div>
                    <span className="chip" style={{ fontSize: 10, alignSelf: "center" }}>{l.status}</span>
                  </div>
                ))
              }
            </div>

            {/* Recent Quizzes */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">📝 Recent Quizzes</span>
                <button className="btn" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setTab("quizzes")}>View all</button>
              </div>
              {quizzes.length === 0
                ? <p className="card-sub">No quizzes yet.</p>
                : quizzes.slice(0, 4).map(q => (
                  <div key={q.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{q.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{q.time_limit_minutes ? `${q.time_limit_minutes} min` : "No limit"}</div>
                    </div>
                    <span className="chip" style={{ fontSize: 10, alignSelf: "center" }}>{q.status}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* LESSONS */}
        {tab === "lessons" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {lessons.length === 0
              ? <div className="card" style={{ textAlign: "center", padding: 40 }}><p className="card-sub">No lessons in this class yet.</p></div>
              : lessons.map(l => (
                <div key={l.id} className="card hover-lift" style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
                  onClick={() => window.location.href = "/lessons"}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                    <FileText size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{l.title}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.lesson_type} · {new Date(l.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className="chip" style={{ fontSize: 11, color: l.status === "published" ? "var(--success)" : "var(--muted)" }}>{l.status}</span>
                </div>
              ))
            }
          </div>
        )}

        {/* QUIZZES */}
        {tab === "quizzes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {quizzes.length === 0
              ? <div className="card" style={{ textAlign: "center", padding: 40 }}><p className="card-sub">No quizzes in this class yet.</p></div>
              : quizzes.map(q => (
                <div key={q.id} className="card hover-lift" style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
                  onClick={() => window.location.href = "/quizzes"}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                    <BookOpen size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{q.title}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{q.time_limit_minutes ? `${q.time_limit_minutes} min` : "No time limit"}</div>
                  </div>
                  <span className="chip" style={{ fontSize: 11, color: q.status === "published" ? "var(--success)" : "var(--muted)" }}>{q.status}</span>
                </div>
              ))
            }
          </div>
        )}

        {/* MEMBERS */}
        {tab === "members" && (
          <div className="card">
            <div className="card-head">
              <span className="card-title">👥 Class Members</span>
              <span className="chip">{members.length}</span>
            </div>
            {members.length === 0
              ? <p className="card-sub">No members yet.</p>
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {members.map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "var(--accent)", flexShrink: 0 }}>
                        {m.learner.full_name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{m.learner.full_name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.learner.email}</div>
                      </div>
                      <span className="chip" style={{ fontSize: 11 }}>{m.status}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* DISCUSSION */}
        {tab === "discussion" && (
          <div className="card" style={{ padding: "16px 20px" }}>
            <div className="card-head" style={{ marginBottom: 16 }}>
              <span className="card-title">💬 Class Discussion</span>
            </div>
            <FeedSection />
          </div>
        )}

      </div>
    </AppShell>
  )
}