import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  Users, BookOpen, FileText, MessageCircle, Video,
  AlertTriangle, BarChart2, Shield, Settings, Search,
  CheckCircle, XCircle, Trash2, Edit2, RefreshCw,
  TrendingUp, Activity, Database, Globe
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts"

type AdminTab = "overview" | "users" | "content" | "reports" | "system"

const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview",  icon: <BarChart2 size={15} /> },
  { key: "users",    label: "Users",     icon: <Users size={15} /> },
  { key: "content",  label: "Content",   icon: <BookOpen size={15} /> },
  { key: "reports",  label: "Reports",   icon: <AlertTriangle size={15} /> },
  { key: "system",   label: "System",    icon: <Settings size={15} /> },
]

const ROLE_COLOR: Record<string, string> = {
  admin: "#ef4444", teacher: "#cb26e4", learner: "#38bdf8"
}

const PIE_COLORS = ["#cb26e4", "#38bdf8", "#ef4444", "#22c55e"]

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<AdminTab>("overview")
  const [userSearch, setUserSearch] = useState("")
  const [toast, setToast] = useState<{ type: "success"|"error"; msg: string } | null>(null)

  const showToast = (type: "success"|"error", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  // Fetch admin analytics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const res = await api.get("/analytics/dashboard/admin")
      return res.data
    },
    retry: false,
    staleTime: 30000,
  })

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.get("/users")
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: tab === "users",
  })

  // Fetch reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const res = await api.get("/moderation/reports").catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: tab === "reports",
  })

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ["admin-classes"],
    queryFn: async () => {
      const res = await api.get("/classes")
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: tab === "content",
  })

  const filteredUsers = users.filter((u: any) =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role?.toLowerCase().includes(userSearch.toLowerCase())
  )

  // Stats cards config
  const statCards = stats ? [
    { label: "Total Users",    value: stats.total_users,      icon: <Users size={20} />,        color: "#cb26e4", sub: `${stats.total_teachers} teachers ┬À ${stats.total_learners} learners` },
    { label: "Classes",        value: stats.total_classes,    icon: <BookOpen size={20} />,      color: "#38bdf8", sub: `${stats.total_subjects} subjects` },
    { label: "Content",        value: stats.total_lessons + stats.total_quizzes, icon: <FileText size={20} />, color: "#22c55e", sub: `${stats.total_lessons} lessons ┬À ${stats.total_quizzes} quizzes` },
    { label: "Posts",          value: stats.total_posts,      icon: <MessageCircle size={20} />, color: "#f59e0b", sub: `Platform discussions` },
    { label: "Live Sessions",  value: stats.total_live_sessions, icon: <Video size={20} />,     color: "#8b5cf6", sub: `Scheduled & completed` },
    { label: "Messages",       value: stats.total_messages,   icon: <MessageCircle size={20} />, color: "#06b6d4", sub: `Direct & group chats` },
    { label: "Open Reports",   value: stats.open_reports,     icon: <AlertTriangle size={20} />, color: "#ef4444", sub: `${stats.total_reports} total reports` },
    { label: "Media Files",    value: stats.total_media_files, icon: <Database size={20} />,    color: "#84cc16", sub: `Uploaded files` },
  ] : []

  // Chart data
  const userRoleData = stats ? [
    { name: "Learners", value: stats.total_learners },
    { name: "Teachers", value: stats.total_teachers },
    { name: "Admins",   value: stats.total_admins },
  ] : []

  const contentData = stats ? [
    { name: "Lessons",   value: stats.total_lessons },
    { name: "Quizzes",   value: stats.total_quizzes },
    { name: "Posts",     value: stats.total_posts },
    { name: "Sessions",  value: stats.total_live_sessions },
    { name: "Messages",  value: stats.total_messages },
  ] : []

  return (
    <AppShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 40px" }}>

        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", top: 72, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, background: toast.type === "success" ? "var(--success)" : "var(--danger)", color: "white", boxShadow: "var(--shadow)" }}>
            {toast.type === "success" ? "Ô£à" : "ÔØî"} {toast.msg}
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #ef4444, #cb26e4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={20} style={{ color: "white" }} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Admin Dashboard</h1>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
              Platform overview ┬À {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <button className="btn" onClick={() => refetchStats()} style={{ fontSize: 13 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs-bar" style={{ marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {t.icon} {t.label}
              {t.key === "reports" && stats?.open_reports > 0 && (
                <span style={{ background: "var(--danger)", color: "white", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 999, marginLeft: 2 }}>
                  {stats.open_reports}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Stats Grid */}
            {statsLoading ? (
              <div className="grid-4" style={{ gap: 16 }}>
                {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="card" style={{ height: 100, opacity: 0.4 }} />)}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                {statCards.map(card => (
                  <div key={card.label} className="card" style={{ padding: 18, borderLeft: `4px solid ${card.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ color: card.color }}>{card.icon}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{card.label}</div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: card.color, lineHeight: 1 }}>{card.value?.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{card.sub}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Charts Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* User Distribution Pie */}
              <div className="card" style={{ padding: 20 }}>
                <div className="card-head" style={{ marginBottom: 16 }}>
                  <span className="card-title">­ƒæÑ User Distribution</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={userRoleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {userRoleData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Content Bar Chart */}
              <div className="card" style={{ padding: 20 }}>
                <div className="card-head" style={{ marginBottom: 16 }}>
                  <span className="card-title">­ƒôè Platform Content</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={contentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[6,6,0,0]}>
                      {contentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card" style={{ padding: 20 }}>
              <div className="card-head" style={{ marginBottom: 16 }}>
                <span className="card-title">ÔÜí Quick Actions</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { label: "Manage Users",    icon: "­ƒæÑ", action: () => setTab("users"),    color: "#cb26e4" },
                  { label: "View Reports",    icon: "ÔÜá´©Å", action: () => setTab("reports"),  color: "#ef4444" },
                  { label: "Create Class",    icon: "­ƒÄô", action: () => navigate("/classes"), color: "#38bdf8" },
                  { label: "View Analytics",  icon: "­ƒôè", action: () => navigate("/analytics"), color: "#22c55e" },
                  { label: "Manage Content",  icon: "­ƒôÜ", action: () => setTab("content"),  color: "#f59e0b" },
                  { label: "Subjects",        icon: "­ƒôû", action: () => navigate("/subjects"), color: "#8b5cf6" },
                  { label: "Live Sessions",   icon: "­ƒÄÑ", action: () => navigate("/live-sessions"), color: "#06b6d4" },
                  { label: "System Info",     icon: "ÔÜÖ´©Å", action: () => setTab("system"),   color: "#84cc16" },
                ].map(a => (
                  <button key={a.label} onClick={a.action}
                    style={{ padding: "14px 12px", borderRadius: 12, border: `1px solid ${a.color}30`, background: `${a.color}08`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${a.color}15` }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${a.color}08` }}>
                    <span style={{ fontSize: 24 }}>{a.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: a.color }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* User Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { label: "Total Users",  value: stats?.total_users ?? "ÔÇö",    color: "#cb26e4" },
                { label: "Teachers",     value: stats?.total_teachers ?? "ÔÇö",  color: "#38bdf8" },
                { label: "Learners",     value: stats?.total_learners ?? "ÔÇö",  color: "#22c55e" },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: 16, textAlign: "center", borderTop: `3px solid ${s.color}` }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <span className="card-title">­ƒæÑ All Users</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative" }}>
                    <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input className="audit-control" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search users..." style={{ paddingLeft: 32, width: 220 }} />
                  </div>
                </div>
              </div>

              {usersLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border)" }}>
                        {["User", "Email", "Role", "Status", "Verified", "Joined", "Actions"].map(h => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "var(--muted)", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u: any) => (
                        <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: "50%", background: ROLE_COLOR[u.role] || "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                                {u.full_name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700 }}>{u.full_name}</div>
                                <div style={{ fontSize: 11, color: "var(--muted)" }}>ID: {u.id}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px", color: "var(--muted)" }}>{u.email}</td>
                          <td style={{ padding: "12px" }}>
                            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${ROLE_COLOR[u.role]}20`, color: ROLE_COLOR[u.role] }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span style={{ color: u.is_active ? "var(--success)" : "var(--danger)", fontWeight: 700, fontSize: 12 }}>
                              {u.is_active ? "Ô£à Active" : "ÔØî Inactive"}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span style={{ color: u.is_verified ? "var(--success)" : "var(--muted)", fontSize: 12 }}>
                              {u.is_verified ? "Ô£à Yes" : "ÔÅ│ No"}
                            </span>
                          </td>
                          <td style={{ padding: "12px", color: "var(--muted)", fontSize: 12 }}>
                            {(() => { try { const d = new Date(u.created_at); return isNaN(d.getTime()) ? "ÔÇö" : d.toLocaleDateString() } catch { return "ÔÇö" } })()}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }}
                                onClick={() => navigate(`/profile/${u.id}`)}>
                                <Edit2 size={11} /> View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No users found</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CONTENT TAB ── */}
        {tab === "content" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {[
                { label: "Lessons",      value: stats?.total_lessons ?? 0,       color: "#38bdf8", path: "/lessons" },
                { label: "Quizzes",      value: stats?.total_quizzes ?? 0,       color: "#cb26e4", path: "/quizzes" },
                { label: "Live Sessions",value: stats?.total_live_sessions ?? 0, color: "#22c55e", path: "/live-sessions" },
                { label: "Media Files",  value: stats?.total_media_files ?? 0,   color: "#f59e0b", path: null },
              ].map(s => (
                <div key={s.label} className="card hover-lift" style={{ padding: 18, textAlign: "center", borderTop: `3px solid ${s.color}`, cursor: s.path ? "pointer" : "default" }}
                  onClick={() => s.path && navigate(s.path)}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
                  {s.path && <div style={{ fontSize: 11, color: s.color, marginTop: 6, fontWeight: 600 }}>View all ÔåÆ</div>}
                </div>
              ))}
            </div>

            {/* Classes table */}
            <div className="card" style={{ padding: 20 }}>
              <div className="card-head" style={{ marginBottom: 16 }}>
                <span className="card-title">­ƒÄô All Classes</span>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => navigate("/classes")}>
                  Manage Classes
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)" }}>
                      {["Class", "Subject", "Teacher", "Code", "Visibility", "Status"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "var(--muted)", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classes.slice(0, 10).map((cls: any) => (
                      <tr key={cls.id} style={{ borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "12px", fontWeight: 700 }}>{cls.title}</td>
                        <td style={{ padding: "12px", color: "var(--muted)" }}>{cls.subject?.name ?? "ÔÇö"}</td>
                        <td style={{ padding: "12px", color: "var(--muted)" }}>{cls.teacher?.full_name ?? "ÔÇö"}</td>
                        <td style={{ padding: "12px" }}><span className="chip" style={{ fontSize: 11 }}>{cls.class_code}</span></td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ color: cls.visibility === "public" ? "var(--success)" : "var(--muted)", fontSize: 12, fontWeight: 600 }}>
                            {cls.visibility === "public" ? "­ƒîÉ Public" : "­ƒöÆ Private"}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ color: cls.status === "active" ? "var(--success)" : "var(--muted)", fontSize: 12, fontWeight: 600 }}>
                            {cls.status === "active" ? "Ô£à Active" : "­ƒôª Archived"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {classes.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No classes yet</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {tab === "reports" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { label: "Total Reports", value: stats?.total_reports ?? 0,    color: "var(--muted)" },
                { label: "Open Reports",  value: stats?.open_reports ?? 0,     color: "var(--danger)" },
                { label: "Resolved",      value: stats?.resolved_reports ?? 0, color: "var(--success)" },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: 18, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div className="card-head" style={{ marginBottom: 16 }}>
                <span className="card-title">ÔÜá´©Å Reports & Moderation</span>
              </div>
              {reportsLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
              ) : reports.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>Ô£à</div>
                  <h3 style={{ margin: "0 0 8px" }}>No reports</h3>
                  <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>The platform is clean ÔÇö no pending reports.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {reports.map((r: any) => (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.reason ?? "No reason provided"}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Reporter: {r.reporter_id} ┬À Content: {r.content_type}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: r.status === "open" ? "color-mix(in srgb, var(--danger) 15%, transparent)" : "color-mix(in srgb, var(--success) 15%, transparent)", color: r.status === "open" ? "var(--danger)" : "var(--success)" }}>
                          {r.status}
                        </span>
                        <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }}>Review</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SYSTEM TAB ── */}
        {tab === "system" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 24 }}>
              <div className="card-head" style={{ marginBottom: 20 }}>
                <span className="card-title">ÔÜÖ´©Å System Information</span>
              </div>
              {[
                { label: "Platform",      value: "Learnex Learning Management System" },
                { label: "Version",       value: "1.0.0" },
                { label: "Backend",       value: "FastAPI (Python 3.12)" },
                { label: "Frontend",      value: "React 18 + TypeScript + Vite" },
                { label: "Database",      value: "PostgreSQL" },
                { label: "Cache",         value: "Redis" },
                { label: "File Storage",  value: "Local (Docker Volume)" },
                { label: "WebSocket",     value: "FastAPI WebSocket" },
                { label: "API Docs",      value: "http://localhost:8000/api/v1/docs" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontWeight: 700 }}>
                    {row.label === "API Docs"
                      ? <a href={row.value} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{row.value}</a>
                      : row.value
                    }
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <div className="card-head" style={{ marginBottom: 16 }}>
                  <span className="card-title">­ƒöº Admin Tools</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Platform Analytics", icon: "­ƒôè", action: () => navigate("/analytics") },
                    { label: "Manage Subjects",    icon: "­ƒôû", action: () => navigate("/subjects") },
                    { label: "Manage Classes",     icon: "­ƒÄô", action: () => navigate("/classes") },
                    { label: "API Documentation",  icon: "­ƒôï", action: () => window.open("http://localhost:8000/api/v1/docs", "_blank") },
                  ].map(a => (
                    <button key={a.label} className="btn" style={{ fontSize: 13, justifyContent: "flex-start", gap: 10 }}
                      onClick={a.action}>
                      <span>{a.icon}</span> {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 20 }}>
                <div className="card-head" style={{ marginBottom: 16 }}>
                  <span className="card-title">­ƒôê Platform Health</span>
                </div>
                {[
                  { label: "API Status",      value: "Ô£à Online",   color: "var(--success)" },
                  { label: "Database",        value: "Ô£à Connected", color: "var(--success)" },
                  { label: "WebSocket",       value: "Ô£à Active",   color: "var(--success)" },
                  { label: "File Storage",    value: "Ô£à Available", color: "var(--success)" },
                  { label: "Open Reports",    value: stats?.open_reports > 0 ? `ÔÜá´©Å ${stats.open_reports} pending` : "Ô£à Clear", color: stats?.open_reports > 0 ? "var(--danger)" : "var(--success)" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <span style={{ color: "var(--muted)", fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
