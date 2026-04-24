import { useState, useEffect } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  Search, TrendingUp, Users, BookOpen, GraduationCap,
  Sparkles, ChevronRight, Globe, Lock, Brain
} from "lucide-react"

function Avatar({ name, size = 44, color }: { name: string; size?: number; color?: string }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const c = color ?? colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg,${c},${c}88)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: size * 0.38, flexShrink: 0, border: "2px solid var(--border)" }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

function SkeletonCard({ height = 140 }: { height?: number }) {
  return <div style={{ background: "var(--card)", borderRadius: 16, height, border: "1px solid var(--border)", opacity: 0.6, animation: "pulse 1.5s infinite" }} />
}

export default function DiscoverPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [activeSection, setActiveSection] = useState<"all" | "teachers" | "classes" | "lessons">("all")
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ["trending-teachers"],
    queryFn: async () => {
      const res = await api.get(endpoints.discovery.trendingTeachers).catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 60000,
  })

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["public-classes"],
    queryFn: async () => {
      const res = await api.get(endpoints.discovery.publicClasses).catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 60000,
  })

  const { data: lessons = [], isLoading: loadingLessons } = useQuery({
    queryKey: ["public-lessons"],
    queryFn: async () => {
      const res = await api.get("/lessons?status=published&limit=12").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
    },
    staleTime: 60000,
  })

  const filteredTeachers = teachers.filter((t: any) =>
    t.full_name?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredClasses = classes.filter((c: any) =>
    (c.title ?? c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? "").toLowerCase().includes(search.toLowerCase())
  )
  const filteredLessons = lessons.filter((l: any) =>
    l.title?.toLowerCase().includes(search.toLowerCase())
  )

  const SECTIONS = [
    { key: "all",      label: "All",                          icon: "🌟" },
    { key: "teachers", label: `Teachers (${teachers.length})`, icon: "👨‍🏫" },
    { key: "classes",  label: `Classes (${classes.length})`,   icon: "🎓" },
    { key: "lessons",  label: `Lessons (${lessons.length})`,   icon: "📚" },
  ]

  const COLORS = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#8b5cf6","#ef4444"]

  return (
    <AppShell>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "12px 12px 80px" : "20px 20px 48px" }}>

        {/* ── HERO ── */}
        <div style={{ background: "linear-gradient(135deg,#1a0030,#0d0d1a,#001a2e)", borderRadius: 20, padding: isMobile ? "22px 16px" : "32px 32px", marginBottom: 20, position: "relative", overflow: "hidden", border: "1px solid var(--border)" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(203,38,228,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -40, left: -40, width: 150, height: 150, borderRadius: "50%", background: "rgba(56,189,248,0.06)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={15} style={{ color: "white" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#d946ef", letterSpacing: "0.06em", textTransform: "uppercase" }}>Learnex Discovery</span>
          </div>

          <h1 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 900, color: "white", margin: "0 0 8px", lineHeight: 1.2 }}>
            Discover Amazing<br />
            <span style={{ background: "linear-gradient(90deg,#cb26e4,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Teachers & Classes
            </span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "0 0 18px", lineHeight: 1.6 }}>
            Explore top educators, public classes and published lessons from Zambia's learning community.
          </p>

          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <Search size={15} style={{ color: "rgba(255,255,255,0.45)", flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search teachers, classes, lessons..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "white", fontSize: 14, fontFamily: "inherit" }} />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
            )}
          </div>

          {/* Live platform counts */}
          <div style={{ display: "flex", gap: isMobile ? 14 : 24, marginTop: 16, flexWrap: "wrap" }}>
            {[
              { label: "Teachers", value: teachers.length, color: "#cb26e4" },
              { label: "Classes",  value: classes.length,  color: "#38bdf8" },
              { label: "Lessons",  value: lessons.length,  color: "#22c55e" },
              { label: "Learners", value: classes.reduce((s: number, c: any) => s + (c.enrolled_count ?? 0), 0), color: "#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: isMobile ? 18 : 22, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION TABS ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", scrollbarWidth: "none" as const }}>
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key as any)}
              style={{ padding: "8px 16px", borderRadius: 24, border: `1.5px solid ${activeSection === s.key ? "var(--accent)" : "var(--border)"}`, background: activeSection === s.key ? "var(--accent)" : "var(--card)", color: activeSection === s.key ? "white" : "var(--muted)", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", fontFamily: "inherit", flexShrink: 0 }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* ── TRENDING TEACHERS ── */}
        {(activeSection === "all" || activeSection === "teachers") && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={15} style={{ color: "#cb26e4" }} /> Trending Teachers
              </div>
              {activeSection === "all" && (
                <button onClick={() => setActiveSection("teachers")}
                  style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontFamily: "inherit" }}>
                  See all <ChevronRight size={12} />
                </button>
              )}
            </div>

            {loadingTeachers ? (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 10 }}>
                {[1,2,3].map(i => <SkeletonCard key={i} height={160} />)}
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", color: "var(--muted)", fontSize: 14 }}>
                No teachers found
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 10 }}>
                {(activeSection === "all" ? filteredTeachers.slice(0, 6) : filteredTeachers).map((teacher: any, i: number) => {
                  const color = COLORS[i % COLORS.length]
                  return (
                    <div key={teacher.id}
                      onClick={() => navigate(`/profile/${teacher.id}`)}
                      style={{ background: "var(--card)", borderRadius: 16, padding: isMobile ? 14 : 16, border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)" }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.boxShadow = "none" }}>
                      <Avatar name={teacher.full_name} size={isMobile ? 44 : 52} color={color} />
                      <div style={{ width: "100%" }}>
                        <div style={{ fontWeight: 800, fontSize: isMobile ? 12 : 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teacher.full_name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Teacher</div>
                      </div>
                      {/* Stats row */}
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", width: "100%" }}>
                        <div style={{ flex: 1, textAlign: "center", padding: "6px 4px", borderRadius: 8, background: `${color}10`, border: `1px solid ${color}20` }}>
                          <div style={{ fontWeight: 900, fontSize: 15, color, lineHeight: 1 }}>{teacher.classes_count ?? 0}</div>
                          <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Classes</div>
                        </div>
                        <div style={{ flex: 1, textAlign: "center", padding: "6px 4px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
                          <div style={{ fontWeight: 900, fontSize: 15, color: "#22c55e", lineHeight: 1 }}>{teacher.learners_count ?? 0}</div>
                          <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Learners</div>
                        </div>
                        <div style={{ flex: 1, textAlign: "center", padding: "6px 4px", borderRadius: 8, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.18)" }}>
                          <div style={{ fontWeight: 900, fontSize: 15, color: "#38bdf8", lineHeight: 1 }}>{teacher.lessons_count ?? 0}</div>
                          <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Lessons</div>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); navigate(`/profile/${teacher.id}`) }}
                        style={{ width: "100%", padding: "7px", borderRadius: 10, border: `1px solid ${color}30`, background: `${color}10`, color, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                        View Profile
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PUBLIC CLASSES ── */}
        {(activeSection === "all" || activeSection === "classes") && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                <GraduationCap size={15} style={{ color: "#38bdf8" }} /> Public Classes
              </div>
              <button onClick={() => navigate("/classes")}
                style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontFamily: "inherit" }}>
                Browse all <ChevronRight size={12} />
              </button>
            </div>

            {loadingClasses ? (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 10 }}>
                {[1,2,3,4].map(i => <SkeletonCard key={i} height={130} />)}
              </div>
            ) : filteredClasses.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", color: "var(--muted)", fontSize: 14 }}>
                No public classes found
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 12 }}>
                {(activeSection === "all" ? filteredClasses.slice(0, 4) : filteredClasses).map((cls: any, i: number) => {
                  const color = COLORS[i % COLORS.length]
                  const isPublic = cls.visibility === "public" || cls.is_public
                  return (
                    <div 
                      onClick={() => navigate(`/classes`)}
                      style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", cursor: "pointer", overflow: "hidden", transition: "all 0.15s" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)" }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.boxShadow = "none" }}>
                      <div style={{ height: 4, background: `linear-gradient(90deg,${color},${color}55)` }} />
                      <div style={{ padding: 16 }}>
                        {/* Title + badge */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cls.title ?? cls.name}</div>
                            {cls.description && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cls.description}</div>}
                          </div>
                          <div style={{ padding: "3px 8px", borderRadius: 20, background: isPublic ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.1)", border: `1px solid ${isPublic ? "rgba(34,197,94,0.25)" : "rgba(148,163,184,0.2)"}`, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            {isPublic ? <Globe size={9} style={{ color: "#22c55e" }} /> : <Lock size={9} style={{ color: "var(--muted)" }} />}
                            <span style={{ fontSize: 9, fontWeight: 700, color: isPublic ? "#22c55e" : "var(--muted)" }}>{isPublic ? "Public" : "Private"}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color }}>
                            <Users size={12} /> {cls.enrolled_count ?? 0} learners
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                            <BookOpen size={12} /> {cls.lesson_count ?? 0} lessons
                          </div>
                          {cls.teacher && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                              <GraduationCap size={12} /> {cls.teacher.full_name}
                            </div>
                          )}
                        </div>

                        <button onClick={e => { e.stopPropagation(); navigate(`/classes/${cls.id}`) }}
                          style={{ width: "100%", padding: "8px", borderRadius: 10, border: `1px solid ${color}25`, background: `${color}08`, color, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                          View Class →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PUBLISHED LESSONS ── */}
        {(activeSection === "all" || activeSection === "lessons") && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                <BookOpen size={15} style={{ color: "#22c55e" }} /> Published Lessons
              </div>
              <button onClick={() => navigate("/lessons")}
                style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontFamily: "inherit" }}>
                Browse all <ChevronRight size={12} />
              </button>
            </div>

            {loadingLessons ? (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
                {[1,2,3].map(i => <SkeletonCard key={i} height={90} />)}
              </div>
            ) : filteredLessons.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", color: "var(--muted)", fontSize: 14 }}>
                No lessons found
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
                {(activeSection === "all" ? filteredLessons.slice(0, 6) : filteredLessons).map((lesson: any, i: number) => {
                  const color = COLORS[i % COLORS.length]
                  const typeIcon = lesson.lesson_type === "video" ? "🎬" : lesson.lesson_type === "quiz" ? "📝" : lesson.lesson_type === "assignment" ? "📋" : "📖"
                  return (
                    <div 
                      onClick={() => navigate(`/lessons`)}
                      style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 14, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)" }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.boxShadow = "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          {typeIcon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lesson.title}</div>
                          <div style={{ fontSize: 10, color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{lesson.lesson_type ?? "lesson"}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── AI BANNER ── */}
        {activeSection === "all" && (
          <div style={{ background: "linear-gradient(135deg,rgba(203,38,228,0.1),rgba(139,92,246,0.08))", borderRadius: 18, padding: isMobile ? 16 : 22, border: "1px solid rgba(203,38,228,0.18)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Brain size={22} style={{ color: "white" }} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 3 }}>Powered by Claude AI</div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                Teachers use AI to generate lessons, quizzes and assignments — richer learning content for everyone.
              </div>
            </div>
            <button onClick={() => navigate("/auth/register")}
              style={{ padding: "10px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(203,38,228,0.3)", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={13} /> Get Started Free
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}