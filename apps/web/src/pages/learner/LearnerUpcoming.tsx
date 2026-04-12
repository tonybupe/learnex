import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useNavigate } from "react-router-dom"
import { Video, Calendar } from "lucide-react"

export default function LearnerUpcoming() {
  const navigate = useNavigate()

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["upcoming-sessions"],
    queryFn: async () => {
      const res = await api.get("/live-sessions/upcoming")
      return Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
    },
    retry: false,
    staleTime: 60000,
  })

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">📅 Upcoming Sessions</span>
        <button
          className="btn"
          style={{ fontSize: 12, padding: "4px 10px" }}
          onClick={() => navigate("/live-sessions")}
        >
          View all
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: "var(--muted)", fontSize: 13, padding: "8px 0" }}>Loading...</div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <Video size={28} style={{ color: "var(--muted)", marginBottom: 8 }} />
          <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>No upcoming sessions</p>
        </div>
      ) : (
        <div className="upcoming-list">
          {sessions.slice(0, 4).map((s: any) => (
            <div key={s.id} className="upcoming-item">
              <div>
                <div className="upcoming-subject">{s.title}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {s.teacher?.full_name && `by ${s.teacher.full_name}`}
                </div>
              </div>
              <div className="upcoming-time">
                <Calendar size={12} style={{ display: "inline", marginRight: 4 }} />
                {formatTime(s.start_time)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}