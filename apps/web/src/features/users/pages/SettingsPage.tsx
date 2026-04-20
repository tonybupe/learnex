import { useState, useMemo, useEffect, useRef } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"
import {
  User, Lock, Bell, Shield, Trash2, Save, Eye, EyeOff,
  MapPin, Globe, Briefcase, Building, Camera, CheckCircle,
  Phone, Mail, GraduationCap, BookOpen, BarChart2,
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
  if (resolved) return (
    <img src={resolved} alt={name}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--border)" }}
      onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
  )
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${color}, ${color}99)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: size * 0.38, border: "3px solid var(--border)" }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: 44, height: 24, borderRadius: 999, border: "none", background: on ? "var(--accent)" : "var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
    </button>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "var(--accent)" }}>{icon}</span> {title}
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>("profile")
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 768)
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const [profileForm, setProfileForm] = useState({ bio: "", location: "", country: "", profession: "", organization: "", website: "" })
  const [accountForm, setAccountForm] = useState({ full_name: "", phone_number: "", sex: "" })
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm_password: "" })
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [formReady, setFormReady] = useState(false)
  const [privacySaved, setPrivacySaved] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState("")
  const [notifications, setNotifications] = useState({
    new_post_in_class: true, new_comment: true, quiz_published: true,
    live_session: true, new_follower: false, direct_message: true,
    lesson_published: true, class_joined: true,
  })
  const [privacy, setPrivacy] = useState({
    profile_visibility: "everyone", show_email: false, show_phone: false,
    allow_messages: "everyone", allow_follow_requests: "everyone",
    show_online_status: true, show_activity: true, data_analytics: true,
  })

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => { const res = await api.get("/users/me"); return res.data },
  })

  useEffect(() => {
    if (user && !formReady) {
      setProfileForm({
        bio: user.profile?.bio ?? "", location: user.profile?.location ?? "",
        country: user.profile?.country ?? "", profession: user.profile?.profession ?? "",
        organization: user.profile?.organization ?? "", website: user.profile?.website ?? "",
      })
      setAccountForm({ full_name: user.full_name ?? "", phone_number: user.phone_number ?? "", sex: user.sex ?? "" })
      setFormReady(true)
    }
  }, [user, formReady])

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const updateProfile = useMutation({
    mutationFn: async (data: typeof profileForm) => api.patch("/users/me/profile", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["me"] }); showToast("success", "Profile updated!") },
    onError: () => showToast("error", "Failed to update profile"),
  })

  const updateAccount = useMutation({
    mutationFn: async (data: typeof accountForm) => api.patch("/users/me", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["me"] }); showToast("success", "Account updated!") },
    onError: () => showToast("error", "Failed to update account"),
  })

  const changePassword = useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) =>
      api.post("/users/me/change-password", data),
    onSuccess: () => { setPasswordForm({ current_password: "", new_password: "", confirm_password: "" }); showToast("success", "Password changed!") },
    onError: () => showToast("error", "Failed to change password. Check your current password."),
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ type, file }: { type: "avatar" | "cover"; file: File }) => {
      const form = new FormData()
      form.append("file", file)
      return api.post(`/users/me/${type}`, form, { headers: { "Content-Type": "multipart/form-data" } })
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["me"] }); showToast("success", "Photo updated!") },
    onError: () => showToast("error", "Upload failed"),
  })

  const completion = useMemo(() => {
    if (!user) return 0
    const checks = [user.full_name, user.email, user.phone_number, user.profile?.bio, user.profile?.avatar_url, user.profile?.location, user.profile?.profession]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [user])

  const completionColor = completion >= 80 ? "var(--success)" : completion >= 50 ? "var(--warning)" : "var(--danger)"

  const safeDate = (s?: string) => {
    try { const d = new Date(s ?? ""); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) } catch { return "—" }
  }

  if (isLoading || !user) return (
    <AppShell><div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div></AppShell>
  )

  const roleColor = ROLE_COLOR[user.role] ?? "var(--muted)"
  const RoleIcon = user.role === "teacher" ? GraduationCap : user.role === "admin" ? Shield : BookOpen

  // shared input style
  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 13px", borderRadius: 10, border: "1.5px solid var(--border)",
    background: "var(--bg2)", color: "var(--text)", fontSize: 14, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "12px 12px 80px" : "24px 20px 56px" }}>

        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", top: 70, right: 16, zIndex: 9999, padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, background: toast.type === "success" ? "#22c55e" : "var(--danger)", color: "white", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 8, maxWidth: "calc(100vw - 32px)" }}>
            {toast.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} {toast.msg}
          </div>
        )}

        {/* Page header */}
        <div style={{ marginBottom: isMobile ? 16 : 24 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={isMobile ? 18 : 22} style={{ color: "var(--accent)" }} /> Settings
          </h1>
          {!isMobile && <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Manage your account, profile and preferences</p>}
        </div>

        {/* ── MOBILE LAYOUT ── */}
        {isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Mobile user card - compact */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", marginBottom: 12 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <AvatarDisplay name={user.full_name} size={56} url={user.profile?.avatar_url} />
                <button onClick={() => avatarInputRef.current?.click()}
                  style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--card)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={10} />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate({ type: "avatar", file: f }) }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name}</div>
                <div style={{ fontSize: 11, color: roleColor, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <RoleIcon size={11} /> {user.role.toUpperCase()}
                  {user.is_verified && <CheckCircle size={11} style={{ color: "var(--success)", marginLeft: 4 }} />}
                </div>
                {/* Completion bar */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${completion}%`, background: completionColor, borderRadius: 999, transition: "width 0.4s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: completionColor, fontWeight: 700, marginTop: 2 }}>Profile {completion}% complete</div>
                </div>
              </div>
              <button className="btn" style={{ fontSize: 11, padding: "6px 12px", flexShrink: 0 }} onClick={() => navigate(`/profile/${user.id}`)}>
                View
              </button>
            </div>

            {/* Mobile horizontal tab pills */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" as const, WebkitOverflowScrolling: "touch" as const }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 16px", borderRadius: 24, flexShrink: 0,
                    border: `1.5px solid ${tab === t.key ? "var(--accent)" : "var(--border)"}`,
                    background: tab === t.key ? "var(--accent)" : "var(--card)",
                    color: tab === t.key ? "white" : t.key === "danger" ? "var(--danger)" : "var(--text)",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                    whiteSpace: "nowrap", transition: "all 0.15s", fontFamily: "inherit",
                    boxShadow: tab === t.key ? "0 2px 8px rgba(203,38,228,0.3)" : "none",
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Mobile content */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {renderTabContent()}
            </div>
          </div>
        ) : (
          /* ── DESKTOP LAYOUT ── */
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, alignItems: "start" }}>

            {/* Desktop sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 80 }}>
              {/* User card */}
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
              </div>

              {/* Desktop tab nav */}
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t.key ? `color-mix(in srgb, var(--accent) 12%, var(--card))` : "transparent", color: tab === t.key ? "var(--accent)" : t.key === "danger" ? "var(--danger)" : "var(--muted)", transition: "all 0.15s", textAlign: "left", fontFamily: "inherit" }}>
                  {t.icon} {t.label}
                  {tab === t.key && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />}
                </button>
              ))}
            </div>

            {/* Desktop content */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {renderTabContent()}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )

  function renderTabContent() {
    const gridCols = isMobile ? "1fr" : "1fr 1fr"

    // ── PROFILE TAB ──
    if (tab === "profile") return (
      <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
        <SectionTitle icon={<User size={16} />} title="Edit Profile" />

        {/* Photos */}
        <div style={{ marginBottom: 24, padding: isMobile ? 14 : 18, borderRadius: 14, background: "var(--bg2)", border: "1px solid var(--border)" }}>
          <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 14, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Profile Photos</div>
          <div style={{ display: "flex", gap: isMobile ? 14 : 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ position: "relative", display: "inline-block", marginBottom: 6 }}>
                <AvatarDisplay name={user.full_name} size={isMobile ? 60 : 72} url={user.profile?.avatar_url} />
                <button onClick={() => avatarInputRef.current?.click()}
                  style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--card)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={11} />
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Avatar</div>
            </div>
            <div style={{ flex: 1, minWidth: isMobile ? "100%" : 160 }}>
              <div onClick={() => coverInputRef.current?.click()}
                style={{ height: isMobile ? 70 : 80, borderRadius: 12, cursor: "pointer", background: user.profile?.cover_url ? "transparent" : `linear-gradient(135deg, ${roleColor}20, #8b5cf620)`, border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", marginBottom: 6, transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}>
                {user.profile?.cover_url
                  ? <img src={resolveUrl(user.profile.cover_url) ?? ""} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <Camera size={20} style={{ color: "var(--muted)" }} />
                      <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Click to upload cover</span>
                    </div>}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Cover Photo</div>
            </div>
          </div>
          {uploadMutation.isPending && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Uploading...
            </div>
          )}
        </div>

        {/* Bio */}
        <div className="form-field" style={{ marginBottom: 16 }}>
          <label className="form-label">Bio</label>
          <textarea value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
            placeholder="Tell people about yourself..." maxLength={500}
            style={{ ...inp, minHeight: 80, resize: "vertical" }} />
          <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "right", marginTop: 4 }}>{profileForm.bio.length}/500</div>
        </div>

        {/* Fields */}
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 12 }}>
          {[
            { key: "location",     label: "City / Location",  icon: <MapPin size={13} />,    placeholder: "e.g. Lusaka" },
            { key: "country",      label: "Country",          icon: <Globe size={13} />,     placeholder: "e.g. Zambia" },
            { key: "profession",   label: "Profession",       icon: <Briefcase size={13} />, placeholder: "e.g. Software Engineer" },
            { key: "organization", label: "School / Company", icon: <Building size={13} />,  placeholder: "e.g. UNZA" },
            { key: "website",      label: "Website",          icon: <Globe size={13} />,     placeholder: "https://yoursite.com" },
          ].map(field => (
            <div key={field.key} className="form-field">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: "var(--muted)" }}>{field.icon}</span> {field.label}
              </label>
              <input style={inp} value={(profileForm as Record<string, string>)[field.key]}
                onChange={e => setProfileForm(p => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder} />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <button className="btn" onClick={() => setFormReady(false)}>Reset</button>
          <button className="btn btn-primary" style={{ padding: "10px 24px" }}
            onClick={() => updateProfile.mutate(profileForm)} disabled={updateProfile.isPending}>
            <Save size={14} /> {updateProfile.isPending ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    )

    // ── ACCOUNT TAB ──
    if (tab === "account") return (
      <>
        <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
          <SectionTitle icon={<UserCheck size={16} />} title="Personal Information" />
          <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 12, marginBottom: 20 }}>
            <div className="form-field">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <User size={13} style={{ color: "var(--muted)" }} /> Full Name
              </label>
              <input style={inp} value={accountForm.full_name}
                onChange={e => setAccountForm(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Your full name" />
            </div>
            <div className="form-field">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Phone size={13} style={{ color: "var(--muted)" }} /> Phone Number
              </label>
              <input style={inp} value={accountForm.phone_number}
                onChange={e => setAccountForm(p => ({ ...p, phone_number: e.target.value }))}
                placeholder="+260 97 123 4567" type="tel" />
            </div>
            <div className="form-field">
              <label className="form-label">Gender</label>
              <select style={{ ...inp }} value={accountForm.sex}
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
              <input style={{ ...inp, opacity: 0.6, cursor: "not-allowed" }} value={user.email} disabled />
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Email cannot be changed</div>
            </div>
          </div>

          {/* Account status */}
          <div style={{ padding: 14, borderRadius: 12, background: "var(--bg2)", border: "1px solid var(--border)", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Account Status</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Role", value: user.role.charAt(0).toUpperCase() + user.role.slice(1), color: roleColor },
                { label: "Since", value: safeDate(user.created_at), color: "var(--text)" },
                { label: "Status", value: user.is_active ? "Active" : "Inactive", color: user.is_active ? "var(--success)" : "var(--danger)" },
                { label: "Verified", value: user.is_verified ? "Yes" : "No", color: user.is_verified ? "var(--accent)" : "var(--muted)" },
              ].map(row => (
                <div key={row.label} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: row.color }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <button className="btn btn-primary" style={{ padding: "10px 24px" }}
              onClick={() => updateAccount.mutate(accountForm)} disabled={updateAccount.isPending}>
              <Save size={14} /> {updateAccount.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
          <SectionTitle icon={<Key size={16} />} title="Change Password" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-field">
              <label className="form-label">Current Password</label>
              <div style={{ position: "relative" }}>
                <input style={{ ...inp, paddingRight: 44 }} type={showCurrentPw ? "text" : "password"}
                  value={passwordForm.current_password}
                  onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))}
                  placeholder="Enter current password" />
                <button type="button" onClick={() => setShowCurrentPw(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 12 }}>
              <div className="form-field">
                <label className="form-label">New Password</label>
                <div style={{ position: "relative" }}>
                  <input style={{ ...inp, paddingRight: 44 }} type={showNewPw ? "text" : "password"}
                    value={passwordForm.new_password}
                    onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))}
                    placeholder="Min. 8 characters" />
                  <button type="button" onClick={() => setShowNewPw(v => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Confirm New Password</label>
                <input style={inp} type="password" value={passwordForm.confirm_password}
                  onChange={e => setPasswordForm(p => ({ ...p, confirm_password: e.target.value }))}
                  placeholder="Repeat new password" />
              </div>
            </div>
            {passwordForm.new_password && passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
              <div style={{ fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>Passwords do not match</div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <button className="btn btn-primary" style={{ padding: "10px 24px" }}
              disabled={!passwordForm.current_password || !passwordForm.new_password || passwordForm.new_password !== passwordForm.confirm_password || changePassword.isPending}
              onClick={() => changePassword.mutate({ current_password: passwordForm.current_password, new_password: passwordForm.new_password })}>
              <Key size={14} /> {changePassword.isPending ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      </>
    )

    // ── NOTIFICATIONS TAB ──
    if (tab === "notifications") return (
      <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
        <SectionTitle icon={<Bell size={16} />} title="Notification Preferences" />
        {[
          { key: "new_post_in_class", label: "New post in class",      desc: "When someone posts in a class you're in",     icon: <Users size={14} /> },
          { key: "new_comment",       label: "New comment",            desc: "When someone comments on your post",          icon: <MessageSquare size={14} /> },
          { key: "lesson_published",  label: "Lesson published",       desc: "When a new lesson is added to your class",    icon: <BookOpen size={14} /> },
          { key: "quiz_published",    label: "Quiz available",         desc: "When a new quiz is published in your class",  icon: <CheckCircle size={14} /> },
          { key: "live_session",      label: "Live session starting",  desc: "Reminder before a live class session",        icon: <BarChart2 size={14} /> },
          { key: "new_follower",      label: "New follower",           desc: "When someone starts following you",           icon: <UserCheck size={14} /> },
          { key: "direct_message",    label: "Direct messages",        desc: "When you receive a new message",              icon: <MessageSquare size={14} /> },
          { key: "class_joined",      label: "Student joined class",   desc: "When a learner joins your class",             icon: <Users size={14} /> },
        ].map(item => (
          <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid var(--border)", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", flexShrink: 0 }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: isMobile ? 13 : 14 }}>{item.label}</div>
                {!isMobile && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{item.desc}</div>}
              </div>
            </div>
            <Toggle on={(notifications as Record<string, boolean>)[item.key]} onChange={v => setNotifications(p => ({ ...p, [item.key]: v }))} />
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <button className="btn btn-primary" style={{ padding: "10px 24px" }}
            onClick={() => { setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2000); showToast("success", "Notification preferences saved!") }}>
            <Save size={14} /> {notifSaved ? "Saved!" : "Save Preferences"}
          </button>
        </div>
      </div>
    )

    // ── PRIVACY TAB ──
    if (tab === "privacy") return (
      <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
        <SectionTitle icon={<Lock size={16} />} title="Privacy Settings" />

        <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 12, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Visibility</div>
        {[
          { key: "profile_visibility",   label: "Profile visibility",  options: [["everyone","Everyone"],["followers","Followers"],["nobody","Nobody"]] as [string,string][] },
          { key: "allow_messages",       label: "Who can message you", options: [["everyone","Everyone"],["followers","Followers"],["nobody","Nobody"]] as [string,string][] },
          { key: "allow_follow_requests", label: "Who can follow you", options: [["everyone","Everyone"],["nobody","Nobody"]] as [string,string][] },
        ].map(item => (
          <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid var(--border)", gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: isMobile ? 13 : 14 }}>{item.label}</div>
            <select style={{ ...inp, width: isMobile ? 130 : 160, padding: "8px 12px", fontSize: 13 }}
              value={(privacy as Record<string, string>)[item.key]}
              onChange={e => setPrivacy(p => ({ ...p, [item.key]: e.target.value }))}>
              {item.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
        ))}

        <div style={{ fontWeight: 700, fontSize: 11, margin: "20px 0 12px", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Information Sharing</div>
        {[
          { key: "show_email",         label: "Show email on profile" },
          { key: "show_phone",         label: "Show phone on profile" },
          { key: "show_online_status", label: "Show online status" },
          { key: "show_activity",      label: "Show activity status" },
          { key: "data_analytics",     label: "Allow usage analytics" },
        ].map(item => (
          <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: isMobile ? 13 : 14 }}>{item.label}</div>
            <Toggle on={(privacy as Record<string, boolean>)[item.key]} onChange={v => setPrivacy(p => ({ ...p, [item.key]: v }))} />
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <button className="btn btn-primary" style={{ padding: "10px 24px" }}
            onClick={() => { setPrivacySaved(true); setTimeout(() => setPrivacySaved(false), 2000); showToast("success", "Privacy settings saved!") }}>
            <Save size={14} /> {privacySaved ? "Saved!" : "Save Privacy Settings"}
          </button>
        </div>
      </div>
    )

    // ── DANGER TAB ──
    if (tab === "danger") return (
      <div className="card" style={{ padding: isMobile ? 16 : 24, borderLeft: "4px solid var(--danger)" }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 8, color: "var(--danger)" }}>
          <AlertTriangle size={16} /> Danger Zone
        </div>

        <div style={{ padding: isMobile ? 14 : 18, borderRadius: 14, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Deactivate Account</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.7 }}>
            Temporarily deactivate your account. Your data will be preserved and you can reactivate at any time.
          </div>
          <button className="btn" style={{ fontSize: 13, border: "1px solid rgba(239,68,68,0.3)", color: "var(--danger)" }}
            onClick={() => showToast("error", "Deactivation disabled in demo")}>
            Deactivate Account
          </button>
        </div>

        <div style={{ padding: isMobile ? 14 : 18, borderRadius: 14, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.06)" }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: "var(--danger)" }}>Delete Account Permanently</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.7 }}>
            Permanently delete your account and all data. <strong>This cannot be undone.</strong>
          </div>
          {!showDeleteConfirm ? (
            <button style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "var(--danger)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
              onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={14} /> Delete My Account
            </button>
          ) : (
            <div style={{ padding: 16, borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <div style={{ fontWeight: 800, color: "var(--danger)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={15} /> Are you absolutely sure?
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
                Type <strong style={{ color: "var(--danger)" }}>DELETE</strong> to confirm.
              </div>
              <input style={{ ...inp, marginBottom: 12, borderColor: "rgba(239,68,68,0.4)" }}
                placeholder="Type DELETE to confirm" value={deleteText} onChange={e => setDeleteText(e.target.value)} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
    )

    return null
  }
}