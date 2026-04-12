import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import type { Class } from "@/features/classes/types/class.types"
import { useState } from "react"
import { Globe, Users, BookOpen, Search } from "lucide-react"

export default function DiscoverClassesPage() {
  const { isLearner } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["discover-classes"],
    queryFn: async () => {
      const res = await api.get(endpoints.classes.discover)
      return (Array.isArray(res.data) ? res.data : res.data?.items ?? []) as Class[]
    },
  })

  const joinMutation = useMutation({
    mutationFn: async (id: number) => api.post(endpoints.classes.join(id), {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discover-classes"] }),
  })

  const filtered = classes.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.subject?.name.toLowerCase().includes(search.toLowerCase()) ||
    c.class_code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell>
      <div className="page-section">
        <div className="page-header">
          <div>
            <h1 className="page-title">🔍 Discover Classes</h1>
            <p className="page-sub">Find and join public classes from teachers around the platform.</p>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", maxWidth: 480 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input className="audit-control" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, subject or code..."
            style={{ paddingLeft: 38 }} />
        </div>

        {isLoading && (
          <div className="grid-2" style={{ gap: 16 }}>
            {[1,2,3,4].map(i => <div key={i} className="card" style={{ height: 160, opacity: 0.4 }} />)}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div className="card-title" style={{ marginBottom: 8 }}>No public classes found</div>
            <p className="card-sub">{search ? "Try a different search term." : "No public classes available yet."}</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid-2" style={{ gap: 16 }}>
            {filtered.map(cls => (
              <div key={cls.id} className="card hover-lift" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ height: 4, borderRadius: "12px 12px 0 0", margin: "-14px -14px 0", background: "linear-gradient(90deg, var(--accent2), var(--success))" }} />

                <div style={{ paddingTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="chip">{cls.class_code}</span>
                    {cls.grade_level && <span className="chip">{cls.grade_level}</span>}
                    <span className="chip" style={{ display: "flex", alignItems: "center", gap: 4 }}><Globe size={10} /> public</span>
                  </div>
                  <div className="card-title" style={{ fontSize: 17, marginBottom: 4 }}>{cls.title}</div>
                  {cls.subject && <div className="card-sub">📚 {cls.subject.name}</div>}
                  {cls.teacher && <div className="card-sub">👤 {cls.teacher.full_name}</div>}
                </div>

                {cls.description && (
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {cls.description}
                  </p>
                )}

                {isLearner && (
                  <button className="btn btn-primary" style={{ fontSize: 13 }}
                    onClick={() => joinMutation.mutate(cls.id)}
                    disabled={joinMutation.isPending && joinMutation.variables === cls.id}>
                    <Users size={14} /> Join Class
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}