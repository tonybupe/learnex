import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useAuth } from "@/features/auth/useAuth"
import { BookOpen, Users, Lock, Globe, ChevronRight } from "lucide-react"

export default function TeacherUpcomingClasses() {
  const { user } = useAuth()

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["my-classes-widget"],
    queryFn: async () => {
      const res = await api.get("/classes?mine=true").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 30000,
  })

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["my-lessons-widget"],
    queryFn: async () => {
      const res = await api.get("/lessons?mine=true&limit=5").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 30000,
  })

  const accentColors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#8b5cf6"]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* My Classes */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>🎓 My Classes</span>
          <a href="/classes" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
            View all <ChevronRight size={12} />
          </a>
        </div>

        {isLoading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading...</div>
        ) : classes.length === 0 ? (
          <div style={{ padding: "24px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📚</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>No classes created yet</div>
            <a href="/classes" style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 700, textDecoration: "none" }}>
              + Create Class
            </a>
          </div>
        ) : (
          <div>
            {classes.slice(0, 5).map((c: any, i: number) => {
              const color = accentColors[i % accentColors.length]
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < Math.min(classes.length, 5) - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <BookOpen size={16} style={{ color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
                      <span>{c.subject?.name ?? "—"}</span>
                      {c.grade_level && <><span>·</span><span>{c.grade_level}</span></>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    {c.visibility === "public" ? <Globe size={11} style={{ color: "#38bdf8" }} /> : <Lock size={11} style={{ color: "var(--muted)" }} />}
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: c.status === "active" ? "rgba(34,197,94,0.1)" : "var(--bg2)", color: c.status === "active" ? "var(--success)" : "var(--muted)", fontWeight: 700 }}>
                      {c.status ?? "active"}
                    </span>
                  </div>
                </div>
              )
            })}
            {classes.length > 5 && (
              <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
                <a href="/classes" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}>
                  +{classes.length - 5} more classes →
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Lessons */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>📖 Recent Lessons</span>
          <a href="/lessons" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
            View all <ChevronRight size={12} />
          </a>
        </div>

        {lessonsLoading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading...</div>
        ) : lessons.length === 0 ? (
          <div style={{ padding: "24px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📝</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>No lessons created yet</div>
            <a href="/lessons" style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 700, textDecoration: "none" }}>
              + Create Lesson
            </a>
          </div>
        ) : (
          <div>
            {lessons.slice(0, 5).map((l: any, i: number) => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: i < lessons.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.status === "published" ? "var(--success)" : l.status === "draft" ? "var(--muted)" : "#f59e0b", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.title}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{l.lesson_type} · Class #{l.class_id}</div>
                </div>
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: l.status === "published" ? "rgba(34,197,94,0.1)" : "var(--bg2)", color: l.status === "published" ? "var(--success)" : "var(--muted)", fontWeight: 700, flexShrink: 0 }}>
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}