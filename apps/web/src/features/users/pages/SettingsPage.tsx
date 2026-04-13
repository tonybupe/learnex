import { useState, useMemo } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth.store"
import { useNavigate } from "react-router-dom"
import {
  User, Lock, Bell, Shield, Trash2, Save, Eye, EyeOff,
  MapPin, Globe, Briefcase, Building, CheckCircle, Camera
} from "lucide-react"

interface Profile {
  avatar_url?: string; bio?: string; location?: string; country?: string
  profession?: string; organization?: string; website?: string
  skills?: Record<string, any>; interests?: Record<string, any>
}

type Tab = "profile" | "account" | "notifications" | "privacy" | "danger"

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "profile",       label: "Profile",       icon: <User size={16} /> },
  { key: "account",       label: "Account",       icon: <Shield size={16} /> },
  { key: "notifications", label: "Notifications", icon: <Bell size={16} /> },
  { key: "privacy",       label: "Privacy",       icon: <Lock size={16} /> },
  { key: "danger",        label: "Danger Zone",   icon: <Trash2 size={16} /> },
]

const ROLE_COLOR: Record<string, string> = {
  teacher: "#cb26e4", learner: "#38bdf8", admin: "#ef4444"
}

function Avatar({ name, size = 80, url }: { name: string; size?: number; url?: string }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[name?.charCodeAt(0) % colors.length]
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: size * 0.38 }}>
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

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    bio: "", location: "", country: "", profession: "",
    organization: "", website: "", avatar_url: "",
  })
  const [formReady, setFormReady] = useState(false)

  // Fetch current user data
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/users/me")
      return res.data
    },
    onSuccess: (data: any) => {
      if (!formReady) {
        setProfileForm({
          bio: data.profile?.bio ?? "",
          location: data.profile?.location ?? "",
          country: data.profile?.country ?? "",
          profession: data.profile?.profession ?? "",
          organization: data.profile?.organization ?? "",
          website: data.profile?.website ?? "",
          avatar_url: data.profile?.avatar_url ?? "",
        })
        setFormReady(true)
      }
    }
  } as any)

  const showToast = (type: "success"|"error", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: any) => api.patch("/users/me/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] })
      showToast("success", "Profile updated successfully!")
    },
    onError: () => showToast("error", "Failed to update profile"),
  })

  // Profile completion score
  const completion = useMemo(() => {
    if (!user) return 0
    const checks = [
      user.full_name, user.email, user.phone_number, user.sex,
      profileForm.bio, profileForm.location, profileForm.profession,
      profileForm.organization, profileForm.website,
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [user, profileForm])

  const completionColor = completion >= 80 ? "var(--success)" : completion >= 50 ? "#f59e0b" : "var(--danger)"

  if (isLoading || !user) return (
    <AppShell>
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <div className="spinner" />
      </div>
    </AppShell>
  )

  const roleColor = ROLE_COLOR[user.role] ?? "var(--muted)"

  return (
    <AppShell>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 80, right: 20, zIndex: 9999,
            padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14,
            background: toast.type === "success" ? "var(--success)" : "var(--danger)",
            color: "white", boxShadow: "var(--shadow)", animation: "toastIn 0.3s ease"
          }}>
            {toast.type === "success" ? "✅" : "❌"} {toast.msg}
          </div>
        )}

        {/* Page Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px" }}>⚙️ Settings</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>Manage your account, profile and preferences</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* User Card */}
            <div className="card" style={{ padding: 16, textAlign: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <Avatar name={user.full_name} size={64} url={user.profile?.avatar_url} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{user.full_name}</div>
              <div style={{ fontSize: 12, color: roleColor, fontWeight: 700, marginTop: 4 }}>
                {user.role.toUpperCase()}
              </div>
              {user.is_verified && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 11, color: "var(--success)", marginTop: 4 }}>
                  <CheckCircle size={12} /> Verified
                </div>
              )}
              {/* Completion */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "var(--muted)" }}>Profile</span>
                  <span style={{ color: completionColor, fontWeight: 700 }}>{completion}%</span>
                </div>
                <div style={{ height: 4, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${completion}%`, background: completionColor, borderRadius: 999, transition: "width 0.3s" }} />
                </div>
              </div>
            </div>

            {/* Nav Tabs */}
            {TABS.map(t => (
              <button key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: tab === t.key ? "color-mix(in srgb, var(--accent) 12%, var(--card))" : "transparent",
                  color: tab === t.key ? "var(--accent)" : "var(--muted)",
                  transition: "all 0.15s",
                  ...(t.key === "danger" ? { color: tab === t.key ? "var(--danger)" : "var(--danger)", opacity: 0.7 } : {})
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* PROFILE TAB */}
            {tab === "profile" && (
              <>
                <div className="card">
                  <div className="card-head" style={{ marginBottom: 20 }}>
                    <span className="card-title">👤 Edit Profile</span>
                  </div>

                  {/* Avatar section */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ position: "relative" }}>
                      <Avatar name={user.full_name} size={72} url={user.profile?.avatar_url} />
                      <div style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px solid var(--card)" }}>
                        <Camera size={12} style={{ color: "white" }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{user.full_name}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>{user.email}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                      <label className="form-label">Bio</label>
                      <textarea value={profileForm.bio}
                        onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                        placeholder="Tell people about yourself..."
                        style={{ width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
                    </div>
                    {[
                      { key: "location", label: "Location", icon: <MapPin size={14} />, placeholder: "City, Country" },
                      { key: "country", label: "Country", icon: <Globe size={14} />, placeholder: "Country" },
                      { key: "profession", label: "Profession", icon: <Briefcase size={14} />, placeholder: "e.g. Software Engineer" },
                      { key: "organization", label: "Organization", icon: <Building size={14} />, placeholder: "School or Company" },
                      { key: "website", label: "Website", icon: <Globe size={14} />, placeholder: "https://yourwebsite.com" },
                      { key: "avatar_url", label: "Avatar URL", icon: <Camera size={14} />, placeholder: "https://..." },
                    ].map(field => (
                      <div key={field.key} className="form-field">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {field.icon} {field.label}
                        </label>
                        <input className="audit-control"
                          value={(profileForm as any)[field.key]}
                          onChange={e => setProfileForm(p => ({ ...p, [field.key]: e.target.value }))}
                          placeholder={field.placeholder} />
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                    <button className="btn btn-primary" style={{ padding: "10px 24px" }}
                      onClick={() => updateProfile.mutate(profileForm)}
                      disabled={updateProfile.isPending}>
                      <Save size={14} /> {updateProfile.isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ACCOUNT TAB */}
            {tab === "account" && (
              <div className="card">
                <div className="card-head" style={{ marginBottom: 20 }}>
                  <span className="card-title">🛡️ Account Information</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { label: "Full Name", value: user.full_name },
                    { label: "Email",     value: user.email },
                    { label: "Phone",     value: user.phone_number || "—" },
                    { label: "Gender",    value: user.sex || "—" },
                    { label: "Role",      value: `${user.role.toUpperCase()}`, color: roleColor },
                    { label: "Status",    value: user.is_active ? "Active" : "Inactive", color: user.is_active ? "var(--success)" : "var(--danger)" },
                    { label: "Verified",  value: user.is_verified ? "Yes ✅" : "No ❌" },
                    { label: "Member since", value: new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{row.label}</span>
                      <span style={{ fontWeight: 700, color: (row as any).color || "var(--text)" }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Role-specific info */}
                <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: `${roleColor}10`, border: `1px solid ${roleColor}30` }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: roleColor, marginBottom: 8 }}>
                    {user.role === "teacher" ? "🎓 Teacher Privileges" : user.role === "learner" ? "📚 Learner Access" : "⚙️ Admin Powers"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
                    {user.role === "teacher" && "You can create classes, lessons, quizzes, schedule live sessions and monitor learner progress."}
                    {user.role === "learner" && "You can join classes, take quizzes, view lessons, attend live sessions and track your progress."}
                    {user.role === "admin"   && "You have full platform access — manage users, moderate content and view platform analytics."}
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {tab === "notifications" && (
              <div className="card">
                <div className="card-head" style={{ marginBottom: 20 }}>
                  <span className="card-title">🔔 Notification Preferences</span>
                </div>
                {[
                  { label: "New post in class", desc: "When someone posts in your class", default: true },
                  { label: "New comment", desc: "When someone comments on your post", default: true },
                  { label: "Quiz published", desc: "When a new quiz is available", default: true },
                  { label: "Live session starting", desc: "Reminder before a live session", default: true },
                  { label: "New follower", desc: "When someone follows you", default: false },
                  { label: "Direct message", desc: "When you receive a message", default: true },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.desc}</div>
                    </div>
                    <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
                      <input type="checkbox" defaultChecked={item.default} style={{ opacity: 0, width: 0, height: 0 }}
                        onChange={() => {}} />
                      <span style={{
                        position: "absolute", inset: 0, borderRadius: 24,
                        background: item.default ? "var(--accent)" : "var(--border)",
                        transition: "background 0.2s"
                      }} />
                      <span style={{
                        position: "absolute", top: 3, left: item.default ? 23 : 3, width: 18, height: 18,
                        borderRadius: "50%", background: "white", transition: "left 0.2s"
                      }} />
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* PRIVACY TAB */}
            {tab === "privacy" && (
              <div className="card">
                <div className="card-head" style={{ marginBottom: 20 }}>
                  <span className="card-title">🔒 Privacy Settings</span>
                </div>
                {[
                  { label: "Profile visibility", desc: "Who can see your profile", options: ["Everyone", "Followers only", "Nobody"], default: "Everyone" },
                  { label: "Show email", desc: "Display email on your profile", options: ["Yes", "No"], default: "No" },
                  { label: "Show phone", desc: "Display phone on your profile", options: ["Yes", "No"], default: "No" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.desc}</div>
                    </div>
                    <select className="audit-control select" style={{ width: "auto", padding: "6px 28px 6px 10px", fontSize: 13 }}
                      defaultValue={item.default}>
                      {item.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* DANGER TAB */}
            {tab === "danger" && (
              <div className="card" style={{ borderColor: "var(--danger)" }}>
                <div className="card-head" style={{ marginBottom: 20 }}>
                  <span className="card-title" style={{ color: "var(--danger)" }}>⚠️ Danger Zone</span>
                </div>
                <div style={{ padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Delete Account</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </div>
                  {!showDeleteConfirm ? (
                    <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 size={14} /> Delete My Account
                    </button>
                  ) : (
                    <div style={{ padding: 16, borderRadius: 12, background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)" }}>
                      <div style={{ fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>Are you absolutely sure?</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>This will delete your account, posts, classes and all data permanently.</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-danger" onClick={() => alert("Account deletion would happen here")}>Yes, delete everything</button>
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