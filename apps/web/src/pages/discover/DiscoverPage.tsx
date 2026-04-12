import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery } from "@tanstack/react-query"

export default function DiscoverPage() {
  const { data: discovery, isLoading } = useQuery({
    queryKey: ["discovery"],
    queryFn: async () => {
      const res = await api.get(endpoints.discovery.home)
      return res.data
    },
  })

  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ["trending-teachers"],
    queryFn: async () => {
      const res = await api.get(endpoints.discovery.trendingTeachers)
      return res.data as any[]
    },
  })

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["public-classes"],
    queryFn: async () => {
      const res = await api.get(endpoints.discovery.publicClasses)
      return res.data as any[]
    },
  })

  return (
    <AppShell>
      <div className="page-section">
        <div className="page-header">
          <div>
            <h1 className="page-title">Discover</h1>
            <p className="page-sub">Find trending teachers, public classes and learning content.</p>
          </div>
        </div>

        {/* Trending Teachers */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">🔥 Trending Teachers</span>
          </div>
          {loadingTeachers && <div className="card-sub">Loading...</div>}
          {!loadingTeachers && teachers.length === 0 && (
            <p className="card-sub">No trending teachers yet.</p>
          )}
          <div className="grid-2" style={{ gap: 12, marginTop: 12 }}>
            {teachers.map((teacher: any) => (
              <div key={teacher.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "var(--chip)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 18, fontWeight: 800,
                }}>
                  {teacher.full_name?.[0] ?? "T"}
                </div>
                <div>
                  <div className="card-title" style={{ fontSize: 14 }}>{teacher.full_name}</div>
                  <div className="card-sub">{teacher.followers_count ?? 0} followers</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Public Classes */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">🎓 Public Classes</span>
          </div>
          {loadingClasses && <div className="card-sub">Loading...</div>}
          {!loadingClasses && classes.length === 0 && (
            <p className="card-sub">No public classes available.</p>
          )}
          <div className="grid-2" style={{ gap: 12, marginTop: 12 }}>
            {classes.map((cls: any) => (
              <div key={cls.id} className="card">
                <div className="card-title">{cls.name}</div>
                <div className="card-sub">{cls.members_count ?? 0} members</div>
                {cls.description && (
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0 0" }}>{cls.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}