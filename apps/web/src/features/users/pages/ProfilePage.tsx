import { useParams, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import {
  MapPin, Globe, Briefcase, Building, Calendar, Edit2,
  Users, BookOpen, FileText, MessageCircle, UserPlus,
  UserMinus, CheckCircle, Camera, Link2, X, Award,
  BarChart2, GraduationCap, Shield, Star
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

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  teacher: { label: "Teacher",  color: "#cb26e4", bg: "rgba(203,38,228,0.08)",  icon: <GraduationCap size={13} /> },
  learner: { label: "Learner",  color: "#38bdf8", bg: "rgba(56,189,248,0.08)",  icon: <BookOpen size={13} /> },
  admin:   { label: "Admin",    color: "#ef4444", bg: "rgba(239,68,68,0.08)",   icon: <Shield size={13} /> },
}

function getBaseUrl() { return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1","") || "http://localhost:8000" }
function resolveUrl(url?: string | null) {
  if (!url || !url.trim()) return null
  if (url.startsWith("http")) return url
  return `${getBaseUrl()}${url}`
}

function Avatar({ name, size = 80, url, onClick }: { name: string; size?: number; url?: string | null; onClick?: () => void }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  const resolved = resolveUrl(url)
  const style: React.CSSProperties = { width: size, height: size, borderRadius: "50%", border: "3px solid var(--card)", cursor: onClick ? "pointer" : "default", flexShrink: 0, objectFit: "cover" as const, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }
  if (resolved) return <img src={resolved} alt={name} style={style} onClick={onClick} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
  return (
    <div onClick={onClick} style={{ ...style, background: `linear-gradient(135deg, ${color}, ${color}99)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

function StatCard({ value, label, onClick }: { value: number; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: onClick ? "pointer" : "default", textAlign: "center", padding: "12px 20px", borderRadius: 12, transition: "background 0.15s" }}
      onMouseEnter={e => onClick && ((e.currentTarget as HTMLElement).style.background = "var(--bg2)")}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}>
      <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)" }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{label}</div>
    </button>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: "var(--card)", borderRadius: 18, width: "100%", maxWidth: isMobile ? "95vw" : 420, maxHeight: isMobile ? "90vh" : "72vh", display: "flex", flexDirection: "column", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", width: 32, height: 32, borderRadius: "50%", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {isLoading && <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" style={{ margin: "0 auto" }} /></div>}
          {!isLoading && users.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>No {type} yet</div>}
          {users.map((u: any) => {
            const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
            const color = colors[(u.full_name?.charCodeAt(0) ?? 0) % colors.length]
            return (
              <div key={u.id} onClick={() => { navigate(`/profile/${u.id}`); onClose() }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                  {u.full_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.full_name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "capitalize" }}>{u.role}</div>
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
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])
  const [modal, setModal] = useState<"followers"|"following"|null>(null)

  const id = Number(userId)
  const isOwn = currentUser?.id === id

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => { const res = await api.get(`/users/${id}`); return res.data as UserData },
    enabled: !!id,
  })

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
    try { await api.post("/messaging/direct", { recipient_user_id: id }) } catch {}
    navigate("/messages")
  }

  if (isLoading) return (
    <AppShell>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "12px 8px 80px" : "20px 16px" }}>
        <div className="card" style={{ height: 320, opacity: 0.3, borderRadius: 20 }} />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "280px 1fr", gap: 16, marginTop: 16 }}>
          <div className="card" style={{ height: 300, opacity: 0.3, borderRadius: 16 }} />
          <div className="card" style={{ height: 300, opacity: 0.3, borderRadius: 16 }} />
        </div>
      </div>
    </AppShell>
  )

  if (!user) return (
    <AppShell>
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Users size={36} style={{ opacity: 0.3 }} />
        </div>
        <h2 style={{ margin: "0 0 8px" }}>User not found</h2>
        <p style={{ color: "var(--muted)", marginBottom: 24 }}>This profile does not exist or has been removed.</p>
        <button className="btn" onClick={() => navigate(-1)}>Go back</button>
      </div>
    </AppShell>
  )

  const rc = ROLE_CONFIG[user.role] ?? { label: user.role, color: "var(--muted)", bg: "var(--bg2)", icon: <Users size={13} /> }
  const p = user.profile ?? {}
  const coverUrl = resolveUrl(p.cover_url)

  const safeDate = (s?: string) => {
    try { const d = new Date(s ?? ""); return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) } catch { return "" }
  }

  return (
    <AppShell>
      {modal && <UserListModal title={modal === "followers" ? "Followers" : "Following"} userId={id} type={modal} onClose={() => setModal(null)} />}

      <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: isMobile ? 80 : 48 }}>

        {/* Cover */}
        <div style={{ height: 220, background: coverUrl ? "transparent" : `linear-gradient(135deg, ${rc.color}cc 0%, #8b5cf6aa 100%)`, borderRadius: "0 0 24px 24px", position: "relative", overflow: "hidden" }}>
          {coverUrl && <img src={coverUrl} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5))" }} />
        </div>

        {/* Profile Card */}
        <div className="card" style={{ margin: "0 0 16px", borderRadius: "0 0 20px 20px", borderTop: "none", padding: "0 28px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            {/* Avatar */}
            <div style={{ marginTop: -56, position: "relative" }}>
              <Avatar name={user.full_name} size={112} url={p.avatar_url} />
              {user.is_verified && (
                <div style={{ position: "absolute", bottom: 4, right: 4, width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--card)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle size={14} style={{ color: "white" }} />
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, paddingTop: 12, flexWrap: "wrap" }}>
              {isOwn ? (
                <>
                  <button className="btn btn-primary" style={{ fontSize: 13, borderRadius: 10 }} onClick={() => navigate("/settings")}>
                    <Edit2 size={14} /> Edit Profile
                  </button>
                  <button className="btn" style={{ fontSize: 13, borderRadius: 10 }} onClick={() => navigate("/analytics")}>
                    <BarChart2 size={14} /> Analytics
                  </button>
                </>
              ) : (
                <>
                  <button className={`btn ${isFollowing ? "" : "btn-primary"}`}
                    style={{ fontSize: 13, minWidth: 110, borderRadius: 10 }}
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}>
                    {followMutation.isPending
                      ? <span className="spinner-small" />
                      : isFollowing
                        ? <><UserMinus size={14} /> Unfollow</>
                        : <><UserPlus size={14} /> Follow</>}
                  </button>
                  <button className="btn" style={{ fontSize: 13, borderRadius: 10 }} onClick={startMessage}>
                    <MessageCircle size={14} /> Message
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name + Role + Bio */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{user.full_name}</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.color}30` }}>
                {rc.icon} {rc.label}
              </span>
              {isOwn && <span style={{ fontSize: 12, color: "var(--muted)", padding: "3px 10px", borderRadius: 999, background: "var(--bg2)" }}>· You</span>}
            </div>

            {p.bio && <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 12px", lineHeight: 1.7, maxWidth: 560 }}>{p.bio}</p>}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "var(--muted)" }}>
              {(p.location || p.country) && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} />{[p.location, p.country].filter(Boolean).join(", ")}</span>}
              {p.profession && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Briefcase size={13} />{p.profession}</span>}
              {p.organization && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Building size={13} />{p.organization}</span>}
              {p.website && <a href={p.website} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--accent)", textDecoration: "none" }}><Globe size={13} />{p.website.replace(/^https?:\/\//, "")}</a>}
              {user.created_at && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={13} />Joined {safeDate(user.created_at)}</span>}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 4, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <StatCard value={user.following_count} label="Following" onClick={() => setModal("following")} />
            <StatCard value={user.followers_count} label="Followers" onClick={() => setModal("followers")} />
          </div>
        </div>

        {/* Tabs + Content */}
        <div className="tabs-bar" style={{ marginBottom: 16 }}>
          {[
            { key: "about", label: "About",  icon: <Users size={14} /> },
            { key: "posts", label: "Posts",  icon: <FileText size={14} /> },
          ].map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key as any)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* About Tab */}
        {tab === "about" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "280px 1fr", gap: 16, alignItems: "start" }}>

            {/* Left Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Intro Card */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <Users size={15} style={{ color: "var(--accent)" }} /> Intro
                </div>
                {[
                  { icon: <Briefcase size={14} />, value: p.profession },
                  { icon: <Building size={14} />, value: p.organization },
                  { icon: <MapPin size={14} />, value: [p.location, p.country].filter(Boolean).join(", ") || null },
                  { icon: <Globe size={14} />, value: p.website, isLink: true },
                  { icon: <Calendar size={14} />, value: safeDate(user.created_at) ? `Joined ${safeDate(user.created_at)}` : null },
                ].filter(r => r.value).map((row, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span style={{ color: "var(--muted)", flexShrink: 0 }}>{row.icon}</span>
                    {row.isLink
                      ? <a href={row.value as string} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13 }}>{(row.value as string).replace(/^https?:\/\//, "")}</a>
                      : <span style={{ color: "var(--text)" }}>{row.value}</span>}
                  </div>
                ))}
                {!p.profession && !p.organization && !p.location && !p.website && (
                  <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>No info added yet</div>
                )}
                {isOwn && (
                  <button className="btn" style={{ width: "100%", marginTop: 14, fontSize: 13 }} onClick={() => navigate("/settings")}>
                    <Edit2 size={13} /> Edit Intro
                  </button>
                )}
              </div>

              {/* Quick Links */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <Star size={15} style={{ color: "var(--accent)" }} /> Quick Links
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {user.role === "teacher" && [
                    { label: "My Classes",  icon: <Users size={14} />,    path: "/classes" },
                    { label: "My Lessons",  icon: <BookOpen size={14} />, path: "/lessons" },
                    { label: "Analytics",   icon: <BarChart2 size={14} />, path: "/analytics" },
                  ].map(a => (
                    <button key={a.label} className="btn" style={{ fontSize: 13, justifyContent: "flex-start", gap: 8, borderRadius: 10 }} onClick={() => navigate(a.path)}>
                      {a.icon} {a.label}
                    </button>
                  ))}
                  {user.role === "learner" && [
                    { label: "My Classes",  icon: <Users size={14} />,    path: "/classes" },
                    { label: "Lessons",     icon: <BookOpen size={14} />, path: "/lessons" },
                    { label: "Saved Posts", icon: <FileText size={14} />, path: "/saved" },
                  ].map(a => (
                    <button key={a.label} className="btn" style={{ fontSize: 13, justifyContent: "flex-start", gap: 8, borderRadius: 10 }} onClick={() => navigate(a.path)}>
                      {a.icon} {a.label}
                    </button>
                  ))}
                  {user.role === "admin" && [
                    { label: "Analytics",   icon: <BarChart2 size={14} />, path: "/analytics" },
                    { label: "Users",       icon: <Users size={14} />,    path: "/admin/dashboard" },
                  ].map(a => (
                    <button key={a.label} className="btn" style={{ fontSize: 13, justifyContent: "flex-start", gap: 8, borderRadius: 10 }} onClick={() => navigate(a.path)}>
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Account Details */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText size={15} style={{ color: "var(--accent)" }} /> Account Details
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { label: "Full Name",    value: user.full_name,   color: "var(--text)" },
                    { label: "Email",        value: user.email,       color: "var(--text)" },
                    { label: "Phone",        value: user.phone_number || "Not provided", color: user.phone_number ? "var(--text)" : "var(--muted)" },
                    { label: "Gender",       value: user.sex || "Not specified", color: user.sex ? "var(--text)" : "var(--muted)" },
                    { label: "Member Since", value: safeDate(user.created_at) || "—", color: "var(--text)" },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                      <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: 13 }}>{row.label}</span>
                      <span style={{ fontWeight: 700, color: row.color, maxWidth: 260, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.value}</span>
                    </div>
                  ))}
                  {/* Status row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: 13 }}>Status</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: user.is_active ? "var(--success)" : "var(--danger)" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: user.is_active ? "var(--success)" : "var(--danger)", display: "inline-block" }} />
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {/* Verified row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0" }}>
                    <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: 13 }}>Verified</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: user.is_verified ? "var(--accent)" : "var(--muted)" }}>
                      {user.is_verified ? <><CheckCircle size={14} /> Verified</> : "Not verified"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Privileges */}
              <div className="card" style={{ padding: 20, borderLeft: `4px solid ${rc.color}`, background: `linear-gradient(135deg, ${rc.bg}, transparent)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: rc.bg, border: `1px solid ${rc.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: rc.color }}>
                    {rc.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: rc.color }}>{rc.label} Privileges</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Platform access level</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.8 }}>
                  {user.role === "teacher" && "Can create and manage classes, publish lessons and quizzes, schedule live sessions, and monitor learner progress."}
                  {user.role === "learner" && "Can join classes, take quizzes, view lessons, attend live sessions and track personal learning progress."}
                  {user.role === "admin" && "Full platform access — manage users, moderate content, view platform-wide analytics and system settings."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Posts Tab */}
        {tab === "posts" && (
          <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <FileText size={32} style={{ opacity: 0.3 }} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontWeight: 800 }}>Posts coming soon</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 20px" }}>User posts will appear here</p>
            <button className="btn" onClick={() => navigate("/feed")}>Browse Feed</button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
