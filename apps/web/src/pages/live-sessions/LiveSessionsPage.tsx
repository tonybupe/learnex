import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useState } from "react"

interface LiveSession {
  id: number
  title: string
  description?: string
  class_id?: number
  status: "scheduled" | "live" | "ended" | "cancelled"
  start_time: string
  meeting_url?: string
  teacher?: { full_name: string }
}

export default function LiveSessionsPage() {
  const { isTeacher, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", class_id: "", start_time: "", meeting_url: "" })
  const [error, setError] = useState("")

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["live-sessions"],
    queryFn: async () => {
      const res = await api.get(endpoints.liveSessions.list)
      return res.data as LiveSession[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => { await api.post(endpoints.liveSessions.create, data) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["live-sessions"] }); setShowForm(false) },
    onError: (err: any) => setError(err?.response?.data?.detail || "Failed to create session"),
  })

  const joinMutation = useMutation({
    mutationFn: async (id: number) => { await api.post(endpoints.liveSessions.join(id), {}) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-sessions"] }),
  })

  const statusColor = (status: string) => ({
    scheduled: "var(--accent2)",
    live: "var(--success)",
    ended: "var(--muted)",
    cancelled: "var(--danger)",
  }[status] || "var(--muted)")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    createMutation.mutate({
      title: form.title,
      description: form.description,
      class_id: form.class_id ? Number(form.class_id) : undefined,
      start_time: form.start_time,
      meeting_url: form.meeting_url || undefined,
    })
  }

  return (
    <AppShell>
      <div className="page-section">
        <div className="page-header">
          <div>
            <h1 className="page-title">Live Sessions</h1>
            <p className="page-sub">Join or host live learning sessions.</p>
          </div>
          {(isTeacher || isAdmin) && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ Schedule Session"}
            </button>
          )}
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="card" style={{ maxWidth: 540 }}>
            <div className="card-head"><span className="card-title">Schedule Live Session</span></div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-field">
                <label className="form-label">Title</label>
                <input className="audit-control" required value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Math Live Class" />
              </div>
              <div className="form-field">
                <label className="form-label">Description</label>
                <input className="audit-control" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What we'll cover..." />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-field">
                  <label className="form-label">Class ID (optional)</label>
                  <input className="audit-control" type="number" value={form.class_id}
                    onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))} placeholder="1" />
                </div>
                <div className="form-field">
                  <label className="form-label">Start Time</label>
                  <input className="audit-control" required type="datetime-local" value={form.start_time}
                    onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Meeting URL (optional)</label>
                <input className="audit-control" value={form.meeting_url}
                  onChange={e => setForm(p => ({ ...p, meeting_url: e.target.value }))} placeholder="https://meet.google.com/..." />
              </div>
              {error && <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>{error}</div>}
              <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Scheduling..." : "Schedule Session"}
              </button>
            </form>
          </div>
        )}

        {isLoading && <div className="card">Loading sessions...</div>}

        {!isLoading && sessions.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎥</div>
            <div className="card-title">No live sessions yet</div>
            <p className="card-sub">
              {isTeacher || isAdmin ? "Schedule your first live session." : "No sessions scheduled yet."}
            </p>
          </div>
        )}

        {!isLoading && sessions.length > 0 && (
          <div className="grid-2" style={{ gap: 16 }}>
            {sessions.map(session => (
              <div key={session.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card-head">
                  <div>
                    <div className="card-title">{session.title}</div>
                    {session.teacher && <div className="card-sub">by {session.teacher.full_name}</div>}
                  </div>
                  <span className="chip" style={{ color: statusColor(session.status), borderColor: statusColor(session.status) }}>
                    {session.status}
                  </span>
                </div>
                {session.description && (
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{session.description}</p>
                )}
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  🕐 {new Date(session.start_time).toLocaleString()}
                  {session.class_id && ` · Class #${session.class_id}`}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {session.status === "scheduled" && (
                    <button className="btn btn-primary" style={{ fontSize: 13, padding: "8px 14px" }}
                      onClick={() => joinMutation.mutate(session.id)}>
                      Join Session
                    </button>
                  )}
                  {session.status === "live" && (
                    <a href={session.meeting_url || "#"} target="_blank" rel="noreferrer"
                      className="btn btn-primary" style={{ fontSize: 13, padding: "8px 14px", textDecoration: "none" }}>
                      🔴 Join Live
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}