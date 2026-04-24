import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Bookmark, BookmarkX, Heart, MessageCircle, Share2,
  Search, X, FileText, Globe, Lock, ExternalLink, Filter, Image, Video, Link2
} from "lucide-react"

interface Author { id: number; full_name: string; role: string }
interface Attachment { id: number; file_url: string; file_name: string; mime_type: string }
interface Post {
  id: number; content: string; post_type: string; visibility: string
  title?: string; status: string
  author: Author; attachments: Attachment[]
  reactions_count: number; comments_count: number; saves_count: number
  is_liked: boolean; is_saved: boolean
  created_at: string
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function Avatar({ name, role, size = 38 }: { name: string; role?: string; size?: number }) {
  const colors: Record<string, string> = { teacher: "#cb26e4", admin: "#ef4444", learner: "#38bdf8" }
  const color = colors[role ?? "learner"] ?? "#38bdf8"
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  )
}

const TYPE_COLORS: Record<string, string> = {
  text: "#38bdf8", note: "#cb26e4", image: "#22c55e",
  video: "#ef4444", link: "#f59e0b", announcement: "#8b5cf6", lesson: "#cb26e4",
}
const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <FileText size={12} />, note: <FileText size={12} />,
  image: <Image size={12} />, video: <Video size={12} />,
  link: <Link2 size={12} />, lesson: <FileText size={12} />,
}

function PostCard({ post, onUnsave }: { post: Post; onUnsave: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false)
  const color = TYPE_COLORS[post.post_type] ?? "#38bdf8"
  const isLong = (post.content?.length ?? 0) > 220
  const content = expanded || !isLong ? post.content : post.content?.slice(0, 220) + "..."

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${color},${color}55)` }} />
      <div style={{ padding: "16px 18px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          <Avatar name={post.author?.full_name ?? "?"} role={post.author?.role} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{post.author?.full_name}</span>
              {post.author?.role !== "learner" && (
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: `${color}15`, color, fontWeight: 700 }}>
                  {post.author?.role}
                </span>
              )}
              <span style={{ fontSize: 11, color: "var(--muted)" }}>┬À {timeAgo(post.created_at)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color, fontWeight: 600 }}>
                {TYPE_ICONS[post.post_type] ?? <FileText size={11} />} {post.post_type}
              </span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>┬À</span>
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--muted)" }}>
                {post.visibility === "public" ? <Globe size={10} /> : <Lock size={10} />} {post.visibility}
              </span>
            </div>
          </div>

          {/* Unsave */}
          <button onClick={() => onUnsave(post.id)} title="Remove from saved"
            style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b", flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.18)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.08)"}>
            <BookmarkX size={15} />
          </button>
        </div>

        {/* Title */}
        {post.title && <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, lineHeight: 1.3 }}>{post.title}</div>}

        {/* Content */}
        {post.content && (
          <>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)", marginBottom: 4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {content}
            </div>
            {isLong && (
              <button onClick={() => setExpanded(e => !e)}
                style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: "0 0 8px", fontFamily: "inherit" }}>
                {expanded ? "Show less Ôåæ" : "Read more Ôåô"}
              </button>
            )}
          </>
        )}

        {/* Attachments */}
        {post.attachments?.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, marginTop: 8 }}>
            {post.attachments.map(att => {
              const url = att.file_url?.startsWith("http") ? att.file_url : `http://localhost:8000${att.file_url}`
              const isImg = att.mime_type?.startsWith("image/")
              const isVid = att.mime_type?.startsWith("video/")
              if (isImg) return (
                <img key={att.id} src={url} alt={att.file_name} onClick={() => window.open(url, "_blank")}
                  style={{ maxWidth: 200, maxHeight: 140, borderRadius: 10, objectFit: "cover", cursor: "pointer", border: "1px solid var(--border)" }} />
              )
              if (isVid) return (
                <video key={att.id} controls style={{ maxWidth: 240, maxHeight: 140, borderRadius: 10, border: "1px solid var(--border)" }}>
                  <source src={url} type={att.mime_type} />
                </video>
              )
              return (
                <a key={att.id} href={url} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "var(--bg2)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text)", textDecoration: "none" }}>
                  <ExternalLink size={12} /> {att.file_name}
                </a>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 10, borderTop: "1px solid var(--border)", marginTop: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: post.is_liked ? "#ef4444" : "var(--muted)" }}>
            <Heart size={14} fill={post.is_liked ? "#ef4444" : "none"} /> {post.reactions_count}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--muted)" }}>
            <MessageCircle size={14} /> {post.comments_count}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>
            <Bookmark size={14} fill="#f59e0b" /> {post.saves_count}
          </span>
          <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/feed`).then(() => alert("Link copied!"))}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)", fontSize: 12, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}>
            <Share2 size={12} /> Share
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SavedPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const queryClient = useQueryClient()

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ["saved-posts"],
    queryFn: async () => {
      const res = await api.get("/posts/saved")
      return Array.isArray(res.data) ? res.data as Post[] : []
    },
    staleTime: 30000,
  })

  const unsaveMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/posts/${id}/save`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-posts"] }),
  })

  const types = ["all", ...Array.from(new Set(saved.map((p: Post) => p.post_type)))]
  const filtered = saved.filter((p: Post) => {
    const matchType = typeFilter === "all" || p.post_type === typeFilter
    const q = search.toLowerCase()
    const matchSearch = !q || p.content?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q) || p.author?.full_name?.toLowerCase().includes(q)
    return matchType && matchSearch
  })

  return (
    <AppShell>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 60px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bookmark size={22} style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Saved Posts</h1>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {isLoading ? "Loading..." : `${saved.length} item${saved.length !== 1 ? "s" : ""} bookmarked`}
            </div>
          </div>
        </div>

        {/* Search + Filter bar */}
        {saved.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180, display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)" }}>
              <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                id="search" name="search" placeholder="Search saved posts..."
                style={{ flex: 1, border: "none", background: "transparent", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
              {search && (
                <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
                  <X size={13} />
                </button>
              )}
            </div>

            {types.length > 2 && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <Filter size={13} style={{ color: "var(--muted)" }} />
                {types.map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${typeFilter === t ? "var(--accent)" : "var(--border)"}`, background: typeFilter === t ? "rgba(203,38,228,0.1)" : "var(--bg2)", color: typeFilter === t ? "var(--accent)" : "var(--muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1,2,3].map(i => <div key={i} className="card" style={{ height: 160, opacity: 0.35 }} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && saved.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(245,158,11,0.08)", border: "2px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Bookmark size={36} style={{ color: "#f59e0b" }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 8px" }}>Nothing saved yet</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.7 }}>
              Bookmark posts from your feed to read them later.<br />
              Click the ­ƒöû icon on any post to save it here.
            </p>
            <button onClick={() => window.location.href = "/feed"}
              style={{ padding: "11px 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#cb26e4,#8b5cf6)", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(203,38,228,0.3)" }}>
              Browse Feed
            </button>
          </div>
        )}

        {/* No search results */}
        {!isLoading && saved.length > 0 && filtered.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <Search size={32} style={{ opacity: 0.25, marginBottom: 10 }} />
            <div style={{ fontWeight: 700, marginBottom: 6 }}>No results found</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Try a different search or filter</div>
          </div>
        )}

        {/* Posts list */}
        {!isLoading && filtered.length > 0 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filtered.map((post: Post) => (
                <PostCard key={post.id} post={post}
                  onUnsave={id => { if (window.confirm("Remove from saved?")) unsaveMutation.mutate(id) }} />
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--muted)" }}>
              Showing {filtered.length} of {saved.length} saved post{saved.length !== 1 ? "s" : ""}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
