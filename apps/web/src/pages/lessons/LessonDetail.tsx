import { useState, useRef, useEffect } from "react"
import RichEditor from "@/components/editor/RichEditor"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useAuthStore } from "@/features/auth/auth.store"
import {
  ChevronLeft, FileText, Video, Link2, BookOpen,
  Eye, Clock, Edit2, Save, X, Share2, MessageCircle,
  Send, Trash2, ExternalLink, Monitor, MonitorOff,
  Mic, MicOff, VideoOff, Users, Copy, CheckCircle2,
  Globe, Lock, MoreVertical
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────
interface LessonResource {
  id: number; resource_type: string; url: string
  title?: string; mime_type?: string
}
interface Lesson {
  id: number; title: string; description?: string; content: string
  class_id: number; subject_id: number; teacher_id: number
  lesson_type: string; visibility: string; status: string
  resources: LessonResource[]; created_at: string; updated_at: string
}
interface Comment {
  id: number; content: string; user_id: number; lesson_id: number
  created_at: string
  author: { id: number; full_name: string; role: string } | null
}
type Props = { lesson: Lesson; onBack: () => void }

// ── Constants ──────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  note:       { label: "Note",       color: "#cb26e4", icon: "­ƒôØ" },
  video:      { label: "Video",      color: "#38bdf8", icon: "­ƒÄÑ" },
  live:       { label: "Live",       color: "#ef4444", icon: "­ƒö┤" },
  assignment: { label: "Assignment", color: "#22c55e", icon: "­ƒôï" },
}
const RESOURCE_ICON: Record<string, React.ReactNode> = {
  file:  <FileText size={14} />,
  image: <Eye size={14} />,
  video: <Video size={14} />,
  link:  <Link2 size={14} />,
}

// ── Helpers ────────────────────────────────────────────────────────
function Avatar({ user, size = 32 }: { user: any; size?: number }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[(user?.full_name?.charCodeAt(0) ?? 0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "white", fontWeight: 800, fontSize: size * 0.38 }}>
      {user?.full_name?.[0]?.toUpperCase() ?? "?"}
    </div>
  )
}

function renderMarkdown(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("# "))  return <h1 key={i} style={{ fontSize: 28, fontWeight: 900, margin: "24px 0 12px", lineHeight: 1.3 }}>{line.slice(2)}</h1>
    if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: 21, fontWeight: 800, margin: "20px 0 8px", color: "var(--accent)", borderBottom: "1px solid var(--border)", paddingBottom: 4 }}>{line.slice(3)}</h2>
    if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 17, fontWeight: 700, margin: "16px 0 6px" }}>{line.slice(4)}</h3>
    if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} style={{ marginLeft: 24, lineHeight: 1.8, marginBottom: 2 }}>{line.slice(2)}</li>
    if (line.startsWith("> ")) return <blockquote key={i} style={{ borderLeft: "4px solid var(--accent)", paddingLeft: 16, margin: "10px 0", color: "var(--muted)", fontStyle: "italic", background: "var(--bg2)", borderRadius: "0 8px 8px 0", padding: "10px 16px" }}>{line.slice(2)}</blockquote>
    if (line.startsWith("---")) return <hr key={i} style={{ border: "none", borderTop: "2px solid var(--border)", margin: "20px 0" }} />
    if (line === "") return <div key={i} style={{ height: 6 }} />
    // Bold inline
    const parts = line.split(/(\*\*.*?\*\*)/g)
    if (parts.length > 1) return <p key={i} style={{ margin: "6px 0", lineHeight: 1.8 }}>{parts.map((p, j) => p.startsWith("**") ? <strong key={j}>{p.slice(2,-2)}</strong> : p)}</p>
    return <p key={i} style={{ margin: "6px 0", lineHeight: 1.8 }}>{line}</p>
  })
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ── Live Presentation ──────────────────────────────────────────────
function LivePresentation({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [slide, setSlide] = useState(0)
  const [copied, setCopied] = useState(false)
  const shareLink = `${window.location.origin}/classes/${lesson.class_id}`
  const videoRef = useRef<HTMLVideoElement>(null)
  const screenRef = useRef<HTMLVideoElement>(null)

  const slides = lesson.content.split("\n")
    .filter(l => l.startsWith("## "))
    .map(l => l.slice(3))
  const contentLines = lesson.content.split("\n")

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(s => { setStream(s); if (videoRef.current) videoRef.current.srcObject = s })
      .catch(() => {})
    return () => { stream?.getTracks().forEach(t => t.stop()); screenStream?.getTracks().forEach(t => t.stop()) }
  }, [])

  const getSlideContent = (title: string) => {
    const start = contentLines.findIndex(l => l === `## ${title}`)
    if (start < 0) return []
    const end = contentLines.findIndex((l, i) => i > start && l.startsWith("## "))
    return contentLines
      .slice(start + 1, end < 0 ? undefined : end)
      .filter(l => l.trim())
      .map(l => l
        .replace(/^[-*ÔÇó]\s+/, "")        // remove bullet markers
        .replace(/^\d+\.\s+/, "")         // remove numbered list markers
        .replace(/^#+\s+/, "")            // remove heading markers
        .replace(/\*\*(.*?)\*\*/g, "$1")  // remove bold markers
        .trim()
      )
      .filter(l => l.length > 0)
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#08080f", zIndex: 2000, display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
          <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>LIVE ┬À {lesson.title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)", cursor: "pointer" }}
            onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
            <Users size={12} style={{ color: "#38bdf8" }} />
            <span style={{ color: "#38bdf8", fontSize: 11, fontWeight: 700 }}>Copy Invite</span>
            {copied && <CheckCircle2 size={12} style={{ color: "#22c55e" }} />}
          </div>
          <button onClick={onClose} style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#fb7185", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
            End
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Main stage */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #12002a 0%, #08080f 100%)", position: "relative" }}>
          {sharing && screenStream ? (
            <video ref={screenRef} autoPlay muted style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : slides.length > 0 ? (
            <div style={{ maxWidth: 800, width: "100%", padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
                {slide + 1} / {slides.length}
              </div>
              <h1 style={{ color: "white", fontSize: 42, fontWeight: 900, marginBottom: 36, lineHeight: 1.2 }}>
                {slides[slide]}
              </h1>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", maxWidth: 600, margin: "0 auto" }}>
                {getSlideContent(slides[slide]).slice(0, 7).map((line, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, color: "rgba(255,255,255,0.82)", fontSize: 18, lineHeight: 1.6, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color: "#cb26e4", fontSize: 22, lineHeight: 1.3, flexShrink: 0 }}>Ôùå</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
              {/* Nav */}
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 44 }}>
                <button disabled={slide === 0} onClick={() => setSlide(s => s - 1)}
                  style={{ padding: "10px 28px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", cursor: slide === 0 ? "not-allowed" : "pointer", opacity: slide === 0 ? 0.35 : 1, fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>
                  ÔåÉ Prev
                </button>
                <button disabled={slide === slides.length - 1} onClick={() => setSlide(s => s + 1)}
                  style={{ padding: "10px 28px", borderRadius: 10, border: "1px solid rgba(203,38,228,0.4)", background: "rgba(203,38,228,0.12)", color: "#d946ef", cursor: slide === slides.length - 1 ? "not-allowed" : "pointer", opacity: slide === slides.length - 1 ? 0.35 : 1, fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>
                  Next ÔåÆ
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>­ƒôÜ</div>
              <h2 style={{ color: "white", marginBottom: 8 }}>{lesson.title}</h2>
              <p style={{ fontSize: 14 }}>Add ## headings in your content to create slides.</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>Or share your screen to present external content.</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ width: 240, background: "rgba(255,255,255,0.02)", borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }}>
          {/* Camera */}
          <div style={{ position: "relative", aspectRatio: "4/3", background: "#0a0a12", overflow: "hidden" }}>
            <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: camOn ? "block" : "none" }} />
            {!camOn && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <VideoOff size={28} style={{ color: "rgba(255,255,255,0.2)" }} />
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Mic + Cam */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { on: micOn, toggle: () => { stream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled }); setMicOn(m => !m) }, icon: micOn ? <Mic size={15} /> : <MicOff size={15} />, label: micOn ? "Mute" : "Unmute" },
                { on: camOn, toggle: () => { stream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled }); setCamOn(c => !c) }, icon: camOn ? <Video size={15} /> : <VideoOff size={15} />, label: camOn ? "Hide" : "Show" },
              ].map((c, i) => (
                <button key={i} onClick={c.toggle}
                  style={{ padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", background: c.on ? "rgba(255,255,255,0.07)" : "rgba(239,68,68,0.2)", color: c.on ? "rgba(255,255,255,0.8)" : "#fb7185", fontFamily: "inherit", fontSize: 11, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {/* Screen share */}
            <button onClick={async () => {
              if (sharing) { screenStream?.getTracks().forEach(t => t.stop()); setScreenStream(null); setSharing(false) }
              else {
                try {
                  const s = await (navigator.mediaDevices as any).getDisplayMedia({ video: true })
                  setScreenStream(s); setSharing(true)
                  if (screenRef.current) screenRef.current.srcObject = s
                  s.getVideoTracks()[0].onended = () => { setSharing(false); setScreenStream(null) }
                } catch {}
              }
            }}
              style={{ padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", background: sharing ? "rgba(34,197,94,0.15)" : "rgba(56,189,248,0.1)", color: sharing ? "#34d399" : "#38bdf8", fontFamily: "inherit", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {sharing ? <><MonitorOff size={14} /> Stop Sharing</> : <><Monitor size={14} /> Share Screen</>}
            </button>

            {/* Slide list */}
            {slides.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Slides</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                  {slides.map((s, i) => (
                    <button key={i} onClick={() => setSlide(i)}
                      style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${i === slide ? "rgba(203,38,228,0.4)" : "rgba(255,255,255,0.06)"}`, background: i === slide ? "rgba(203,38,228,0.12)" : "transparent", color: i === slide ? "#d946ef" : "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 11, fontWeight: 600, textAlign: "left", fontFamily: "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {i + 1}. {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────
export default function LessonDetail({ lesson, onBack }: Props) {
  const { isTeacher, isAdmin, isLearner } = useAuth()
  const currentUser = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const commentInputRef = useRef<HTMLInputElement>(null)

  // State
  const [tab, setTab] = useState<"content" | "discussion" | "resources">("content")
  const [editing, setEditing] = useState(false)
  const [liveMode, setLiveMode] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareDone, setShareDone] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  const [editForm, setEditForm] = useState({
    title: lesson.title,
    description: lesson.description ?? "",
    content: lesson.content,
    status: lesson.status,
    visibility: lesson.visibility,
    lesson_type: lesson.lesson_type,
  })

  // Queries
  const { data: fresh, refetch } = useQuery({
    queryKey: ["lesson", lesson.id],
    queryFn: async () => (await api.get(`/lessons/${lesson.id}`)).data as Lesson,
    initialData: lesson,
    staleTime: 30000,
  })

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["lesson-discussion", lesson.id],
    queryFn: async () => {
      const res = await api.get(`/lessons/${lesson.id}/discussion`).catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data as Comment[] : []
    },
    enabled: tab === "discussion",
  })

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async (data: any) => api.patch(`/lessons/${lesson.id}`, data),
    onMutate: () => setSaveStatus("saving"),
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      setSaveStatus("saved")
      setTimeout(() => { setSaveStatus("idle"); setEditing(false) }, 1200)
    },
    onError: () => { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 2000) },
  })

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => api.post(`/lessons/${lesson.id}/discussion`, { content }),
    onSuccess: () => { setCommentText(""); refetchComments() },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async (cid: number) => api.delete(`/lessons/${lesson.id}/discussion/${cid}`),
    onSuccess: () => refetchComments(),
  })

  const shareToFeed = async () => {
    setShareLoading(true)
    try {
      const joinUrl = `${window.location.origin}/classes/discover`
      const content = [
        `­ƒôÜ **${fresh.title}**`,
        fresh.description || fresh.content.slice(0, 200) + "...",
        `­ƒÄô Join the class to access the full lesson!`,
        `­ƒöù ${joinUrl}`,
      ].join("\n\n")
      await api.post("/posts", { content, post_type: "note", visibility: "public", title: `­ƒôÜ ${fresh.title}` })
      setShareDone(true)
      setTimeout(() => setShareDone(false), 3000)
    } catch {}
    setShareLoading(false)
  }

  // Derived
  const l = fresh ?? lesson
  const tc = TYPE_CONFIG[l.lesson_type] ?? { label: l.lesson_type, color: "var(--accent)", icon: "­ƒôä" }
  const wordCount = l.content.split(/\s+/).filter(Boolean).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))
  const slides = l.content.split("\n").filter(line => line.startsWith("## ")).map(l => l.slice(3))
  const canEdit = (isTeacher && l.teacher_id === currentUser?.id) || !!isAdmin
  const isOwner = l.teacher_id === currentUser?.id
  const canShare = true

  // Check if user is enrolled in this lesson class (works for learners AND teachers who joined)
  const { data: enrolledClasses = [] } = useQuery({
    queryKey: ["classes-enrolled"],
    queryFn: async () => {
      const res = await api.get("/classes/enrolled").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 60000,
  })
  const isEnrolledInClass = enrolledClasses.some((c: any) => c.id === l.class_id)

  // isMember: owner, admin, OR enrolled (learner/teacher who joined this class)
  const isMember = isOwner || !!isAdmin || isEnrolledInClass

  return (
    <>
      {liveMode && <LivePresentation lesson={l} onClose={() => setLiveMode(false)} />}

      <AppShell>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 48px" }}>

          {/* ── Back + Breadcrumb ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <button className="btn" onClick={onBack} style={{ fontSize: 13, padding: "7px 14px" }}>
              <ChevronLeft size={15} /> Back
            </button>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>Lessons</span>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>ÔÇ║</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{l.title}</span>
          </div>

          {/* ── EDITING MODE ── */}
          {editing ? (
            <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
              {/* Edit header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Edit2 size={16} style={{ color: "var(--accent)" }} />
                  <span style={{ fontWeight: 800, fontSize: 15 }}>Editing Lesson</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {saveStatus === "saving" && <span style={{ fontSize: 12, color: "var(--muted)" }}>Saving...</span>}
                  {saveStatus === "saved"  && <span style={{ fontSize: 12, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={13} /> Saved</span>}
                  {saveStatus === "error"  && <span style={{ fontSize: 12, color: "var(--danger)" }}>Save failed</span>}
                  <button className="btn" style={{ fontSize: 12 }} onClick={() => setEditing(false)}>
                    <X size={13} /> Cancel
                  </button>
                  <button className="btn btn-primary" style={{ fontSize: 12 }}
                    onClick={() => updateMutation.mutate(editForm)}
                    disabled={updateMutation.isPending}>
                    <Save size={13} /> {updateMutation.isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Row 1: Title + Description */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                  <div className="form-field">
                    <label className="form-label">Title</label>
                    <input className="audit-control" value={editForm.title}
                      onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="Lesson title..." />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Description</label>
                    <input className="audit-control" value={editForm.description}
                      onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Brief overview..." />
                  </div>
                </div>

                {/* Row 2: Type + Status + Visibility */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div className="form-field">
                    <label className="form-label">Type</label>
                    <select className="audit-control select" value={editForm.lesson_type}
                      onChange={e => setEditForm(p => ({ ...p, lesson_type: e.target.value }))}>
                      <option value="note">­ƒôØ Note</option>
                      <option value="video">­ƒÄÑ Video</option>
                      <option value="live">­ƒö┤ Live</option>
                      <option value="assignment">­ƒôï Assignment</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Status</label>
                    <select className="audit-control select" value={editForm.status}
                      onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Visibility</label>
                    <select className="audit-control select" value={editForm.visibility}
                      onChange={e => setEditForm(p => ({ ...p, visibility: e.target.value }))}>
                      <option value="class">­ƒöÆ Class only</option>
                      <option value="public">­ƒîÉ Public</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Rich Editor */}
                <div className="form-field">
                  <label className="form-label" style={{ marginBottom: 8 }}>
                    Content
                    {slides.length > 0 && <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginLeft: 10 }}>┬À {slides.length} slide sections detected (## headings)</span>}
                  </label>
                  <RichEditor
                    value={editForm.content}
                    onChange={(md) => setEditForm(p => ({ ...p, content: md }))}
                    placeholder="Write lesson content..."
                    minHeight={340}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ── VIEW HEADER ── */
            <div className="card" style={{ padding: "20px 24px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                {/* Left: type icon */}
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${tc.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0, border: `1px solid ${tc.color}25` }}>
                  {tc.icon}
                </div>

                {/* Center: info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Chips */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${tc.color}15`, color: tc.color, border: `1px solid ${tc.color}25` }}>
                      {tc.icon} {tc.label}
                    </span>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: l.status === "published" ? "rgba(34,197,94,0.12)" : "var(--bg2)", color: l.status === "published" ? "var(--success)" : "var(--muted)" }}>
                      {l.status}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)" }}>
                      {l.visibility === "public" ? <Globe size={11} /> : <Lock size={11} />}
                      {l.visibility}
                    </span>
                    {slides.length > 0 && (
                      <span className="chip" style={{ fontSize: 11 }}>­ƒôè {slides.length} slides</span>
                    )}
                  </div>

                  <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", lineHeight: 1.3 }}>{l.title}</h1>
                  {l.description && <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 10px", lineHeight: 1.5 }}>{l.description}</p>}

                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {readTime} min read</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><BookOpen size={11} /> {wordCount} words</span>
                    <span>Class #{l.class_id}</span>
                    <span>Updated {new Date(l.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>

                {/* Right: actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                  {canEdit && (
                    <button className="btn" style={{ fontSize: 12, padding: "7px 14px", background: "rgba(239,68,68,0.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}
                      onClick={() => setLiveMode(true)}>
                      ­ƒö┤ Go Live
                    </button>
                  )}
                  <button className="btn" style={{ fontSize: 12, padding: "7px 14px" }}
                    onClick={shareToFeed} disabled={shareLoading}>
                    {shareDone ? <><CheckCircle2 size={13} /> Shared!</> : shareLoading ? "Sharing..." : <><Share2 size={13} /> Share</>}
                  </button>
                  {canEdit && (
                    <button className="btn" style={{ fontSize: 12, padding: "7px 14px" }}
                      onClick={() => setEditing(true)}>
                      <Edit2 size={13} /> Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TABS ── */}
          {!editing && (
            <>
              <div className="tabs-bar" style={{ marginBottom: 16 }}>
                <button className={`tab-btn ${tab === "content" ? "active" : ""}`} onClick={() => setTab("content")}>
                  ­ƒôû Content
                </button>
                <button className={`tab-btn ${tab === "discussion" ? "active" : ""}`} onClick={() => setTab("discussion")}>
                  ­ƒÆ¼ Discussion {comments.length > 0 && <span style={{ marginLeft: 4, padding: "1px 7px", borderRadius: 999, fontSize: 10, background: "var(--accent)", color: "white" }}>{comments.length}</span>}
                </button>
                <button className={`tab-btn ${tab === "resources" ? "active" : ""}`} onClick={() => setTab("resources")}>
                  ­ƒöù Resources {l.resources.length > 0 && <span style={{ marginLeft: 4, padding: "1px 7px", borderRadius: 999, fontSize: 10, background: "var(--bg2)", color: "var(--muted)" }}>{l.resources.length}</span>}
                </button>
              </div>

              {/* ── CONTENT TAB ── */}
              {tab === "content" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Slide overview */}
                  {slides.length > 0 && (
                    <div className="card" style={{ padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <span style={{ fontWeight: 800, fontSize: 14 }}>­ƒôè Slide Sections</span>
                        {canEdit && (
                          <button className="btn" style={{ fontSize: 11, padding: "4px 12px", background: "rgba(239,68,68,0.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }} onClick={() => setLiveMode(true)}>
                            ­ƒö┤ Present
                          </button>
                        )}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                        {slides.map((s, i) => (
                          <div key={i} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", fontSize: 13 }}>
                            <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, marginBottom: 3 }}>SLIDE {i + 1}</div>
                            <div style={{ fontWeight: 700 }}>{s}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lesson content */}
                  <div className="card" style={{ padding: "24px 28px" }}>
                    <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text)" }}>
                      {renderMarkdown(l.content)}
                    </div>
                  </div>

                  {/* Share card */}
                  <div className="card" style={{ padding: 18, borderLeft: `3px solid ${tc.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>­ƒôó Share this lesson</div>
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>Share a preview to the class feed so others can discover and join.</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={shareToFeed} disabled={shareLoading}>
                          <Share2 size={13} /> {shareLoading ? "Sharing..." : "Share to Feed"}
                        </button>
                        <button className="btn" style={{ fontSize: 12 }}
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/lessons/${l.id}`).then(() => alert("Link copied!"))}>
                          <Link2 size={13} /> Copy Link
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── DISCUSSION TAB ÔÇö WhatsApp Style ── */}
              {tab === "discussion" && (
                (() => {
                  const isClassOnly = l.visibility === "class"
                  const canChat = !isClassOnly || canEdit || isMember
                  if (!canChat) {
                    return (
                      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                          <MessageCircle size={16} style={{ color: "#cb26e4" }} />
                          <span style={{ fontWeight: 800 }}>Discussion</span>
                        </div>
                        <div style={{ textAlign: "center", padding: "48px 24px" }}>
                          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(203,38,228,0.1)", border: "2px solid rgba(203,38,228,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                            <Lock size={28} style={{ color: "#cb26e4" }} />
                          </div>
                          <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 8px" }}>Members only discussion</h3>
                          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
                            This lesson discussion is available to class members only.<br />
                            Join the class to participate in the conversation.
                          </p>
                          <a href="/classes" style={{ display: "inline-block", padding: "11px 24px", borderRadius: 11, background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                            View Classes
                          </a>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div style={{ display: "flex", flexDirection: "column", height: "58vh", minHeight: 380, background: "var(--bg2)", borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }}>
                      {/* Chat header */}
                      <div style={{ padding: "12px 16px", background: "var(--card)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <MessageCircle size={16} style={{ color: "white" }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>Lesson Discussion</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {l.visibility === "public" ? "­ƒîÉ Public lesson ┬À Anyone can discuss" : "­ƒöÆ Class members only"}
                          </div>
                        </div>
                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", animation: "pulse 2s infinite" }} />
                          <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 700 }}>Live</span>
                        </div>
                      </div>

                      {/* Messages */}
                      <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
                        {comments.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                            <MessageCircle size={32} style={{ opacity: 0.25, marginBottom: 10 }} />
                            <div style={{ fontSize: 14, fontWeight: 600 }}>No messages yet</div>
                            <div style={{ fontSize: 13, marginTop: 4 }}>Start the discussion! ­ƒÆ¼</div>
                          </div>
                        ) : comments.map((c, i) => {
                          const isMe = c.user_id === currentUser?.id || c.author?.id === currentUser?.id
                          const prevSame = i > 0 && comments[i-1].user_id === c.user_id
                          const showMeta = !isMe && !prevSame
                          return (
                            <div key={c.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: 6, marginBottom: 2 }}>
                              {!isMe && (
                                <div style={{ width: 26, flexShrink: 0 }}>
                                  {showMeta && <Avatar user={c.author} size={26} />}
                                </div>
                              )}
                              <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                                {showMeta && (
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "#cb26e4", marginBottom: 2, paddingLeft: 4 }}>
                                    {c.author?.full_name ?? "Unknown"}
                                    {c.author?.role && c.author.role !== "learner" && (
                                      <span style={{ marginLeft: 5, fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "rgba(203,38,228,0.12)", color: "#cb26e4" }}>{c.author.role}</span>
                                    )}
                                  </div>
                                )}
                                <div style={{ padding: "8px 12px", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: isMe ? "linear-gradient(135deg,#cb26e4,#8b5cf6)" : "var(--card)", color: isMe ? "white" : "var(--text)", border: isMe ? "none" : "1px solid var(--border)", fontSize: 14, lineHeight: 1.5, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
                                  {c.content}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 4, paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0 }}>
                                  {timeAgo(c.created_at)}
                                  {isMe && <CheckCircle2 size={9} style={{ color: "var(--success)" }} />}
                                  {(c.user_id === currentUser?.id || isAdmin || isTeacher) && (
                                    <button onClick={() => deleteCommentMutation.mutate(c.id)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "1px 3px", borderRadius: 3, display: "flex", alignItems: "center" }}
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--danger)"}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}>
                                      <Trash2 size={10} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={commentInputRef as any} />
                      </div>

                      {/* Input */}
                      <div style={{ padding: "10px 12px", background: "var(--card)", borderTop: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "center" }}>
                        <Avatar user={currentUser} size={32} />
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 24, border: "1px solid var(--border)", background: "var(--bg2)" }}
                          onFocusCapture={e => e.currentTarget.style.borderColor = "var(--accent)"}
                          onBlurCapture={e => e.currentTarget.style.borderColor = "var(--border)"}>
                          <input value={commentText} onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && commentText.trim()) { e.preventDefault(); addCommentMutation.mutate(commentText) }}}
                            placeholder="Type a message..."
                            style={{ flex: 1, border: "none", background: "transparent", color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
                          {commentText.trim() && (
                            <button onClick={() => addCommentMutation.mutate(commentText)} disabled={addCommentMutation.isPending}
                              style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <Send size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()
              )}

              {/* ── RESOURCES TAB ── */}
              {tab === "resources" && (
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>­ƒöù Lesson Resources</div>
                  {l.resources.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "36px 0", color: "var(--muted)" }}>
                      <Link2 size={36} style={{ marginBottom: 10, opacity: 0.3 }} />
                      <div style={{ fontSize: 14, fontWeight: 600 }}>No resources attached</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>Resources will appear here when added.</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {l.resources.map(res => (
                        <a key={res.id} href={res.url} target="_blank" rel="noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)", textDecoration: "none", color: "var(--text)", transition: "all 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 4%, var(--bg2))" }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--bg2)" }}>
                          <span style={{ color: "var(--accent)", flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {RESOURCE_ICON[res.resource_type] ?? <Link2 size={14} />}
                          </span>
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, fontWeight: 600 }}>
                            {res.title ?? res.url}
                          </span>
                          <ExternalLink size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </AppShell>
    </>
  )
}
