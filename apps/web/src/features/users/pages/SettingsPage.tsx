import { useState, useMemo, useEffect, useRef } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"
import {
  User, Lock, Bell, Shield, Trash2, Save,
  MapPin, Globe, Briefcase, Building, Camera, CheckCircle, Eye
} from "lucide-react"

type Tab = "profile" | "account" | "notifications" | "privacy" | "danger"

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "profile",       label: "Profile",       icon: <User size={15} /> },
  { key: "account",       label: "Account",       icon: <Shield size={15} /> },
  { key: "notifications", label: "Notifications", icon: <Bell size={15} /> },
  { key: "privacy",       label: "Privacy",       icon: <Lock size={15} /> },
  { key: "danger",        label: "Danger Zone",   icon: <Trash2 size={15} /> },
]

const ROLE_COLOR: Record<string, string> = {
  teacher: "#cb26e4", learner: "#38bdf8", admin: "#ef4444"
}

function getBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") || "http://localhost:8000"
}
function resolveUrl(url?: string | null) {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `${getBaseUrl()}${url}`
}

function AvatarDisplay({ name, size = 80, url }: { name: string; size?: number; url?: string | null }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[name?.charCodeAt(0) % colors.length]
  const resolved = resolveUrl(url)
  if (resolved) return <img src={resolved} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--border)" }} onError={e => { (e.target as HTMLImageElement).src = "" }} />
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: size * 0.38, border: "3px solid var(--border)" }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

export default function SettingsPage() {
  const currentUser = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>("profile")
  const [toast, setToast] = useState<{ type: "success"|"error"; msg: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [profileForm, setProfileForm] = useState({
    bio: "", location: "", country: "", profession: "",
    organization: "", website: "",
  })
  const [formReady, setFormReady] = useState(false)

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => { const res = await api.get("/users/me"); return res.data },
  })

  useEffect(() => {
    if (user && !formReady) {
      setProfileForm({
        bio: user.profile?.bio ?? "",
        location: user.profile?.location ?? "",
        country: user.profile?.country ?? "",
        profession: user.profile?.profession ?? "",
        organization: user.profile?.organization ?? "",
        website: user.profile?.website ?? "",
      })
      setFormReady(true)
    }
  }, [user, formReady])

  const showToast = (type: "success"|"error", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const updateProfile = useMutation({
    mutationFn: async (data: any) => api.patch("/users/me/profile", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["me"] }); showToast("success", "Profile updated!") },
    onError: () => showToast("error", "Failed to update profile"),
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ type, file }: { type: "avatar"|"cover"; file: File }) => {
      const form = new FormData()
      form.append("file", file)
      const res = await api.post(`/users/me/${type}`, form, { headers: { "Content-Type": "multipart/form-data" } })
      return { type, data: res.data }
    },
    onSuccess: ({ type }) => {
      queryClient.invalidateQueries({ queryKey: ["me"] })
      queryClient.invalidateQueries({ queryKey: ["user", currentUser?.id] })
      showToast("success", `${type === "avatar" ? "Profile photo" : "Cover photo"} updated!`)
    },
    onError: (err: any) => showToast("error", err?.response?.data?.detail || "Upload failed"),
  })

  const completion = useMemo(() => {
    if (!user) return 0
    const checks = [user.full_name, user.email, user.phone_number, user.sex,
      profileForm.bio, profileForm.location, profileForm.profession, profileForm.organization, profileForm.website]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [user, profileForm])

  const completionColor = completion >= 80 ? "var(--success)" : completion >= 50 ? "#f59e0b" : "var(--danger)"

  const safeDate = (s?: string) => {
    try { const d = new Date(s ?? ""); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) } catch { return "—" }
  }

  if (isLoading || !user) return (
    <AppShell><div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div></AppShell>
  )

  const roleColor = ROLE_COLOR[user.role] ?? "var(--muted)"

  return (
    <AppShell>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "20px 16px 40px" }}>

        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", top: 72, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, background: toast.type === "success" ? "var(--success)" : "var(--danger)", color: "white", boxShadow: "var(--shadow)", animation: "toastIn 0.3s ease" }}>
            {toast.type === "success" ? "✅" : "❌"} {toast.msg}
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px" }}>⚙️ Settings</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Manage your account, profile and preferences</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20, alignItems: "start" }}>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* User Card */}
            <div className="card" style={{ padding: 20, textAlign: "center", marginBottom: 8 }}>
              {/* Cover mini preview */}
              <div style={{ height: 60, borderRadius: 10, marginBottom: -30, background: user.profile?.cover_url ? "transparent" : `linear-gradient(135deg, ${roleColor}aa, var(--accent2)aa)`, overflow: "hidden", position: "relative" }}>
                {user.profile?.cover_url && <img src={resolveUrl(user.profile.cover_url) ?? ""} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                <button onClick={() => coverInputRef.current?.click()}
                  style={{ position: "absolute", bottom: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={11} />
                </button>
                <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate({ type: "cover", file: f }) }} />
              </div>

              {/* Avatar */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, position: "relative", zIndex: 1 }}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <AvatarDisplay name={user.full_name} size={64} url={user.profile?.avatar_url} />
                  <button onClick={() => avatarInputRef.current?.click()}
                    style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--card)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Camera size={11} />
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate({ type: "avatar", file: f }) }} />
                </div>
              </div>

              <div style={{ fontWeight: 800, fontSize: 15 }}>{user.full_name}</div>
              <div style={{ fontSize: 12, color: roleColor, fontWeight: 700, marginTop: 3 }}>{user.role.toUpperCase()}</div>
              {user.is_verified && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 11, color: "var(--success)", marginTop: 4 }}>
                  <CheckCircle size={11} /> Verified
                </div>
              )}

              {/* Completion bar */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "var(--muted)" }}>Profile strength</span>
                  <span style={{ color: completionColor, fontWeight: 700 }}>{completion}%</span>
                </div>
                <div style={{ height: 5, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${completion}%`, background: completionColor, borderRadius: 999, transition: "width 0.4s" }} />
                </div>
              </div>

              {/* View profile */}
              <button className="btn" style={{ width: "100%", marginTop: 12, fontSize: 12 }}
                onClick={() => navigate(`/profile/${user.id}`)}>
                <Eye size={12} /> View Profile
              </button>
            </div>

            {/* Nav */}
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: tab === t.key ? "color-mix(in srgb, var(--accent) 12%, var(--card))" : "transparent",
                  color: tab === t.key ? "var(--accent)" : t.key === "danger" ? "var(--danger)" : "var(--muted)",
                  transition: "all 0.15s",
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* PROFILE TAB */}
            {tab === "profile" && (
              <div className="card" style={{ padding: 24 }}>
                <div className="card-head" style={{ marginBottom: 20 }}>
                  <span className="card-title">👤 Edit Profile</span>
                </div>

                {/* Photo upload area */}
                <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "var(--muted)" }}>PROFILE PHOTOS</div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ position: "relative", display: "inline-block", marginBottom: 6 }}>
                        <AvatarDisplay name={user.full_name} size={72} url={user.profile?.avatar_url} />
                        <button onClick={() => avatarInputRef.current?.click()}
                          style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--card)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Camera size={13} />
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>Profile Photo</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div onClick={() => coverInputRef.current?.click()}
                        style={{ height: 72, borderRadius: 10, cursor: "pointer", background: user.profile?.cover_url ? "transparent" : `linear-gradient(135deg, ${roleColor}40, var(--accent2)40)`, border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", marginBottom: 6 }}>
                        {user.profile?.cover_url
                          ? <img src={resolveUrl(user.profile.cover_url) ?? ""} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                              <Camera size={20} style={{ color: "var(--muted)" }} />
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>Click to upload</span>
                            </div>
                        }
                        {user.profile?.cover_url && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
                            <Camera size={20} style={{ color: "white" }} />
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>Cover Photo</div>
                    </div>
                  </div>
                  {uploadMutation.isPending && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Uploading photo...
                    </div>
                  )}
                </div>

                {/* Profile fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">Bio</label>
                    <textarea value={profileForm.bio}
                      onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell people about yourself..."
                      maxLength={500}
                      style={{ width: "100%", minHeight: 90, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
                    <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>{profileForm.bio.length}/500</div>
                  </div>
                  {[
                    { key: "location",     label: "Location",     icon: <MapPin size={13} />,     placeholder: "City" },
                    { key: "country",      label: "Country",      icon: <Globe size={13} />,      placeholder: "Country" },
                    { key: "profession",   label: "Profession",   icon: <Briefcase size={13} />,  placeholder: "e.g. Software Engineer" },
                    { key: "organization", label: "Organization", icon: <Building size={13} />,   placeholder: "School or Company" },
                    { key: "website",      label: "Website",      icon: <Globe size={13} />,      placeholder: "https://yoursite.com" },
                  ].map(field => (
                    <div key={field.key} className="form-field">
                      <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ color: "var(--muted)" }}>{field.icon}</span> {field.label}
                      </label>
                      <input className="audit-control"
                        value={(profileForm as any)[field.key]}
                        onChange={e => setProfileForm(p => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={field.placeholder} />
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button className="btn" onClick={() => { setFormReady(false) }}>Reset</button>
                  <button className="btn btn-primary" style={{ padding: "10px 24px" }}
                    onClick={() => updateProfile.mutate(profileForm)}
                    disabled={updateProfile.isPending}>
                    <Save size={14} /> {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* ACCOUNT TAB */}
            {tab === "account" && (
              <div className="card" style={{ padding: 24 }}>
                <div className="card-head" style={{ marginBottom: 20 }}>
                  <span className="card-title">🛡️ Account Information</span>
                </div>
                {[
                  { label: "Full Name",    value: user.full_name },
                  { label: "Email",        value: user.email },
                  { label: "Phone",        value: user.phone_number || "—" },
                  { label: "Gender",       value: user.sex || "—" },
                  { label: "Role",         value: user.role.toUpperCase(), color: roleColor },
                  { label: "Status",       value: user.is_active ? "✅ Active" : "❌ Inactive", color: user.is_active ? "var(--success)" : "var(--danger)" },
                  { label: "Verified",     value: user.is_verified ? "✅ Verified" : "⏳ Not yet verified" },
                  { label: "Member since", value: safeDate(user.created_at) },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                    <span style={{ color: "var(--muted)", fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: (row as any).color || "var(--text)" }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: `${roleColor}10`, border: `1px solid ${roleColor}30` }}>
                  <div style={{ fontWeight: 700, color: roleColor, marginBottom: 6, fontSize: 14 }}>
                    {user.role === "teacher" ? "🎓 Teacher" : user.role === "learner" ? "📚 Learner" : "⚙️ Admin"} Privileges
                  </div>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.7 }}>
                    {user.role === "teacher" && "Create and manage classes, publish lessons and quizzes, schedule live sessions."}
                    {user.role === "learner" && "Join classes, take quizzes, view lessons, attend live sessions."}
                    {user.role === "admin" && "Full platform access — manage users, moderate content, view analytics."}
                  </p>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {tab === "notifications" && (
              <div className="card" style={{ padding: 24 }}>
                <div className="card-head" style={{ marginBottom: 20 }}>
                  <span className="card-title">🔔 Notification Preferences</span>
                </div>
                {[
                  { label: "New post in class", desc: "When someone posts in your class", on: true },
                  { label: "New comment", desc: "When someone comments on your post", on: true },
                  { label: "Quiz published", desc: "When a new quiz is available", on: true },
                  { label: "Live session starting", desc: "Reminder before a live session", on: true },
                  { label: "New follower", desc: "When someone follows you", on: false },
                  { label: "Direct message", desc: "When you receive a message", on: true },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.desc}</div>
                    </div>
                    <div style={{ width: 44, height: 24, borderRadius: 12, background: item.on ? "var(--accent)" : "var(--border)", position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", top: 3, left: item.on ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PRIVACY TAB */}
            {tab === "privacy" && (
              <div className="card" style={{ padding: 24 }}>
                <div className="card-head" style={{ marginBottom: 20 }}>
                  <span className="card-title">🔒 Privacy Settings</span>
                </div>
                {[
                  { label: "Profile visibility", desc: "Who can see your profile", options: ["Everyone", "Followers only", "Nobody"] },
                  { label: "Show email", desc: "Display email on your profile", options: ["Yes", "No"] },
                  { label: "Show phone", desc: "Display phone on your profile", options: ["Yes", "No"] },
                  { label: "Allow messages from", desc: "Who can send you messages", options: ["Everyone", "Followers only", "Nobody"] },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.desc}</div>
                    </div>
                    <select className="audit-control select" style={{ width: "auto", padding: "6px 28px 6px 10px", fontSize: 13 }}>
                      {item.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* DANGER TAB */}
            {tab === "danger" && (
              <div className="card" style={{ padding: 24, borderLeft: "4px solid var(--danger)" }}>
                <div className="card-head" style={{ marginBottom: 20 }}>
                  <span className="card-title" style={{ color: "var(--danger)" }}>⚠️ Danger Zone</span>
                </div>
                <div style={{ padding: "16px 0" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Delete Account</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
                    Permanently delete your account and all associated data including classes, lessons, posts and messages. This action cannot be undone.
                  </div>
                  {!showDeleteConfirm ? (
                    <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 size={14} /> Delete My Account
                    </button>
                  ) : (
                    <div style={{ padding: 16, borderRadius: 12, background: "color-mix(in srgb, var(--danger) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)" }}>
                      <div style={{ fontWeight: 800, color: "var(--danger)", marginBottom: 8 }}>⚠️ Are you absolutely sure?</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                        Type <strong>DELETE</strong> to confirm account deletion.
                      </div>
                      <input className="audit-control" placeholder="Type DELETE to confirm" style={{ marginBottom: 12 }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-danger" onClick={() => showToast("error", "Account deletion disabled in demo")}>Confirm Delete</button>
                        <button className="btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}