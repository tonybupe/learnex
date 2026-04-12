import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useAuthStore } from "@/features/auth/auth.store"

export default function LearnerActivity() {
  const user = useAuthStore(s => s.user)

  const { data, isLoading } = useQuery({
    queryKey: ["learner-activity", user?.id],
    queryFn: async () => {
      const res = await api.get(`/analytics/users/${user?.id}/activity`)
      return res.data
    },
    enabled: !!user?.id,
    retry: false,
    staleTime: 60000,
  })

  const activities = data?.recent_activity ?? data?.activities ?? []

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">📊 Recent Activity</span>
      </div>

      {isLoading ? (
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading...</div>
      ) : activities.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
            No recent activity yet. Start by joining a class!
          </p>
        </div>
      ) : (
        <div className="activity-list">
          {activities.slice(0, 5).map((a: any, i: number) => (
            <div key={i} className="activity-row">
              <div className="activity-title">{a.title ?? a.action ?? "Activity"}</div>
              {a.description && <div className="activity-desc">{a.description}</div>}
              {a.created_at && (
                <div className="activity-time">
                  {new Date(a.created_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}