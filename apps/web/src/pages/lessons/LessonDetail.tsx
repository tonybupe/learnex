import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, FileText, Video, Link2, Download, BookOpen, Eye, Clock } from "lucide-react"
import { endpoints } from "@/api/endpoints"

interface LessonResource { id: number; resource_type: string; url: string; title?: string; mime_type?: string }
interface Lesson {
  id: number; title: string; description?: string; content: string
  class_id: number; subject_id: number; teacher_id: number
  lesson_type: string; visibility: string; status: string
  resources: LessonResource[]; created_at: string; updated_at: string
}

type Props = { lesson: Lesson; onBack: () => void }

const RESOURCE_ICON: Record<string, React.ReactNode> = {
  file: <FileText size={16} />,
  image: <Eye size={16} />,
  video: <Video size={16} />,
  link: <Link2 size={16} />,
}

const TYPE_LABEL: Record<string, string> = {
  note: "📝 Note", video: "🎥 Video", live: "🔴 Live", assignment: "📋 Assignment"
}

export default function LessonDetail({ lesson, onBack }: Props) {
  // Fetch fresh lesson data with resources
  const { data: fresh } = useQuery({
    queryKey: ["lesson", lesson.id],
    queryFn: async () => {
      const res = await api.get(endpoints.lessons.get(lesson.id))
      return res.data as Lesson
    },
    initialData: lesson,
    staleTime: 30000,
  })

  const l = fresh ?? lesson
  const wordCount = l.content.split(/\s+/).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  const renderContent = (content: string) => {
    // Basic markdown-like rendering
    return content
      .split("\n")
      .map((line, i) => {
        if (line.startsWith("# ")) return <h1 key={i} style={{ fontSize: 24, fontWeight: 800, margin: "16px 0 8px" }}>{line.slice(2)}</h1>
        if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: 20, fontWeight: 700, margin: "14px 0 6px" }}>{line.slice(3)}</h2>
        if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 16, fontWeight: 700, margin: "12px 0 4px" }}>{line.slice(4)}</h3>
        if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} style={{ marginLeft: 20, lineHeight: 1.8 }}>{line.slice(2)}</li>
        if (line.startsWith("**") && line.endsWith("**")) return <strong key={i} style={{ display: "block", margin: "4px 0" }}>{line.slice(2, -2)}</strong>
        if (line === "") return <br key={i} />
        return <p key={i} style={{ margin: "6px 0", lineHeight: 1.7 }}>{line}</p>
      })
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px" }}>

        {/* Back Button */}
        <button className="btn" onClick={onBack} style={{ marginBottom: 20 }}>
          <ChevronLeft size={16} /> Back to Lessons
        </button>

        {/* Lesson Header Card */}
        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span className="chip">{TYPE_LABEL[l.lesson_type] ?? l.lesson_type}</span>
                <span className="chip" style={{ color: l.status === "published" ? "var(--success)" : "var(--muted)" }}>
                  {l.status}
                </span>
                <span className="chip">Class #{l.class_id}</span>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 8px", lineHeight: 1.3 }}>{l.title}</h1>
              {l.description && (
                <p style={{ color: "var(--muted)", fontSize: 15, margin: "0 0 12px", lineHeight: 1.5 }}>{l.description}</p>
              )}
              <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={12} /> ~{readTime} min read
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <BookOpen size={12} /> {wordCount} words
                </span>
                <span>Updated {new Date(l.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: l.resources.length > 0 ? "1fr 280px" : "1fr", gap: 20, alignItems: "start" }}>

          {/* Main Content */}
          <div className="card" style={{ padding: 28 }}>
            <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text)" }}>
              {renderContent(l.content)}
            </div>
          </div>

          {/* Resources Sidebar */}
          {l.resources.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <div className="card-head" style={{ marginBottom: 14 }}>
                  <span className="card-title">📎 Resources</span>
                  <span className="chip">{l.resources.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {l.resources.map(res => (
                    <a key={res.id} href={res.url} target="_blank" rel="noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)",
                        textDecoration: "none", color: "var(--text)", transition: "all 0.15s",
                        fontSize: 13, fontWeight: 600
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                      <span style={{ color: "var(--accent)" }}>{RESOURCE_ICON[res.resource_type] ?? <Link2 size={16} />}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {res.title ?? res.url}
                      </span>
                      <Download size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card" style={{ padding: 20 }}>
                <div className="card-title" style={{ marginBottom: 12 }}>Quick Actions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button className="btn btn-primary" style={{ width: "100%", fontSize: 13 }}
                    onClick={() => window.print()}>
                    🖨️ Print Lesson
                  </button>
                  <button className="btn" style={{ width: "100%", fontSize: 13 }}
                    onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert("Link copied!"))}>
                    🔗 Copy Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}