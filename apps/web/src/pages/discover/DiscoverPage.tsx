import { useState, useEffect } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  Search, TrendingUp, Users, BookOpen, GraduationCap,
  Star, Sparkles, ChevronRight, Globe, Lock,
  Brain, Award, Zap, Target, BarChart2
} from "lucide-react"

function getBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") ?? ""
}
function resolveAvatar(url?: string | null) {
  if (!url) return null
  return url.startsWith("http") ? url : `${getBaseUrl()}${url}`
}

function Avatar({ name, url, size = 44, color }: { name: string; url?: string | null; size?: number; color?: string }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const c = color ?? colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  const resolved = resolveAvatar(url)
  if (resolved) return <img src={resolved} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg,${c},${c}99)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: size * 0.38, flexShrink: 0, border: "2px solid var(--border)" }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
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

  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const res = await api.get("/analytics/dashboard/admin").catch(() => ({ data: {} }))
      return res.data
    },
    staleTime: 300000,
  })

  // Search filter
  const filteredTeachers = teachers.filter((t: any) =>
    t.full_name?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredClasses = classes.filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredLessons = lessons.filter((l: any) =>
    l.title?.toLowerCase().includes(search.toLowerCase())
  )

  const SECTIONS = [
    { key: "all", label: "All", icon: "🌟" },
    { key: "teachers", label: `Teachers (${teachers.length})`, icon: "👨‍🏫" },
    { key: "classes", label: `Classes (${classes.length})`, icon: "🎓" },
    { key: "lessons", label: `Lessons (${lessons.length})`, icon: "📚" },
  ]

  const roleColors = ["#cb26e4", "#38bdf8", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"]

  return (
    <AppShell>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "12px 12px 80px" : "20px 20px 48px" }}>

        {/* Hero */}
        <div style={{ background: "linear-gradient(135deg,#1a0030,#0d0d1a,#001a2e)", borderRadius: 20, padding: isMobile ? "24px 18px" : "32px 32px", marginBottom: 20, position: "relative", overflow: "hidden", border: "1px solid var(--border)" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(203,38,228,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -40, left: -40, width: 150, height: 150, borderRadius: "50%", background: "rgba(56,189,248,0.06)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#cb26e4,#38bdf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={16} style={{ color: "white" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#d946ef", letterSpacing: "0.06em", textTransform: "uppercase" }}>Learnex Discovery</span>
          </div>

          <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 900, color: "white", margin: "0 0 10px", lineHeight: 1.2 }}>
            Discover Amazing<br />
            <span style={{ background: "linear-gradient(90deg,#cb26e4,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Teachers & Classes
            </span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, margin: "0 0 20px", lineHeight: 1.6 }}>
            Explore top educators, public classes and published lessons from Zambia's learning community.
          </p>

          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
            <Search size={16} style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search teachers, classes, lessons..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "white", fontSize: 14, fontFamily: "inherit" }} />
          </div>

          {/* Platform stats */}
          {stats && (
            <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
              {[
                { label: "Teachers", value: stats.total_teachers ?? teachers.length, color: "#cb26e4" },
                { label: "Classes", value: stats.total_classes ?? classes.length, color: "#38bdf8" },
                { label: "Lessons", value: stats.total_lessons ?? lessons.length, color: "#22c55e" },
                { label: "Learners", value: stats.total_users ?? "—", color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 20, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section filter tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", scrollbarWidth: "none" as const }}>
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key as any)}
              style={{ padding: "9px 16px", borderRadius: 24, border: `1.5px solid ${activeSection === s.key ? "var(--accent)" : "var(--border)"}`, background: activeSection === s.key ? "var(--accent)" : "var(--card)", color: activeSection === s.key ? "white" : "var(--muted)", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", fontFamily: "inherit", flexShrink: 0 }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* ── TRENDING TEACHERS ── */}
        {(activeSection === "all" || activeSection === "teachers") && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={16} style={{ color: "#cb26e4" }} /> Trending Teachers
              </div>
              <button onClick={() => setActiveSection("teachers")}
                style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                See all <ChevronRight size={13} />
              </button>
            </div>

            {loadingTeachers ? (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 10 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ background: "var(--card)", borderRadius: 16, padding: 16, border: "1px solid var(--border)", height: 120, animation: "pulse 1.5s infinite" }} />
                ))}
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", color: "var(--muted)", fontSize: 14 }}>
                No teachers found
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 10 }}>
                {(activeSection === "all" ? filteredTeachers.slice(0, 6) : filteredTeachers).map((teacher: any, i: number) => {
                  const color = roleColors[i % roleColors.length]
                  return (
                    <div key={teacher.id} onClick={() => navigate(`/profile/${teacher.id}`)}
                      style={{ background: "var(--card)", borderRadius: 16, padding: 16, border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)" }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.boxShadow = "none" }}>
                      <Avatar name={teacher.full_name} url={teacher.profile?.avatar_url} size={isMobile ? 48 : 56} color={color} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: isMobile ? 13 : 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 100 : 140 }}>{teacher.full_name}</div>
                        {teacher.profile?.profession && (
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 100 : 140 }}>{teacher.profile.profession}</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color }}>{teacher.followers_count ?? 0}</div>
                          <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Followers</div>
                        </div>
                        {teacher.classes_count !== undefined && (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#22c55e" }}>{teacher.classes_count}</div>
                            <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Classes</div>
                          </div>
                        )}
                      </div>
                      <button onClick={e => { e.stopPropagation(); navigate(`/profile/${teacher.id}`) }}
                        style={{ width: "100%", padding: "7px", borderRadius: 10, border: `1px solid ${color}30`, background: `${color}10`, color, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
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
              <div style={{ fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <GraduationCap size={16} style={{ color: "#38bdf8" }} /> Public Classes
              </div>
              <button onClick={() => navigate("/classes")}
                style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                Browse all <ChevronRight size={13} />
              </button>
            </div>

            {loadingClasses ? (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 10 }}>
                {[1,2,4].map(i => <div key={i} style={{ background: "var(--card)", borderRadius: 16, height: 120, border: "1px solid var(--border)", animation: "pulse 1.5s infinite" }} />)}
              </div>
            ) : filteredClasses.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", color: "var(--muted)", fontSize: 14 }}>
                No public classes found
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 12 }}>
                {(activeSection === "all" ? filteredClasses.slice(0, 4) : filteredClasses).map((cls: any, i: number) => {
                  const color = roleColors[i % roleColors.length]
                  return (
                    <div key={cls.id} onClick={() => navigate(`/classes/${cls.id}`)}
                      style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", cursor: "pointer", overflow: "hidden", transition: "all 0.15s" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)" }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.boxShadow = "none" }}>
                      {/* Color top bar */}
                      <div style={{ height: 4, background: `linear-gradient(90deg,${color},${color}60)` }} />
                      <div style={{ padding: 16 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{cls.title ?? cls.name}</div>
                            {cls.description && (
                              <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>{cls.description}</div>
                            )}
                          </div>
                          <div style={{ padding: "3px 10px", borderRadius: 20, background: (cls.visibility === "public" || cls.is_public) ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.1)", border: `1px solid ${(cls.visibility === "public" || cls.is_public) ? "rgba(34,197,94,0.25)" : "rgba(148,163,184,0.25)"}`, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            {(cls.visibility === "public" || cls.is_public) ? <Globe size={10} style={{ color: "#22c55e" }} /> : <Lock size={10} style={{ color: "var(--muted)" }} />}
                            <span style={{ fontSize: 10, fontWeight: 700, color: (cls.visibility === "public" || cls.is_public) ? "#22c55e" : "var(--muted)" }}>{(cls.visibility === "public" || cls.is_public) ? "Public" : "Private"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                            <Users size={11} /> {cls.enrolled_count ?? cls.members_count ?? cls.student_count ?? 0} learners
                          </div>
                          {cls.lesson_count !== undefined && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                              <BookOpen size={11} /> {cls.lesson_count} lessons
                            </div>
                          )}
                          {cls.teacher && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                              <GraduationCap size={11} /> {cls.teacher.full_name ?? "Teacher"}
                            </div>
                          )}
                        </div>
                        <button onClick={e => { e.stopPropagation(); navigate(`/classes`) }}
                          style={{ marginTop: 12, width: "100%", padding: "8px", borderRadius: 10, border: `1px solid ${color}30`, background: `${color}08`, color, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
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
              <div style={{ fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <BookOpen size={16} style={{ color: "#22c55e" }} /> Published Lessons
              </div>
              <button onClick={() => navigate("/lessons")}
                style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                Browse all <ChevronRight size={13} />
              </button>
            </div>

            {loadingLessons ? (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
                {[1,2,3].map(i => <div key={i} style={{ background: "var(--card)", borderRadius: 16, height: 100, border: "1px solid var(--border)", animation: "pulse 1.5s infinite" }} />)}
              </div>
            ) : filteredLessons.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", color: "var(--muted)", fontSize: 14 }}>
                No lessons found
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
                {(activeSection === "all" ? filteredLessons.slice(0, 6) : filteredLessons).map((lesson: any, i: number) => {
                  const color = roleColors[i % roleColors.length]
                  const typeIcon = lesson.lesson_type === "video" ? "🎬" : lesson.lesson_type === "quiz" ? "📝" : lesson.lesson_type === "assignment" ? "📋" : "📖"
                  return (
                    <div key={lesson.id} onClick={() => navigate(`/lessons`)}
                      style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 14, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)" }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.boxShadow = "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          {typeIcon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lesson.title}</div>
                          <div style={{ fontSize: 10, color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{lesson.lesson_type ?? "lesson"}</div>
                        </div>
                      </div>
                      {lesson.teacher && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
                          <GraduationCap size={11} /> {lesson.teacher.full_name ?? "Teacher"}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── AI BANNER ── */}
        {activeSection === "all" && (
          <div style={{ background: "linear-gradient(135deg,rgba(203,38,228,0.1),rgba(139,92,246,0.1))", borderRadius: 18, padding: isMobile ? 18 : 24, border: "1px solid rgba(203,38,228,0.2)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Brain size={24} style={{ color: "white" }} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>Powered by Claude AI</div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                Teachers on Learnex use AI to generate lessons, quizzes and assignments — giving you richer learning content.
              </div>
            </div>
            <button onClick={() => navigate("/auth/register")}
              style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(203,38,228,0.35)", flexShrink: 0 }}>
              <Sparkles size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Get Started Free
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
