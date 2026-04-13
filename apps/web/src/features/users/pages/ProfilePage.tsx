import { useParams, useNavigate } from "react-router-dom"
import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import {
  MapPin, Globe, Briefcase, Building, Calendar, Edit2,
  Users, BookOpen, FileText, MessageCircle, UserPlus,
  UserMinus, CheckCircle, Camera, Link2, X
} from "lucide-react"

interface Profile {
  avatar_url?: string | null; cover_url?: string | null; bio?: string | null
  location?: string | null; country?: string | null; profession?: string | null
  organization?: string | null; website?: string | null
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

function getBaseUrl() { return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1","") || "http://localhost:8000" }
function resolveUrl(url?: string | null) {
  if (!url || !url.trim()) return null
  if (url.startsWith("http")) return url
  return `${getBaseUrl()}${url}`
}

function Avatar({ name, size = 80, url, onClick }: { name: string; size?: number; url?: string | null; onClick?: () => void }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[name?.charCodeAt(0) % colors.length]
  const resolved = resolveUrl(url)
  const style: React.CSSProperties = { width: size, height: size, borderRadius: "50%", border: "4px solid var(--card)", cursor: onClick ? "pointer" : "default", flexShrink: 0, objectFit: "cover" as const }
  if (resolved) return <img src={resolved} alt={name} style={style} onClick={onClick} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
  return (
    <div onClick={onClick} style={{ ...style, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

function UserListModal({ title, userId, type, onClose }: { title: string; userId: number; type: "followers"|"following"; onClose: () => void }) {
  const navigate = useNavigate()
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["user-list", userId, type],
    queryFn: async () => {
      const endpoint = type === "followers" ? endpoints.social.followers(userId) : endpoints.social.following(userId)
      const res = await api.get(endpoint)
      return Array.isArray(res.data) ? res.data : []
    }
  })

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", z: 1000, zIndex: 1000, padding: 16 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, width: "100%", maxWidth: 400, maxHeight: "70vh", display: "flex", flexDirection: "column", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {isLoading && <div style={{ textAlign: "center", padding: 32 }}><div className="spinner" style={{ margin: "0 auto" }} /></div>}
          {!isLoading && users.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--muted)", fontSize: 14 }}>No {type} yet</div>}
          {users.map((u: any) => {
            const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
            const color = colors[u.full_name?.charCodeAt(0) % colors.length]
            return (
              <div key={u.id} onClick={() => { navigate(`/profile/${u.id}`); onClose() }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                  {u.full_name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.full_name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{u.role}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<"about"|"posts">("about")
  const [modal, setModal] = useState<"followers"|"following"|null>(null)

  const id = Number(userId)
  const isOwn = currentUser?.id === id

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => { const res = await api.get(`/users/${id}`); return res.data as UserData },
    enabled: !!id,
  })

  // Check if current user follows this user
  const { data: followStats } = useQuery({
    queryKey: ["follow-stats", id],
    queryFn: async () => { const res = await api.get(endpoints.social.stats(id)); return res.data },
    enabled: !!id && !isOwn,
    retry: false,
  })

  const isFollowing = followStats?.is_following ?? false

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) await api.delete(endpoints.social.follow(id))
      else await api.post(endpoints.social.follow(id), {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] })
      queryClient.invalidateQueries({ queryKey: ["follow-stats", id] })
    }
  })

  const startMessage = async () => {
    try {
      const res = await api.post("/messaging/direct", { recipient_user_id: id })
      navigate("/messages")
    } catch { navigate("/messages") }
  }

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

  const safeDate = (s?: string) => {
    try { const d = new Date(s ?? ""); return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) } catch { return "" }
  }

  return (
    <AppShell>
      {/* Follower/Following Modal */}
      {modal && <UserListModal title={modal === "followers" ? "Followers" : "Following"} userId={id} type={modal} onClose={() => setModal(null)} />}

      <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 40 }}>

        {/* Cover Photo */}
        <div style={{ height: 240, background: coverUrl ? "transparent" : `linear-gradient(135deg, ${rc.color}cc, var(--accent2)cc)`, position: "relative", overflow: "hidden" }}>
          {coverUrl && <img src={coverUrl} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4))" }} />
        </div>

        {/* Profile Header */}
        <div className="card" style={{ borderRadius: 0, borderTop: "none", padding: "0 24px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <div style={{ marginTop: -52 }}>
              <Avatar name={user.full_name} size={104} url={p.avatar_url} />
            </div>

            {/* Action Buttons */}
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
                  <button
                    className={`btn ${isFollowing ? "" : "btn-primary"}`}
                    style={{ fontSize: 13, minWidth: 110 }}
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}>
                    {followMutation.isPending
                      ? <span className="spinner-small" style={{ borderTopColor: isFollowing ? "var(--text)" : "white" }} />
                      : isFollowing
                        ? <><UserMinus size={14} /> Unfollow</>
                        : <><UserPlus size={14} /> Follow</>
                    }
                  </button>
                  <button className="btn" style={{ fontSize: 13 }} onClick={startMessage}>
                    <MessageCircle size={14} /> Message
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name + Role */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{user.full_name}</h1>
              {user.is_verified && <CheckCircle size={18} style={{ color: "var(--accent)" }} title="Verified" />}
              <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.color}40` }}>
                {rc.icon} {rc.label}
              </span>
              {isOwn && <span style={{ fontSize: 12, color: "var(--muted)" }}>· You</span>}
            </div>
            {p.bio && <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 10px", lineHeight: 1.6, maxWidth: 600 }}>{p.bio}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, color: "var(--muted)" }}>
              {(p.location || p.country) && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={13} />{[p.location, p.country].filter(Boolean).join(", ")}</span>}
              {p.profession && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Briefcase size={13} />{p.profession}</span>}
              {p.organization && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building size={13} />{p.organization}</span>}
              {p.website && <a href={p.website} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent)", textDecoration: "none" }}><Globe size={13} />{p.website.replace(/^https?:\/\//, "")}</a>}
              {user.created_at && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={13} />Joined {safeDate(user.created_at)}</span>}
            </div>
          </div>

          {/* ── FOLLOWER STATS ── */}
          <div style={{ display: "flex", gap: 24, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <button onClick={() => setModal("following")}
              style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>{user.following_count.toLocaleString()}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Following</span>
            </button>
            <button onClick={() => setModal("followers")}
              style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>{user.followers_count.toLocaleString()}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Followers</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-bar" style={{ borderRadius: 0, margin: 0, borderTop: "none" }}>
          {[{ key: "about", label: "About", icon: "👤" }, { key: "posts", label: "Posts", icon: "📝" }].map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key as any)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "16px 0", display: "flex", gap: 16, alignItems: "start" }}>

          {/* ABOUT */}
          {tab === "about" && (
            <>
              {/* Left Intro */}
              <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Intro</div>
                  {[
                    { icon: <Briefcase size={15} />, value: p.profession },
                    { icon: <Building size={15} />, value: p.organization },
                    { icon: <MapPin size={15} />, value: [p.location, p.country].filter(Boolean).join(", ") },
                    { icon: <Globe size={15} />, value: p.website, isLink: true },
                    { icon: <Calendar size={15} />, value: safeDate(user.created_at) ? `Joined ${safeDate(user.created_at)}` : null },
                  ].filter(r => r.value).map((row, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 14, color: "var(--text)" }}>
                      <span style={{ color: "var(--muted)", flexShrink: 0 }}>{row.icon}</span>
                      {row.isLink
                        ? <a href={row.value as string} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>{(row.value as string).replace(/^https?:\/\//, "")}</a>
                        : <span>{row.value}</span>
                      }
                    </div>
                  ))}
                  {isOwn && (
                    <button className="btn" style={{ width: "100%", marginTop: 12, fontSize: 13 }} onClick={() => navigate("/settings")}>
                      <Edit2 size={13} /> Edit Intro
                    </button>
                  )}
                </div>

                {/* Role Actions */}
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>{rc.icon} {rc.label} Actions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {user.role === "teacher" && [
                      { label: "Classes", icon: <Users size={14} />, path: "/classes" },
                      { label: "Lessons", icon: <BookOpen size={14} />, path: "/lessons" },
                      { label: "Quizzes", icon: <FileText size={14} />, path: "/quizzes" },
                    ].map(a => (
                      <button key={a.label} className="btn" style={{ fontSize: 13, justifyContent: "flex-start", gap: 8 }} onClick={() => navigate(a.path)}>
                        {a.icon} {a.label}
                      </button>
                    ))}
                    {user.role === "learner" && [
                      { label: "My Classes", icon: <Users size={14} />, path: "/classes" },
                      { label: "Quizzes", icon: <FileText size={14} />, path: "/quizzes" },
                      { label: "Lessons", icon: <BookOpen size={14} />, path: "/lessons" },
                    ].map(a => (
                      <button key={a.label} className="btn" style={{ fontSize: 13, justifyContent: "flex-start", gap: 8 }} onClick={() => navigate(a.path)}>
                        {a.icon} {a.label}
                      </button>
                    ))}
                    {user.role === "admin" && [
                      { label: "Analytics", icon: <FileText size={14} />, path: "/analytics" },
                      { label: "Users", icon: <Users size={14} />, path: "/admin/dashboard" },
                    ].map(a => (
                      <button key={a.label} className="btn" style={{ fontSize: 13, justifyContent: "flex-start", gap: 8 }} onClick={() => navigate(a.path)}>
                        {a.icon} {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Details */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Account Details</div>
                  {[
                    { label: "Full Name",   value: user.full_name },
                    { label: "Email",       value: user.email },
                    { label: "Phone",       value: user.phone_number || "—" },
                    { label: "Gender",      value: user.sex || "—" },
                    { label: "Role",        value: `${rc.icon} ${rc.label}`, color: rc.color },
                    { label: "Status",      value: user.is_active ? "✅ Active" : "❌ Inactive", color: user.is_active ? "var(--success)" : "var(--danger)" },
                    { label: "Verified",    value: user.is_verified ? "✅ Verified" : "⏳ Not verified" },
                    { label: "Member since",value: safeDate(user.created_at) || "—" },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{row.label}</span>
                      <span style={{ fontWeight: 700, color: (row as any).color || "var(--text)" }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Privilege card */}
                <div className="card" style={{ padding: 20, borderLeft: `4px solid ${rc.color}` }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: rc.color, marginBottom: 8 }}>{rc.icon} {rc.label} Privileges</div>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.7 }}>
                    {user.role === "teacher" && "Can create and manage classes, publish lessons and quizzes, schedule live sessions, and monitor learner progress."}
                    {user.role === "learner" && "Can join classes, take quizzes, view lessons, attend live sessions and track personal learning progress."}
                    {user.role === "admin" && "Full platform access — manage users, moderate content, view platform-wide analytics."}
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
                <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>User posts will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}