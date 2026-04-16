import { useState, useMemo } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useAuthStore } from "@/features/auth/auth.store"
import ClassDetail from "./ClassDetail"
import type { Class } from "@/features/classes/types/class.types"
import {
  Users, BookOpen, Lock, Globe, Plus, Trash2,
  Edit2, Search, ChevronLeft, ChevronRight,
  GraduationCap, CheckCircle2, AlertCircle, X, Filter
} from "lucide-react"

const PAGE_SIZE = 9

// ── Helpers ────────────────────────────────────────────────────────
function ClassCard({
  cls, currentUserId, isTeacher, isAdmin, isLearner,
  onOpen, onJoin, onLeave, onDelete, onEdit,
  joining, leaving,
}: {
  cls: Class; currentUserId?: number
  isTeacher: boolean; isAdmin: boolean; isLearner: boolean
  onOpen: () => void; onJoin: () => void; onLeave: () => void
  onDelete: () => void; onEdit: () => void
  joining: boolean; leaving: boolean
}) {
  const isOwner = (cls.teacher_id ?? cls.teacher?.id) === currentUserId
  const isMember = cls.is_member
  const canEdit = isOwner || isAdmin
  const canDelete = isOwner || isAdmin
  // Anyone can join a class they are not teaching and not already a member of
  const canJoin = !isOwner && !isMember
  const canLeave = !isOwner && isMember

  const accentColors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#8b5cf6","#06b6d4","#ef4444"]
  const color = accentColors[(cls.id ?? 0) % accentColors.length]

  return (
    <div className="card hover-lift" style={{ display: "flex", flexDirection: "column", gap: 0, cursor: "pointer", position: "relative", overflow: "hidden", padding: 0 }}
      onClick={onOpen}>
      {/* Color bar */}
      <div style={{ height: 5, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {/* Top chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span className="chip" style={{ fontSize: 10 }}>{cls.class_code}</span>
          {cls.grade_level && <span className="chip" style={{ fontSize: 10 }}>{cls.grade_level}</span>}
          <span className="chip" style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 3 }}>
            {cls.visibility === "public" ? <Globe size={9} /> : <Lock size={9} />} {cls.visibility}
          </span>
          {cls.status && (
            <span className="chip" style={{ fontSize: 10, color: cls.status === "active" ? "var(--success)" : "var(--muted)" }}>
              {cls.status}
            </span>
          )}
          {isOwner && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: `${color}15`, color, fontWeight: 700 }}>
              ✏️ Mine
            </span>
          )}
          {isMember && !isOwner && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(34,197,94,0.12)", color: "var(--success)", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
              <CheckCircle2 size={9} /> Enrolled
            </span>
          )}
        </div>

        {/* Title & info */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 3, lineHeight: 1.3 }}>{cls.title}</div>
          {cls.subject && <div style={{ fontSize: 12, color: "var(--muted)" }}>📚 {cls.subject.name}</div>}
          {cls.teacher && <div style={{ fontSize: 12, color: "var(--muted)" }}>👤 {cls.teacher.full_name}</div>}
        </div>

        {cls.description && (
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {cls.description}
          </p>
        )}

        {/* Member count */}
        {cls.member_count !== undefined && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted)" }}>
            <Users size={12} /> {cls.member_count} student{cls.member_count !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ padding: "10px 18px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}
        onClick={e => e.stopPropagation()}>
        <button className="btn btn-primary" style={{ flex: 1, fontSize: 12 }} onClick={onOpen}>
          Open →
        </button>

        {/* Learner actions */}
        {canJoin && (
          <button className="btn" style={{ fontSize: 12, color: color, borderColor: `${color}40`, background: `${color}08` }}
            onClick={onJoin} disabled={joining}>
            <Users size={13} /> {joining ? "Joining..." : "Join"}
          </button>
        )}
        {canLeave && (
          <button className="btn" style={{ fontSize: 12, color: "var(--muted)" }}
            onClick={e => { e.stopPropagation(); onLeave() }} disabled={leaving}>
            {leaving ? "Leaving..." : "Leave"}
          </button>
        )}

        {/* Teacher/Admin actions */}
        {canEdit && (
          <button className="btn" style={{ fontSize: 12, padding: "8px 10px" }}
            onClick={e => { e.stopPropagation(); onEdit() }}>
            <Edit2 size={13} />
          </button>
        )}
        {canDelete && (
          <button className="btn" style={{ fontSize: 12, padding: "8px 10px", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)" }}
            onClick={e => { e.stopPropagation(); onDelete() }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────
export default function ClassesPage() {
  const { isTeacher, isAdmin, isLearner } = useAuth()
  const currentUser = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [activeClass, setActiveClass] = useState<Class | null>(null)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all"|"mine"|"enrolled"|"other">("all")
  const [page, setPage] = useState(1)
  const [joiningId, setJoiningId] = useState<number | null>(null)
  const [leavingId, setLeavingId] = useState<number | null>(null)
  const [joinError, setJoinError] = useState<string>("")
  const [form, setForm] = useState({
    title: "", description: "", class_code: "",
    subject_id: "", grade_level: "", visibility: "public"
  })

  // Subjects for dropdown
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await api.get("/subjects")).data,
    staleTime: 60000,
  })

  // Fetch all classes (backend returns teacher's own for teachers, all for others)
  const { data: allClasses = [], isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      // For teachers, fetch ALL classes to show "mine" vs "other"
      const res = await api.get(endpoints.classes.list)
      return (Array.isArray(res.data) ? res.data : res.data?.items ?? []) as Class[]
    },
  })

  // Fetch my enrolled classes for learner
  const { data: myEnrolled = [] } = useQuery({
    queryKey: ["classes-enrolled"],
    queryFn: async () => {
      const res = await api.get("/classes/enrolled").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data as Class[] : []
    },
    enabled: !!currentUser,
    staleTime: 30000,
  })

  const enrolledIds = new Set(myEnrolled.map((c: Class) => c.id))

  // Enrich classes with is_member — owner = always member, others check enrollment
  const classes: Class[] = allClasses.map((c: Class) => ({
    ...c,
    is_member: ((c.teacher_id ?? c.teacher?.id) === currentUser?.id) || enrolledIds.has(c.id),
  }))

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post(endpoints.classes.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      setShowForm(false)
      setForm({ title: "", description: "", class_code: "", subject_id: "", grade_level: "", visibility: "public" })
      setError("")
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Failed to create class"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(endpoints.classes.delete(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  })

  const joinMutation = useMutation({
    mutationFn: async (id: number) => {
      setJoiningId(id); setJoinError("")
      return api.post(endpoints.classes.join(id), {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      queryClient.invalidateQueries({ queryKey: ["classes-enrolled"] })
      setJoiningId(null)
    },
    onError: (err: any) => {
      setJoinError(err?.response?.data?.detail || "Failed to join class")
      setJoiningId(null)
    },
  })

  const leaveMutation = useMutation({
    mutationFn: async (id: number) => {
      setLeavingId(id)
      return api.post(`/classes/${id}/leave`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      queryClient.invalidateQueries({ queryKey: ["classes-enrolled"] })
      setLeavingId(null)
    },
    onError: () => setLeavingId(null),
  })

  // Filter + search + pagination
  const filtered = useMemo(() => {
    let result = classes

    // Apply tab filter
    if (filter === "mine") {
      // My Classes = classes I created as teacher
      result = result.filter(c => (c.teacher_id ?? c.teacher?.id) === currentUser?.id)
    } else if (filter === "enrolled") {
      // Joined Classes = classes I joined as member (not my own)
      result = result.filter(c => enrolledIds.has(c.id) && (c.teacher_id ?? c.teacher?.id) !== currentUser?.id)
    } else if (filter === "other") {
      // Discover = classes not owned and not joined
      result = result.filter(c => (c.teacher_id ?? c.teacher?.id) !== currentUser?.id && !enrolledIds.has(c.id))
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.class_code.toLowerCase().includes(q) ||
        c.subject?.name?.toLowerCase().includes(q) ||
        c.teacher?.full_name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      )
    }

    return result
  }, [classes, filter, search, currentUser?.id, enrolledIds, isTeacher, isAdmin])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Tab counts
  const mineCount = classes.filter(c => (c.teacher_id ?? c.teacher?.id) === currentUser?.id).length
  const enrolledCount = myEnrolled.length
  const otherCount = classes.filter(c =>
    (c.teacher_id ?? c.teacher?.id) !== currentUser?.id && !enrolledIds.has(c.id)
  ).length

  const joinedCount = myEnrolled.filter(c => (c.teacher_id ?? c.teacher?.id) !== currentUser?.id).length

  const TABS = isTeacher || isAdmin ? [
    { key: "all",      label: "All Classes",    count: classes.length },
    { key: "mine",     label: "My Classes",     count: mineCount },
    { key: "enrolled", label: "Joined Classes", count: joinedCount },
    { key: "other",    label: "Discover",       count: otherCount },
  ] : [
    { key: "all",      label: "All Classes",  count: classes.length },
    { key: "enrolled", label: "My Enrolled",  count: enrolledCount },
    { key: "other",    label: "Discover",     count: otherCount },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    if (!form.subject_id) { setError("Please select a subject"); return }
    createMutation.mutate({
      title: form.title, description: form.description || undefined,
      class_code: form.class_code, subject_id: Number(form.subject_id),
      grade_level: form.grade_level || undefined, visibility: form.visibility,
    })
  }

  if (activeClass) return <ClassDetail cls={activeClass} onBack={() => setActiveClass(null)} />

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 48px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px" }}>🎓 Classes</h1>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
              {isTeacher || isAdmin ? "Manage your classes and explore others." : "Your enrolled classes and discover new ones."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isLearner && (
              <button className="btn" style={{ fontSize: 13 }} onClick={() => window.location.href = "/classes/discover"}>
                🔍 Discover
              </button>
            )}
            {(isTeacher || isAdmin) && (
              <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => { setShowForm(s => !s); setEditingClass(null) }}>
                <Plus size={15} /> {showForm ? "Cancel" : "New Class"}
              </button>
            )}
          </div>
        </div>

        {/* ── Join Error Banner ── */}
        {joinError && (
          <div style={{ padding: "10px 16px", marginBottom: 14, borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--danger)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={15} /> {joinError}
            <button onClick={() => setJoinError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}><X size={14} /></button>
          </div>
        )}

        {/* ── Create/Edit Form ── */}
        {showForm && (isTeacher || isAdmin) && (
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={16} style={{ color: "var(--accent)" }} /> Create New Class
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Class Title *</label>
                  <input className="audit-control" required value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Mathematics Grade 10" />
                </div>
                <div className="form-field">
                  <label className="form-label">Class Code *</label>
                  <input className="audit-control" required value={form.class_code}
                    onChange={e => setForm(p => ({ ...p, class_code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. MATH101" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Description</label>
                <input className="audit-control" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What will students learn in this class?" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Subject *</label>
                  <select className="audit-control select" required value={form.subject_id}
                    onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}>
                    <option value="">Select subject...</option>
                    {(Array.isArray(subjects) ? subjects : []).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Grade Level</label>
                  <input className="audit-control" value={form.grade_level}
                    onChange={e => setForm(p => ({ ...p, grade_level: e.target.value }))}
                    placeholder="e.g. Grade 10" />
                </div>
                <div className="form-field">
                  <label className="form-label">Visibility</label>
                  <select className="audit-control select" value={form.visibility}
                    onChange={e => setForm(p => ({ ...p, visibility: e.target.value }))}>
                    <option value="public">🌐 Public</option>
                    <option value="private">🔒 Private</option>
                  </select>
                </div>
              </div>
              {error && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>
                  {error}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Class"}
                </button>
                <button className="btn" type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Tabs + Search ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {/* Tab filters */}
          <div className="tabs-bar" style={{ flex: 1, margin: 0 }}>
            {TABS.map(t => (
              <button key={t.key} className={`tab-btn ${filter === t.key ? "active" : ""}`}
                onClick={() => { setFilter(t.key as any); setPage(1) }}>
                {t.label}
                <span style={{ marginLeft: 5, padding: "1px 7px", borderRadius: 999, fontSize: 10,
                  background: filter === t.key ? "var(--accent)" : "var(--bg2)",
                  color: filter === t.key ? "white" : "var(--muted)" }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg2)", minWidth: 220 }}>
            <Search size={14} style={{ color: "var(--muted)" }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search classes..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--text)", width: "100%", fontFamily: "inherit" }} />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><X size={13} /></button>}
          </div>
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="card" style={{ height: 200, opacity: 0.3 }} />)}
          </div>
        )}

        {/* ── Empty ── */}
        {!isLoading && paginated.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
              {search ? `No classes match "${search}"` : filter === "mine" ? "You have no classes yet" : filter === "enrolled" ? "You're not enrolled in any classes" : "No classes found"}
            </div>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 16px" }}>
              {isTeacher && filter === "mine" ? "Create your first class to start teaching." :
               isLearner ? "Discover and join classes from your teachers." :
               "Try a different search or filter."}
            </p>
            {isTeacher && filter === "mine" && (
              <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Create Class</button>
            )}
            {isLearner && (
              <button className="btn btn-primary" onClick={() => window.location.href = "/classes/discover"}>🔍 Discover Classes</button>
            )}
          </div>
        )}

        {/* ── Class Grid ── */}
        {!isLoading && paginated.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {paginated.map(cls => (
              <ClassCard
                key={cls.id}
                cls={cls}
                currentUserId={currentUser?.id}
                isTeacher={isTeacher}
                isAdmin={isAdmin}
                isLearner={isLearner}
                onOpen={() => setActiveClass(cls)}
                onJoin={() => joinMutation.mutate(cls.id)}
                onLeave={() => {
                  if (window.confirm(`Leave "${cls.title}"?`)) leaveMutation.mutate(cls.id)
                }}
                onDelete={() => {
                  if (window.confirm(`Delete "${cls.title}"? This cannot be undone.`)) deleteMutation.mutate(cls.id)
                }}
                onEdit={() => { setEditingClass(cls); setShowForm(true) }}
                joining={joiningId === cls.id}
                leaving={leavingId === cls.id}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!isLoading && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 28 }}>
            <button className="btn" style={{ fontSize: 12, padding: "7px 14px" }}
              disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} /> Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p}
                style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${p === page ? "var(--accent)" : "var(--border)"}`, background: p === page ? "var(--accent)" : "var(--card)", color: p === page ? "white" : "var(--text)", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}
                onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
            <button className="btn" style={{ fontSize: 12, padding: "7px 14px" }}
              disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* ── Pagination info ── */}
        {!isLoading && filtered.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} classes
          </div>
        )}
      </div>
    </AppShell>
  )
}