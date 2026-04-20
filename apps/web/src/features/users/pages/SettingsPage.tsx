import { useState, useMemo, useEffect, useRef } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"
import {
  User, Lock, Bell, Shield, Trash2, Save, Eye, EyeOff,
  MapPin, Globe, Briefcase, Building, Camera, CheckCircle,
  Phone, Mail, Calendar, GraduationCap, BookOpen, BarChart2,
  AlertTriangle, Key, UserCheck, MessageSquare, Users
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
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  const resolved = resolveUrl(url)
  if (resolved) return <img src={resolved} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--border)" }} onError={e => { (e.target as HTMLImageElement).src = "" }} />
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${color}, ${color}99)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: size * 0.38, border: "3px solid var(--border)" }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)}
      style={{ width: 46, height: 26, borderRadius: 13, background: on ? "var(--accent)" : "var(--border)", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }} />
    </div>
  )
}

export default function SettingsPage() {
  const currentUser = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>("profile")
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])
  const [toast, setToast] = useState<{ type: "success"|"error"; msg: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState("")
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [profileForm, setProfileForm] = useState({
    bio: "", location: "", country: "", profession: "", organization: "", website: "",
  })
  const [accountForm, setAccountForm] = useState({
    full_name: "", phone_number: "", sex: "",
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: "", new_password: "", confirm_password: "",
  })
  const [notifications, setNotifications] = useState({
    new_post_in_class: true,
    new_comment: true,
    quiz_published: true,
    live_session: true,
    new_follower: false,
    direct_message: true,
    lesson_published: true,
    class_joined: true,
  })
  const [privacy, setPrivacy] = useState({
    profile_visibility: "everyone",
    show_email: false,
    show_phone: false,
    allow_messages: "everyone",
    allow_follow_requests: "everyone",
    show_online_status: true,
    show_activity: true,
    data_analytics: true,
  })
  const [formReady, setFormReady] = useState(false)
  const [privacySaved, setPrivacySaved] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)

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
      setAccountForm({
        full_name: user.full_name ?? "",
        phone_number: user.phone_number ?? "",
        sex: user.sex ?? "",
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["me"] }); showToast("success", "Profile updated successfully!") },
    onError: () => showToast("error", "Failed to update profile"),
  })

  const updateAccount = useMutation({
    mutationFn: async (data: any) => api.patch("/users/me", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["me"] }); showToast("success", "Account updated successfully!") },
    onError: (err: any) => showToast("error", err?.response?.data?.detail || "Failed to update account"),
  })

  const changePassword = useMutation({
    mutationFn: async (data: any) => api.post("/auth/change-password", data),
    onSuccess: () => {
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" })
      showToast("success", "Password changed successfully!")
    },
    onError: (err: any) => showToast("error", err?.response?.data?.detail || "Failed to change password"),
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ type, file }: { type: "avatar"|"cover"; file: File }) => {
      const form = new FormData()
      form.append("file", file)
      return api.post(`/users/me/${type}`, form, { headers: { "Content-Type": "multipart/form-data" } })
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ["me"] })
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
  const RoleIcon = user.role === "teacher" ? GraduationCap : user.role === "admin" ? Shield : BookOpen

  return (
    <AppShell>
      <div style={{ maxWidth: 940, margin: "0 auto", padding: isMobile ? "12px 10px 80px" : "20px 16px 48px" }}>

        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", top: 72, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, background: toast.type === "success" ? "var(--success)" : "var(--danger)", color: "white", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
            {toast.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} {toast.msg}
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={22} style={{ color: "var(--accent)" }} /> Settings
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Manage your account, profile and preferences</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "240px 1fr", gap: isMobile ? 12 : 20, alignItems: "start" }}>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "column", gap: 4 }}>
            {/* User Card */}
            <div className="card" style={{ padding: 20, textAlign: "center", marginBottom: 8, overflow: "hidden" }}>
              <div style={{ height: 64, borderRadius: 10, marginBottom: -32, background: user.profile?.cover_url ? "transparent" : `linear-gradient(135deg, ${roleColor}cc, #8b5cf6cc)`, overflow: "hidden", position: "relative" }}>
                {user.profile?.cover_url && <img src={resolveUrl(user.profile.cover_url) ?? ""} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                <button onClick={() => coverInputRef.current?.click()}
                  style={{ position: "absolute", bottom: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={11} />
                </button>
                <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate({ type: "cover", file: f }) }} />
              </div>
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
              <div style={{ fontSize: 11, color: roleColor, fontWeight: 700, marginTop: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <RoleIcon size={11} /> {user.role.toUpperCase()}
              </div>
              {user.is_verified && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 11, color: "var(--success)", marginTop: 4 }}>
                  <CheckCircle size={11} /> Verified
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                  <span style={{ color: "var(--muted)" }}>Profile strength</span>
                  <span style={{ color: completionColor, fontWeight: 700 }}>{completion}%</span>
                </div>
                <div style={{ height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${completion}%`, background: completionColor, borderRadius: 999, transition: "width 0.4s" }} />
                </div>
              </div>
              <button className="btn" style={{ width: "100%", marginTop: 12, fontSize: 12 }} onClick={() => navigate(`/profile/${user.id}`)}>
                <Eye size={12} /> View Profile
              </button>
            </div>}

            {/* Nav */}
            {/* Tab navigation - horizontal scroll on mobile */}
            {isMobile && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "4px 0 8px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, border: `1px solid ${tab === t.key ? "var(--accent)" : "var(--border)"}`, cursor: "pointer", fontSize: 12, fontWeight: 700, background: tab === t.key ? "var(--accent)" : "var(--card)", color: tab === t.key ? "white" : t.key === "danger" ? "var(--danger)" : "var(--muted)", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s", fontFamily: "inherit" }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            )}
            {!isMobile && TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t.key ? "color-mix(in srgb, var(--accent) 12%, var(--card))" : "transparent", color: tab === t.key ? "var(--accent)" : t.key === "danger" ? "var(--danger)" : "var(--muted)", transition: "all 0.15s", textAlign: "left" }}>
                {t.icon} {t.label}
                {tab === t.key && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />}
              </button>




            ))}
          </div>

          {/* Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── PROFILE TAB ── */}
            {tab === "profile" && (
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  <User size={16} style={{ color: "var(--accent)" }} /> Edit Profile
                </div>

                {/* Photo upload */}
                <div style={{ marginBottom: 24, padding: 18, borderRadius: 14, background: "var(--bg2)", border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 14, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Profile Photos</div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ position: "relative", display: "inline-block", marginBottom: 6 }}>
                        <AvatarDisplay name={user.full_name} size={72} url={user.profile?.avatar_url} />
                        <button onClick={() => avatarInputRef.current?.click()}
                          style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--card)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Camera size={12} />
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Profile Photo</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div onClick={() => coverInputRef.current?.click()}
                        style={{ height: 80, borderRadius: 12, cursor: "pointer", background: user.profile?.cover_url ? "transparent" : `linear-gradient(135deg, ${roleColor}30, #8b5cf630)`, border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", marginBottom: 6, transition: "border-color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}>
                        {user.profile?.cover_url
                          ? <img src={resolveUrl(user.profile.cover_url) ?? ""} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                              <Camera size={22} style={{ color: "var(--muted)" }} />
                              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Click to upload cover</span>
                            </div>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Cover Photo</div>
                    </div>
                  </div>
                  {uploadMutation.isPending && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Uploading...
                    </div>
                  )}
                </div>

                {/* Bio */}
                <div className="form-field" style={{ marginBottom: 16 }}>
                  <label className="form-label">Bio</label>
                  <textarea value={profileForm.bio}
                    onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell people about yourself..."
                    maxLength={500}
                    style={{ width: "100%", minHeight: 90, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                  <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "right", marginTop: 4 }}>{profileForm.bio.length}/500</div>
                </div>

                {/* Fields grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { key: "location",     label: "City / Location",  icon: <MapPin size={13} />,     placeholder: "e.g. Lusaka" },
                    { key: "country",      label: "Country",          icon: <Globe size={13} />,      placeholder: "e.g. Zambia" },
                    { key: "profession",   label: "Profession",       icon: <Briefcase size={13} />,  placeholder: "e.g. Software Engineer" },
                    { key: "organization", label: "School / Company", icon: <Building size={13} />,   placeholder: "e.g. UNZA" },
                    { key: "website",      label: "Website",          icon: <Globe size={13} />,      placeholder: "https://yoursite.com" },
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

                <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 18 }}>
                  <button className="btn" onClick={() => setFormReady(false)}>Reset</button>
                  <button className="btn btn-primary" style={{ padding: "10px 28px" }}
                    onClick={() => updateProfile.mutate(profileForm)}
                    disabled={updateProfile.isPending}>
                    <Save size={14} /> {updateProfile.isPending ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>
            )}

            {/* ── ACCOUNT TAB ── */}
            {tab === "account" && (
              <>
                {/* Account Info - Editable */}
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <UserCheck size={16} style={{ color: "var(--accent)" }} /> Personal Information
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                    <div className="form-field">
                      <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <User size={13} style={{ color: "var(--muted)" }} /> Full Name
                      </label>
                      <input className="audit-control" value={accountForm.full_name}
                        onChange={e => setAccountForm(p => ({ ...p, full_name: e.target.value }))}
                        placeholder="Your full name" />
                    </div>
                    <div className="form-field">
                      <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Phone size={13} style={{ color: "var(--muted)" }} /> Phone Number
                      </label>
                      <input className="audit-control" value={accountForm.phone_number}
                        onChange={e => setAccountForm(p => ({ ...p, phone_number: e.target.value }))}
                        placeholder="+260 97 123 4567" type="tel" />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Gender</label>
                      <select className="audit-control select" value={accountForm.sex}
                        onChange={e => setAccountForm(p => ({ ...p, sex: e.target.value }))}>
                        <option value="">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Mail size={13} style={{ color: "var(--muted)" }} /> Email Address
                      </label>
                      <input className="audit-control" value={user.email} disabled
                        style={{ opacity: 0.6, cursor: "not-allowed" }}
                        title="Email cannot be changed" />
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Email cannot be changed</div>
                    </div>
                  </div>

                  {/* Read-only info */}
                  <div style={{ padding: 16, borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)", marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 12, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Account Status</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[
                        { label: "Role", value: user.role.charAt(0).toUpperCase() + user.role.slice(1), color: roleColor },
                        { label: "Member Since", value: safeDate(user.created_at), color: "var(--text)" },
                        { label: "Status", value: user.is_active ? "Active" : "Inactive", color: user.is_active ? "var(--success)" : "var(--danger)" },
                        { label: "Verified", value: user.is_verified ? "Verified" : "Not verified", color: user.is_verified ? "var(--accent)" : "var(--muted)" },
                      ].map(row => (
                        <div key={row.label} style={{ padding: "10px 14px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: row.color }}>{row.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 18 }}>
                    <button className="btn btn-primary" style={{ padding: "10px 28px" }}
                      onClick={() => updateAccount.mutate(accountForm)}
                      disabled={updateAccount.isPending}>
                      <Save size={14} /> {updateAccount.isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>

                {/* Change Password */}
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <Key size={16} style={{ color: "var(--accent)" }} /> Change Password
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="form-field">
                      <label className="form-label">Current Password</label>
                      <div style={{ position: "relative" }}>
                        <input className="audit-control" type={showCurrentPw ? "text" : "password"}
                          value={passwordForm.current_password}
                          onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))}
                          placeholder="Enter current password"
                          style={{ paddingRight: 44 }} />
                        <button type="button" onClick={() => setShowCurrentPw(v => !v)}
                          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                          {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div className="form-field">
                        <label className="form-label">New Password</label>
                        <div style={{ position: "relative" }}>
                          <input className="audit-control" type={showNewPw ? "text" : "password"}
                            value={passwordForm.new_password}
                            onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))}
                            placeholder="Min. 8 characters"
                            style={{ paddingRight: 44 }} />
                          <button type="button" onClick={() => setShowNewPw(v => !v)}
                            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                            {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="form-field">
                        <label className="form-label">Confirm New Password</label>
                        <input className="audit-control" type="password"
                          value={passwordForm.confirm_password}
                          onChange={e => setPasswordForm(p => ({ ...p, confirm_password: e.target.value }))}
                          placeholder="Repeat new password" />
                      </div>
                    </div>
                    {passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                      <div style={{ fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>Passwords do not match</div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
                    <button className="btn btn-primary" style={{ padding: "10px 28px" }}
                      disabled={!passwordForm.current_password || !passwordForm.new_password || passwordForm.new_password !== passwordForm.confirm_password || changePassword.isPending}
                      onClick={() => changePassword.mutate({ current_password: passwordForm.current_password, new_password: passwordForm.new_password })}>
                      <Key size={14} /> {changePassword.isPending ? "Changing..." : "Change Password"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {tab === "notifications" && (
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  <Bell size={16} style={{ color: "var(--accent)" }} /> Notification Preferences
                </div>

                {[
                  { key: "new_post_in_class", label: "New post in class",     desc: "When someone posts in a class you're in",     icon: <Users size={14} /> },
                  { key: "new_comment",       label: "New comment",           desc: "When someone comments on your post",          icon: <MessageSquare size={14} /> },
                  { key: "lesson_published",  label: "Lesson published",      desc: "When a new lesson is added to your class",    icon: <BookOpen size={14} /> },
                  { key: "quiz_published",    label: "Quiz available",        desc: "When a new quiz is published in your class",  icon: <CheckCircle size={14} /> },
                  { key: "live_session",      label: "Live session starting",  desc: "Reminder before a live class session",        icon: <BarChart2 size={14} /> },
                  { key: "new_follower",      label: "New follower",          desc: "When someone starts following you",           icon: <UserCheck size={14} /> },
                  { key: "direct_message",    label: "Direct messages",       desc: "When you receive a new message",              icon: <MessageSquare size={14} /> },
                  { key: "class_joined",      label: "Student joined class",   desc: "When a learner joins your class (teachers)",  icon: <Users size={14} /> },
                ].map(item => (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", flexShrink: 0 }}>
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{item.desc}</div>
                      </div>
                    </div>
                    <Toggle on={(notifications as any)[item.key]} onChange={v => setNotifications(p => ({ ...p, [item.key]: v }))} />
                  </div>
                ))}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
                  <button className="btn btn-primary" style={{ padding: "10px 28px" }}
                    onClick={() => { setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2000); showToast("success", "Notification preferences saved!") }}>
                    <Save size={14} /> {notifSaved ? "Saved!" : "Save Preferences"}
                  </button>
                </div>
              </div>
            )}

            {/* ── PRIVACY TAB ── */}
            {tab === "privacy" && (
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  <Lock size={16} style={{ color: "var(--accent)" }} /> Privacy Settings
                </div>

                {/* Visibility selects */}
                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 12, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Visibility</div>
                {[
                  { key: "profile_visibility", label: "Profile visibility",    desc: "Who can view your full profile",             options: [["everyone","Everyone"],["followers","Followers only"],["nobody","Nobody"]] },
                  { key: "allow_messages",      label: "Who can message you",  desc: "Control who can send you direct messages",   options: [["everyone","Everyone"],["followers","Followers only"],["nobody","Nobody"]] },
                  { key: "allow_follow_requests", label: "Who can follow you", desc: "Control who can send follow requests",       options: [["everyone","Everyone"],["nobody","Nobody"]] },
                ].map(item => (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)", gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{item.desc}</div>
                    </div>
                    <select className="audit-control select" style={{ width: 160, fontSize: 13 }}
                      value={(privacy as any)[item.key]}
                      onChange={e => setPrivacy(p => ({ ...p, [item.key]: e.target.value }))}>
                      {item.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                  </div>
                ))}

                {/* Toggle privacy settings */}
                <div style={{ fontWeight: 700, fontSize: 11, margin: "20px 0 12px", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Information Sharing</div>
                {[
                  { key: "show_email",       label: "Show email on profile",     desc: "Display your email address publicly" },
                  { key: "show_phone",       label: "Show phone on profile",     desc: "Display your phone number publicly" },
                  { key: "show_online_status", label: "Show online status",      desc: "Let others see when you're online" },
                  { key: "show_activity",    label: "Show activity status",      desc: "Display your recent activity to others" },
                  { key: "data_analytics",   label: "Allow usage analytics",     desc: "Help improve Learnex by sharing usage data" },
                ].map(item => (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{item.desc}</div>
                    </div>
                    <Toggle on={(privacy as any)[item.key]} onChange={v => setPrivacy(p => ({ ...p, [item.key]: v }))} />
                  </div>
                ))}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
                  <button className="btn btn-primary" style={{ padding: "10px 28px" }}
                    onClick={() => { setPrivacySaved(true); setTimeout(() => setPrivacySaved(false), 2000); showToast("success", "Privacy settings saved!") }}>
                    <Save size={14} /> {privacySaved ? "Saved!" : "Save Privacy Settings"}
                  </button>
                </div>
              </div>
            )}

            {/* ── DANGER TAB ── */}
            {tab === "danger" && (
              <div className="card" style={{ padding: 24, borderLeft: "4px solid var(--danger)" }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 8, color: "var(--danger)" }}>
                  <AlertTriangle size={16} /> Danger Zone
                </div>

                <div style={{ padding: "18px 20px", borderRadius: 14, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)", marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Deactivate Account</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.7 }}>
                    Temporarily deactivate your account. Your data will be preserved and you can reactivate at any time.
                  </div>
                  <button className="btn" style={{ fontSize: 13, border: "1px solid rgba(239,68,68,0.3)", color: "var(--danger)" }}
                    onClick={() => showToast("error", "Deactivation disabled in demo")}>
                    Deactivate Account
                  </button>
                </div>

                <div style={{ padding: "18px 20px", borderRadius: 14, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.06)" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: "var(--danger)" }}>Delete Account Permanently</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.7 }}>
                    Permanently delete your account and all data including classes, lessons, posts and messages. <strong>This action cannot be undone.</strong>
                  </div>
                  {!showDeleteConfirm ? (
                    <button style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "var(--danger)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
                      onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 size={14} /> Delete My Account
                    </button>
                  ) : (
                    <div style={{ padding: 18, borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                      <div style={{ fontWeight: 800, color: "var(--danger)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertTriangle size={15} /> Are you absolutely sure?
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
                        Type <strong style={{ color: "var(--danger)" }}>DELETE</strong> below to confirm permanent deletion.
                      </div>
                      <input className="audit-control" placeholder="Type DELETE to confirm"
                        value={deleteText} onChange={e => setDeleteText(e.target.value)}
                        style={{ marginBottom: 14, borderColor: "rgba(239,68,68,0.4)" }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: deleteText === "DELETE" ? "var(--danger)" : "rgba(239,68,68,0.3)", color: "white", fontWeight: 700, fontSize: 13, cursor: deleteText === "DELETE" ? "pointer" : "not-allowed", fontFamily: "inherit" }}
                          disabled={deleteText !== "DELETE"}
                          onClick={() => showToast("error", "Account deletion disabled in demo")}>
                          Confirm Delete
                        </button>
                        <button className="btn" onClick={() => { setShowDeleteConfirm(false); setDeleteText("") }}>Cancel</button>
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