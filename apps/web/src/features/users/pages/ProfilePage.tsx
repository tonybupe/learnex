import { useParams, useNavigate } from "react-router-dom"
import { useState, useRef } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import {
  MapPin, Globe, Briefcase, Building, Calendar, Edit2,
  Users, BookOpen, FileText, MessageCircle, UserPlus,
  UserMinus, CheckCircle, Camera, Link2
} from "lucide-react"

interface Profile {
  avatar_url?: string | null; cover_url?: string | null; bio?: string | null
  location?: string | null; country?: string | null; profession?: string | null
  organization?: string | null; website?: string | null
  skills?: Record<string, any>; interests?: Record<string, any>
}
interface UserData {
  id: number; full_name: string; email: string; phone_number?: string
  sex?: string; role: string; is_active: boolean; is_verified: boolean
  followers_count: number; following_count: number
  profile?: Profile; created_at: string
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  teacher: { label: "Teacher", color: "#cb26e4", bg: "#cb26e415", icon: "🎓" },
  learner: { label: "Learner", color: "#38bdf8", bg: "#38bdf815", icon: "📚" },
  admin:   { label: "Admin",   color: "#ef4444", bg: "#ef444415", icon: "⚙️" },
}

function getBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") || "http://localhost:8000"
}

function resolveUrl(url?: string | null) {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `${getBaseUrl()}${url}`
}

function Avatar({ name, size = 80, url, onClick }: { name: string; size?: number; url?: string | null; onClick?: () => void }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[name?.charCodeAt(0) % colors.length]
  const resolved = resolveUrl(url)
  const style: React.CSSProperties = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    border: "4px solid var(--card)", cursor: onClick ? "pointer" : "default",
    objectFit: "cover" as const
  }
  if (resolved) return <img src={resolved} alt={name} style={style} onClick={onClick} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
  return (
    <div onClick={onClick} style={{ ...style, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

function UploadOverlay({ onUpload, children }: { onUpload: (file: File) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {children}
      <button onClick={() => ref.current?.click()}
        style={{ position: "absolute", bottom: 4, right: 4, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "2px solid white", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Camera size={14} />
      </button>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
    </div>
  )
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<"about"|"posts">("about")
  const [isFollowing, setIsFollowing] = useState(false)
  const [uploading, setUploading] = useState<"avatar"|"cover"|null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const id = Number(userId)
  const isOwn = currentUser?.id === id

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => { const res = await api.get(`/users/${id}`); return res.data as UserData },
    enabled: !!id,
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ type, file }: { type: "avatar"|"cover"; file: File }) => {
      setUploading(type)
      const form = new FormData()
      form.append("file", file)
      const res = await api.post(`/users/me/${type}`, form, { headers: { "Content-Type": "multipart/form-data" } })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] })
      queryClient.invalidateQueries({ queryKey: ["me"] })
      setUploading(null)
    },
    onError: () => setUploading(null),
  })

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) await api.delete(`/social/follow/${id}`)
      else await api.post(`/social/follow/${id}`)
    },
    onSuccess: () => { setIsFollowing(f => !f); queryClient.invalidateQueries({ queryKey: ["user", id] }) }
  })

  if (isLoading) return (
    <AppShell>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px" }}>
        <div className="card" style={{ height: 400, opacity: 0.4 }} />
      </div>
    </AppShell>
  )

  if (!user) return (
    <AppShell>
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 64 }}>👤</div>
        <h2>User not found</h2>
        <button className="btn" onClick={() => navigate(-1)}>Go back</button>
      </div>
    </AppShell>
  )

  const rc = ROLE_CONFIG[user.role] ?? { label: user.role, color: "var(--muted)", bg: "var(--bg2)", icon: "👤" }
  const p = user.profile ?? {}
  const coverUrl = resolveUrl(p.cover_url)
  const safeDate = (s?: string) => { try { const d = new Date(s ?? ""); return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) } catch { return "" } }

  return (
    <AppShell>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 0 40px" }}>

        {/* ── COVER PHOTO ── */}
        <div style={{ position: "relative", height: 280, background: coverUrl ? "transparent" : `linear-gradient(135deg, ${rc.color}cc, var(--accent2)cc)`, borderRadius: "0 0 0 0", overflow: "hidden" }}>
          {coverUrl && <img src={coverUrl} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}

          {/* Cover gradient overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.5))" }} />

          {/* Cover upload button (own profile) */}
          {isOwn && (
            <>
              <button onClick={() => coverInputRef.current?.click()}
                style={{ position: "absolute", bottom: 16, right: 16, display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700, backdropFilter: "blur(4px)" }}>
                {uploading === "cover" ? <div className="spinner-small" /> : <Camera size={16} />}
                {uploading === "cover" ? "Uploading..." : "Change cover photo"}
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate({ type: "cover", file: f }) }} />
            </>
          )}
        </div>

        {/* ── PROFILE HEADER ── */}
        <div className="card" style={{ borderRadius: 0, borderTop: "none", padding: "0 24px 20px" }}>
          {/* Avatar row */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div style={{ marginTop: -56, position: "relative" }}>
              {isOwn ? (
                <UploadOverlay onUpload={file => uploadMutation.mutate({ type: "avatar", file })}>
                  {uploading === "avatar"
                    ? <div style={{ width: 108, height: 108, borderRadius: "50%", border: "4px solid var(--card)", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>
                    : <Avatar name={user.full_name} size={108} url={p.avatar_url} />
                  }
                </UploadOverlay>
              ) : (
                <Avatar name={user.full_name} size={108} url={p.avatar_url} />
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, paddingTop: 12, flexWrap: "wrap" }}>
              {isOwn ? (
                <>
                  <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => navigate("/settings")}>
                    <Edit2 size={14} /> Edit Profile
                  </button>
                  <button className="btn" style={{ fontSize: 13 }} onClick={() => navigate("/analytics")}>
                    📊 Analytics
                  </button>
                </>
              ) : (
                <>
                  <button className={`btn ${isFollowing ? "" : "btn-primary"}`} style={{ fontSize: 13 }}
                    onClick={() => followMutation.mutate()} disabled={followMutation.isPending}>
                    {isFollowing ? <><UserMinus size={14} /> Unfollow</> : <><UserPlus size={14} /> Follow</>}
                  </button>
                  <button className="btn" style={{ fontSize: 13 }} onClick={() => navigate("/messages")}>
                    <MessageCircle size={14} /> Message
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name + Role */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{user.full_name}</h1>
              {user.is_verified && <CheckCircle size={20} style={{ color: "var(--accent)" }} title="Verified" />}
              <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.color}40` }}>
                {rc.icon} {rc.label}
              </span>
              {isOwn && <span style={{ fontSize: 12, color: "var(--muted)" }}>• You</span>}
            </div>

            {p.bio && <p style={{ color: "var(--text)", fontSize: 15, margin: "0 0 10px", lineHeight: 1.6, maxWidth: 600 }}>{p.bio}</p>}

            {/* Meta row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "var(--muted)" }}>
              {(p.location || p.country) && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <MapPin size={14} /> {[p.location, p.country].filter(Boolean).join(", ")}
                </span>
              )}
              {p.profession && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Briefcase size={14} /> {p.profession}</span>}
              {p.organization && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Building size={14} /> {p.organization}</span>}
              {p.website && (
                <a href={p.website} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--accent)", textDecoration: "none" }}>
                  <Globe size={14} /> {p.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {user.created_at && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={14} /> Joined {safeDate(user.created_at)}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 0, borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 4 }}>
            {[
              { label: "Followers", value: user.followers_count, onClick: () => {} },
              { label: "Following", value: user.following_count, onClick: () => {} },
            ].map((s, i) => (
              <button key={s.label} onClick={s.onClick}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 20px 4px 0", textAlign: "left" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>{s.value}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{s.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="tabs-bar" style={{ borderRadius: 0, margin: "0", borderTop: "none" }}>
          {[
            { key: "about", label: "About", icon: "👤" },
            { key: "posts", label: "Posts", icon: "📝" },
          ].map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key as any)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <div style={{ padding: "16px 0", display: "flex", gap: 16, alignItems: "start" }}>

          {/* ABOUT TAB */}
          {tab === "about" && (
            <>
              {/* Left - Intro */}
              <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Intro</div>
                  {[
                    { icon: <Briefcase size={16} />, value: p.profession },
                    { icon: <Building size={16} />, value: p.organization },
                    { icon: <MapPin size={16} />, value: [p.location, p.country].filter(Boolean).join(", ") },
                    { icon: <Globe size={16} />, value: p.website, isLink: true },
                    { icon: <Calendar size={16} />, value: `Joined ${safeDate(user.created_at)}` },
                  ].filter(r => r.value).map((row, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 14, color: "var(--text)" }}>
                      <span style={{ color: "var(--muted)", flexShrink: 0 }}>{row.icon}</span>
                      {row.isLink
                        ? <a href={row.value as string} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>{(row.value as string).replace(/^https?:\/\//, "")}</a>
                        : <span>{row.value}</span>
                      }
                    </div>
                  ))}
                  {isOwn && (
                    <button className="btn" style={{ width: "100%", marginTop: 12, fontSize: 13 }}
                      onClick={() => navigate("/settings")}>
                      <Edit2 size={14} /> Edit Intro
                    </button>
                  )}
                </div>

                {/* Skills */}
                {p.skills && Object.keys(p.skills).length > 0 && (
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>⚡ Skills</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {Object.keys(p.skills).map(skill => (
                        <span key={skill} className="chip" style={{ fontSize: 13 }}>{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {p.interests && Object.keys(p.interests).length > 0 && (
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>🎯 Interests</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {Object.keys(p.interests).map(i => (
                        <span key={i} className="chip" style={{ fontSize: 13 }}>{i}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Role-specific quick actions */}
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
                    {rc.icon} {rc.label} Actions
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {user.role === "teacher" && [
                      { label: "My Classes", icon: <Users size={14} />, path: "/classes" },
                      { label: "My Lessons", icon: <BookOpen size={14} />, path: "/lessons" },
                      { label: "My Quizzes", icon: <FileText size={14} />, path: "/quizzes" },
                    ].map(a => (
                      <button key={a.label} className="btn" style={{ fontSize: 13, justifyContent: "flex-start", gap: 8 }}
                        onClick={() => navigate(a.path)}>
                        {a.icon} {a.label}
                      </button>
                    ))}
                    {user.role === "learner" && [
                      { label: "My Classes", icon: <Users size={14} />, path: "/classes" },
                      { label: "Take Quizzes", icon: <FileText size={14} />, path: "/quizzes" },
                      { label: "Browse Lessons", icon: <BookOpen size={14} />, path: "/lessons" },
                    ].map(a => (
                      <button key={a.label} className="btn" style={{ fontSize: 13, justifyContent: "flex-start", gap: 8 }}
                        onClick={() => navigate(a.path)}>
                        {a.icon} {a.label}
                      </button>
                    ))}
                    {user.role === "admin" && [
                      { label: "Platform Analytics", icon: <FileText size={14} />, path: "/analytics" },
                      { label: "Manage Users", icon: <Users size={14} />, path: "/admin/dashboard" },
                    ].map(a => (
                      <button key={a.label} className="btn" style={{ fontSize: 13, justifyContent: "flex-start", gap: 8 }}
                        onClick={() => navigate(a.path)}>
                        {a.icon} {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right - Account details */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Account Details</div>
                  {[
                    { label: "Full Name",   value: user.full_name },
                    { label: "Email",       value: user.email },
                    { label: "Phone",       value: user.phone_number || "—" },
                    { label: "Gender",      value: user.sex || "—" },
                    { label: "Role",        value: `${rc.icon} ${rc.label}`, color: rc.color },
                    { label: "Status",      value: user.is_active ? "✅ Active" : "❌ Inactive", color: user.is_active ? "var(--success)" : "var(--danger)" },
                    { label: "Verified",    value: user.is_verified ? "✅ Verified" : "⏳ Not verified" },
                    { label: "Member since", value: safeDate(user.created_at) || "—" },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{row.label}</span>
                      <span style={{ fontWeight: 700, color: (row as any).color || "var(--text)" }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Role privileges card */}
                <div className="card" style={{ padding: 20, borderLeft: `4px solid ${rc.color}` }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: rc.color, marginBottom: 8 }}>
                    {rc.icon} {rc.label} Privileges
                  </div>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.7 }}>
                    {user.role === "teacher" && "Can create and manage classes, publish lessons and quizzes, schedule live sessions, and monitor learner progress across all enrolled classes."}
                    {user.role === "learner" && "Can join public and private classes, take quizzes, view lessons, attend live sessions, post in class discussions, and track personal learning progress."}
                    {user.role === "admin"   && "Has full platform access — can manage all users, moderate content, view platform-wide analytics, and configure system settings."}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* POSTS TAB */}
          {tab === "posts" && (
            <div style={{ flex: 1 }}>
              <div className="card" style={{ textAlign: "center", padding: 48 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                <h3 style={{ margin: "0 0 8px" }}>Posts coming soon</h3>
                <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
                  User posts will appear here
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}