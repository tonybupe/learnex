import { useParams, useNavigate } from "react-router-dom"
import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import {
  MapPin, Globe, Briefcase, Building, Calendar, Edit2,
  Users, BookOpen, FileText, MessageCircle, UserPlus, UserMinus, CheckCircle
} from "lucide-react"

interface Profile {
  avatar_url?: string; bio?: string; location?: string; country?: string
  profession?: string; organization?: string; website?: string
  skills?: Record<string, any>; interests?: Record<string, any>
  social_links?: Record<string, any>
}
interface UserData {
  id: number; full_name: string; email: string; phone_number?: string
  sex?: string; role: string; is_active: boolean; is_verified: boolean
  followers_count: number; following_count: number
  profile?: Profile; created_at: string
}

function Avatar({ name, size = 80, url }: { name: string; size?: number; url?: string }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[name?.charCodeAt(0) % colors.length]
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "4px solid var(--card)" }} />
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: size * 0.38, border: "4px solid var(--card)", flexShrink: 0 }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  teacher: { label: "Teacher", color: "#cb26e4", icon: "🎓" },
  learner: { label: "Learner",  color: "#38bdf8", icon: "📚" },
  admin:   { label: "Admin",   color: "#ef4444", icon: "⚙️"  },
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<"about"|"posts">("about")
  const [isFollowing, setIsFollowing] = useState(false)

  const id = Number(userId)
  const isOwn = currentUser?.id === id

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await api.get(`/users/${id}`)
      return res.data as UserData
    },
    enabled: !!id,
  })

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await api.delete(`/social/follow/${id}`)
      } else {
        await api.post(`/social/follow/${id}`)
      }
    },
    onSuccess: () => {
      setIsFollowing(f => !f)
      queryClient.invalidateQueries({ queryKey: ["user", id] })
    }
  })

  if (isLoading) return (
    <AppShell>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px" }}>
        <div className="card" style={{ height: 300, opacity: 0.4 }} />
      </div>
    </AppShell>
  )

  if (!user) return (
    <AppShell>
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48 }}>👤</div>
        <h2>User not found</h2>
      </div>
    </AppShell>
  )

  const roleConfig = ROLE_CONFIG[user.role] ?? { label: user.role, color: "var(--muted)", icon: "👤" }
  const p = user.profile ?? {}

  return (
    <AppShell>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Profile Header Card */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Cover */}
          <div style={{ height: 140, background: `linear-gradient(135deg, ${roleConfig.color}aa, var(--accent2)aa)`, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.3))" }} />
          </div>

          {/* Avatar + Info */}
          <div style={{ padding: "0 24px 24px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ marginTop: -50 }}>
                <Avatar name={user.full_name} size={96} url={p.avatar_url} />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
                {isOwn ? (
                  <button className="btn btn-primary" style={{ fontSize: 13 }}
                    onClick={() => navigate("/settings")}>
                    <Edit2 size={14} /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      className={`btn ${isFollowing ? "" : "btn-primary"}`}
                      style={{ fontSize: 13 }}
                      onClick={() => followMutation.mutate()}
                      disabled={followMutation.isPending}>
                      {isFollowing ? <><UserMinus size={14} /> Unfollow</> : <><UserPlus size={14} /> Follow</>}
                    </button>
                    <button className="btn" style={{ fontSize: 13 }}
                      onClick={() => navigate("/messages")}>
                      <MessageCircle size={14} /> Message
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Name + Role */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{user.full_name}</h1>
                {user.is_verified && <CheckCircle size={18} style={{ color: "var(--accent)" }} />}
                <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: `${roleConfig.color}20`, color: roleConfig.color, border: `1px solid ${roleConfig.color}40` }}>
                  {roleConfig.icon} {roleConfig.label}
                </span>
              </div>

              {p.bio && <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 10px", lineHeight: 1.6 }}>{p.bio}</p>}

              {/* Meta info */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "var(--muted)" }}>
                {p.location && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={13} /> {p.location}{p.country ? `, ${p.country}` : ""}</span>}
                {p.profession && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Briefcase size={13} /> {p.profession}</span>}
                {p.organization && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building size={13} /> {p.organization}</span>}
                {p.website && <a href={p.website} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent)", textDecoration: "none" }}><Globe size={13} /> {p.website}</a>}
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={13} /> Joined {(() => { try { const d = new Date(user.created_at); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) } catch { return '' } })()}</span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 24, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              {[
                { label: "Followers", value: user.followers_count },
                { label: "Following", value: user.following_count },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-bar">
          {(["about", "posts"] as const).map(t => (
            <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}>
              {t === "about" ? "👤 About" : "📝 Posts"}
            </button>
          ))}
        </div>

        {/* ABOUT TAB */}
        {tab === "about" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Personal Info */}
            <div className="card">
              <div className="card-head" style={{ marginBottom: 14 }}>
                <span className="card-title">👤 Personal Info</span>
              </div>
              {[
                { label: "Email", value: user.email },
                { label: "Phone", value: user.phone_number || "—" },
                { label: "Gender", value: user.sex || "—" },
                { label: "Role", value: `${roleConfig.icon} ${roleConfig.label}` },
                { label: "Status", value: user.is_active ? "✅ Active" : "❌ Inactive" },
                { label: "Verified", value: user.is_verified ? "✅ Yes" : "❌ No" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>{row.label}</span>
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Role-specific info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Skills */}
              {p.skills && Object.keys(p.skills).length > 0 && (
                <div className="card">
                  <div className="card-head" style={{ marginBottom: 12 }}>
                    <span className="card-title">⚡ Skills</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.keys(p.skills).map(skill => (
                      <span key={skill} className="chip" style={{ fontSize: 12 }}>{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests */}
              {p.interests && Object.keys(p.interests).length > 0 && (
                <div className="card">
                  <div className="card-head" style={{ marginBottom: 12 }}>
                    <span className="card-title">🎯 Interests</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.keys(p.interests).map(interest => (
                      <span key={interest} className="chip" style={{ fontSize: 12 }}>{interest}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Role-specific actions */}
              {user.role === "teacher" && (
                <div className="card">
                  <div className="card-head" style={{ marginBottom: 12 }}>
                    <span className="card-title">🎓 Teaching</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button className="btn" style={{ fontSize: 13, justifyContent: "flex-start" }}
                      onClick={() => navigate("/classes")}>
                      <Users size={14} /> View Classes
                    </button>
                    <button className="btn" style={{ fontSize: 13, justifyContent: "flex-start" }}
                      onClick={() => navigate("/lessons")}>
                      <BookOpen size={14} /> View Lessons
                    </button>
                    <button className="btn" style={{ fontSize: 13, justifyContent: "flex-start" }}
                      onClick={() => navigate("/quizzes")}>
                      <FileText size={14} /> View Quizzes
                    </button>
                  </div>
                </div>
              )}

              {user.role === "learner" && (
                <div className="card">
                  <div className="card-head" style={{ marginBottom: 12 }}>
                    <span className="card-title">📚 Learning</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button className="btn" style={{ fontSize: 13, justifyContent: "flex-start" }}
                      onClick={() => navigate("/classes")}>
                      <Users size={14} /> My Classes
                    </button>
                    <button className="btn" style={{ fontSize: 13, justifyContent: "flex-start" }}
                      onClick={() => navigate("/quizzes")}>
                      <FileText size={14} /> My Quizzes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* POSTS TAB */}
        {tab === "posts" && (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Posts coming soon</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}