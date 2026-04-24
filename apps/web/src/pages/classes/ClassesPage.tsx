import { useState, useMemo, useEffect } from "react"
import AppShell from "@/components/layout/AppShell"
import SubjectSelector from "@/components/subjects/SubjectSelector"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"
import type { Class } from "@/features/classes/types/class.types"
import {
  Users, BookOpen, Lock, Globe, Plus, Trash2,
  Edit2, Search, ChevronLeft, ChevronRight,
  GraduationCap, CheckCircle2, AlertCircle, X,
  Sparkles, TrendingUp
} from "lucide-react"

const PAGE_SIZE = 9
const COLORS = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#8b5cf6","#06b6d4","#ef4444"]

// ── Class Card ──────────────────────────────────────────────────────
function ClassCard({ cls, currentUserId, isTeacher, isAdmin, isLearner, onOpen, onJoin, onLeave, onDelete, onEdit, joining, leaving, isMobile }: {
  cls: Class; currentUserId?: number
  isTeacher: boolean; isAdmin: boolean; isLearner: boolean
  onOpen: () => void; onJoin: () => void; onLeave: () => void
  onDelete: () => void; onEdit: () => void
  joining: boolean; leaving: boolean; isMobile: boolean
}) {
  const isOwner = (cls.teacher_id ?? cls.teacher?.id) === currentUserId
  const isMember = cls.is_member
  const canEdit = isOwner || isAdmin
  const canDelete = isOwner || isAdmin
  const canJoin = !isOwner && !isMember
  const canLeave = !isOwner && isMember
  const color = COLORS[(cls.id ?? 0) % COLORS.length]

  return (
    <div onClick={onOpen} style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)" }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.boxShadow = "none" }}>

      {/* Color bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg,${color},${color}70)`, flexShrink: 0 }} />

      <div style={{ padding: isMobile ? "12px 14px" : "14px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {/* Badges */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 20, background: "var(--bg2)", border: "1px solid var(--border)", fontWeight: 700, color: "var(--muted)" }}>{cls.class_code}</span>
          {cls.grade_level && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 20, background: "var(--bg2)", border: "1px solid var(--border)", fontWeight: 700, color: "var(--muted)" }}>{cls.grade_level}</span>}
          <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 20, background: cls.visibility === "public" ? "rgba(34,197,94,0.08)" : "rgba(148,163,184,0.08)", border: `1px solid ${cls.visibility === "public" ? "rgba(34,197,94,0.2)" : "rgba(148,163,184,0.2)"}`, fontWeight: 700, color: cls.visibility === "public" ? "#22c55e" : "var(--muted)", display: "flex", alignItems: "center", gap: 3 }}>
            {cls.visibility === "public" ? <Globe size={8} /> : <Lock size={8} />} {cls.visibility}
          </span>
          {isOwner && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 20, background: `${color}15`, border: `1px solid ${color}25`, fontWeight: 700, color }}>✏️ Mine</span>}
          {isMember && !isOwner && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 20, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", fontWeight: 700, color: "#22c55e", display: "flex", alignItems: "center", gap: 3 }}><CheckCircle2 size={8} /> Enrolled</span>}
        </div>

        {/* Title */}
        <div>
          <div style={{ fontWeight: 800, fontSize: isMobile ? 14 : 15, lineHeight: 1.3, marginBottom: 3 }}>{cls.title}</div>
          {cls.subject && <div style={{ fontSize: 11, color: "var(--muted)" }}>📚 {cls.subject.name}</div>}
          {cls.teacher && <div style={{ fontSize: 11, color: "var(--muted)" }}>👤 {cls.teacher.full_name}</div>}
        </div>

        {cls.description && (
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {cls.description}
          </p>
        )}

        {cls.member_count !== undefined && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
            <Users size={11} /> {cls.member_count} student{cls.member_count !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: "10px 14px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
        <button onClick={onOpen}
          style={{ flex: 1, padding: "8px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${color},${color}cc)`, color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Open →
        </button>
        {canJoin && (
          <button onClick={onJoin} disabled={joining}
            style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${color}30`, background: `${color}08`, color, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
            <Users size={12} /> {joining ? "..." : "Join"}
          </button>
        )}
        {canLeave && (
          <button onClick={e => { e.stopPropagation(); onLeave() }} disabled={leaving}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--muted)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            {leaving ? "..." : "Leave"}
          </button>
        )}
        {canEdit && (
          <button onClick={e => { e.stopPropagation(); onEdit() }}
            style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
            <Edit2 size={13} />
          </button>
        )}
        {canDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--danger)" }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Create Class Modal ──────────────────────────────────────────────
function CreateClassModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", class_code: "", subject_id: "", grade_level: "", visibility: "public" })
  const [error, setError] = useState("")
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post(endpoints.classes.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      onCreated()
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      if (typeof detail === "string") setError(detail)
      else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg || String(d)).join(", "))
      else setError("Failed to create class")
    },
  })

  const inp: React.CSSProperties = { width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--card)", borderRadius: 20, width: "100%", maxWidth: 520, border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900, fontSize: 17 }}>Create New Class</div>
          <button onClick={onClose} style={{ background: "var(--bg2)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}><X size={15} /></button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Class Title *</label>
              <input style={inp} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Mathematics Grade 10" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Class Code *</label>
              <input style={inp} value={form.class_code} onChange={e => setForm(p => ({ ...p, class_code: e.target.value.toUpperCase() }))} placeholder="MATH101" />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Description</label>
            <input style={inp} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What will students learn?" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Subject *</label>
              <SubjectSelector value={form.subject_id} onChange={v => setForm(p => ({ ...p, subject_id: v }))} required showMineOnly={true} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Grade Level</label>
              <input style={inp} value={form.grade_level} onChange={e => setForm(p => ({ ...p, grade_level: e.target.value }))} placeholder="e.g. Form 1" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Visibility</label>
              <select style={{ ...inp, cursor: "pointer" }} value={form.visibility} onChange={e => setForm(p => ({ ...p, visibility: e.target.value }))}>
                <option value="public">🌐 Public</option>
                <option value="private">🔒 Private</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", color: "var(--text)" }}>Cancel</button>
            <button disabled={createMutation.isPending || !form.title || !form.class_code}
              onClick={() => {
                if (!form.subject_id) { setError("Please select a subject"); return }
                createMutation.mutate({ title: form.title, description: form.description || undefined, class_code: form.class_code, subject_id: Number(form.subject_id), grade_level: form.grade_level || undefined, visibility: form.visibility })
              }}
              style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(203,38,228,0.3)" }}>
              <Plus size={15} /> {createMutation.isPending ? "Creating..." : "Create Class"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────
export default function ClassesPage() {
  const { isTeacher, isAdmin, isLearner } = useAuth()
  const currentUser = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all"|"mine"|"enrolled"|"other">("all")
  const [page, setPage] = useState(1)
  const [joiningId, setJoiningId] = useState<number | null>(null)
  const [leavingId, setLeavingId] = useState<number | null>(null)
  const [joinError, setJoinError] = useState("")
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  const { data: allClasses = [], isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await api.get(endpoints.classes.list)
      return (Array.isArray(res.data) ? res.data : res.data?.items ?? []) as Class[]
    },
  })

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

  const classes: Class[] = allClasses.map((c: Class) => ({
    ...c,
    is_member: ((c.teacher_id ?? c.teacher?.id) === currentUser?.id) || enrolledIds.has(c.id),
  }))

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(endpoints.classes.delete(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  })

  const joinMutation = useMutation({
    mutationFn: async (id: number) => { setJoiningId(id); setJoinError(""); return api.post(endpoints.classes.join(id), {}) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes"] }); queryClient.invalidateQueries({ queryKey: ["classes-enrolled"] }); setJoiningId(null) },
    onError: (err: any) => { setJoinError(err?.response?.data?.detail || "Failed to join class"); setJoiningId(null) },
  })

  const leaveMutation = useMutation({
    mutationFn: async (id: number) => { setLeavingId(id); return api.post(`/classes/${id}/leave`, {}) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["classes"] }); queryClient.invalidateQueries({ queryKey: ["classes-enrolled"] }); setLeavingId(null) },
    onError: () => setLeavingId(null),
  })

  const filtered = useMemo(() => {
    let result = classes
    if (filter === "mine") result = result.filter(c => (c.teacher_id ?? c.teacher?.id) === currentUser?.id)
    else if (filter === "enrolled") result = result.filter(c => enrolledIds.has(c.id) && (c.teacher_id ?? c.teacher?.id) !== currentUser?.id)
    else if (filter === "other") result = result.filter(c => (c.teacher_id ?? c.teacher?.id) !== currentUser?.id && !enrolledIds.has(c.id))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c => c.title.toLowerCase().includes(q) || c.class_code.toLowerCase().includes(q) || c.subject?.name?.toLowerCase().includes(q) || c.teacher?.full_name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
    }
    return result
  }, [classes, filter, search, currentUser?.id, enrolledIds])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const mineCount = classes.filter(c => (c.teacher_id ?? c.teacher?.id) === currentUser?.id).length
  const enrolledCount = myEnrolled.filter(c => (c.teacher_id ?? c.teacher?.id) !== currentUser?.id).length
  const otherCount = classes.filter(c => (c.teacher_id ?? c.teacher?.id) !== currentUser?.id && !enrolledIds.has(c.id)).length

  const TABS = isTeacher || isAdmin ? [
    { key: "all",      label: "All",      count: classes.length },
    { key: "mine",     label: "My Classes", count: mineCount },
    { key: "enrolled", label: "Joined",   count: enrolledCount },
    { key: "other",    label: "Discover", count: otherCount },
  ] : [
    { key: "all",      label: "All",      count: classes.length },
    { key: "enrolled", label: "Enrolled", count: enrolledCount },
    { key: "other",    label: "Discover", count: otherCount },
  ]

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "12px 12px 80px" : "20px 20px 48px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
              <GraduationCap size={isMobile ? 20 : 24} style={{ color: "var(--accent)" }} /> Classes
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              {isTeacher || isAdmin ? `${classes.length} classes · ${mineCount} yours · ${enrolledCount} joined` : `${classes.length} classes · ${enrolledCount} enrolled`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => navigate("/discover")}
              style={{ padding: isMobile ? "8px 12px" : "9px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit", color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={13} /> Discover
            </button>
            {(isTeacher || isAdmin) && (
              <button onClick={() => setShowForm(true)}
                style={{ padding: isMobile ? "8px 12px" : "9px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(203,38,228,0.3)" }}>
                <Plus size={13} /> New Class
              </button>
            )}
          </div>
        </div>

        {/* Join error */}
        {joinError && (
          <div style={{ padding: "10px 14px", marginBottom: 12, borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={14} /> {joinError}
            <button onClick={() => setJoinError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}><X size={13} /></button>
          </div>
        )}

        {/* Tabs + Search */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 5, overflowX: "auto", scrollbarWidth: "none" as const, flex: isMobile ? "1 1 100%" : "0 0 auto" }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setFilter(t.key as any); setPage(1) }}
                style={{ padding: "8px 14px", borderRadius: 24, border: `1.5px solid ${filter === t.key ? "var(--accent)" : "var(--border)"}`, background: filter === t.key ? "var(--accent)" : "var(--card)", color: filter === t.key ? "white" : "var(--muted)", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, flexShrink: 0, transition: "all 0.15s" }}>
                {t.label}
                <span style={{ padding: "1px 6px", borderRadius: 999, fontSize: 10, background: filter === t.key ? "rgba(255,255,255,0.25)" : "var(--bg2)", color: filter === t.key ? "white" : "var(--muted)" }}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ flex: 1, minWidth: 180, display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 24, border: "1px solid var(--border)", background: "var(--card)" }}>
            <Search size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search classes..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--text)", width: "100%", fontFamily: "inherit" }} />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><X size={12} /></button>}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ background: "var(--card)", borderRadius: 16, height: 200, border: "1px solid var(--border)", opacity: 0.4, animation: "pulse 1.5s infinite" }} />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && paginated.length === 0 && (
          <div style={{ textAlign: "center", padding: isMobile ? "40px 20px" : "56px 24px", background: "var(--card)", borderRadius: 20, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>
              {search ? `No classes match "${search}"` : filter === "mine" ? "No classes yet" : filter === "enrolled" ? "Not enrolled in any classes" : "No classes found"}
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px" }}>
              {isTeacher && filter === "mine" ? "Create your first class to start teaching." : isLearner ? "Discover and join classes from your teachers." : "Try a different filter."}
            </p>
            {isTeacher && filter !== "enrolled" && (
              <button onClick={() => setShowForm(true)}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Plus size={14} /> Create Class
              </button>
            )}
            {isLearner && (
              <button onClick={() => navigate("/discover")}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={14} /> Discover Classes
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!isLoading && paginated.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
            {paginated.map(cls => (
              <ClassCard key={cls.id} cls={cls} currentUserId={currentUser?.id}
                isTeacher={isTeacher} isAdmin={isAdmin} isLearner={isLearner}
                isMobile={isMobile}
                onOpen={() => navigate(`/classes/:id`)}
                onJoin={() => joinMutation.mutate(cls.id)}
                onLeave={() => { if (window.confirm(`Leave "${cls.title}"?`)) leaveMutation.mutate(cls.id) }}
                onDelete={() => { if (window.confirm(`Delete "${cls.title}"?`)) deleteMutation.mutate(cls.id) }}
                onEdit={() => setShowForm(true)}
                joining={joiningId === cls.id}
                leaving={leavingId === cls.id}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 24 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", cursor: page === 1 ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit", color: page === 1 ? "var(--muted)" : "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronLeft size={14} /> Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${p === page ? "var(--accent)" : "var(--border)"}`, background: p === page ? "var(--accent)" : "var(--card)", color: p === page ? "white" : "var(--text)", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>
                {p}
              </button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", cursor: page === totalPages ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit", color: page === totalPages ? "var(--muted)" : "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--muted)" }}>
            Showing {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length} classes
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (isTeacher || isAdmin) && (
        <CreateClassModal onClose={() => setShowForm(false)} onCreated={() => setShowForm(false)} />
      )}
    </AppShell>
  )
}