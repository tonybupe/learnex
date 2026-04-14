import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "@/api/client"
import { Search, X, GraduationCap, Users, FileText, Loader2, Clock, TrendingUp, ArrowRight, BookOpen } from "lucide-react"
import "./GlobalSearch.css"

interface SearchResult {
  id: number; type: "lesson"|"class"|"user"|"post"
  title: string; subtitle?: string; path: string
}

const TYPE_CONFIG = {
  lesson: { icon: <FileText size={13} />,      color: "#cb26e4", label: "Lesson"  },
  class:  { icon: <GraduationCap size={13} />, color: "#38bdf8", label: "Class"   },
  user:   { icon: <Users size={13} />,          color: "#22c55e", label: "Person"  },
  post:   { icon: <BookOpen size={13} />,       color: "#f59e0b", label: "Post"    },
}

const RECENT_KEY = "learnex_recent_searches"
function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") } catch { return [] }
}
function addRecent(q: string) {
  const prev = getRecent().filter(r => r !== q)
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 6)))
}

const SUGGESTIONS = ["Mathematics","Biology","English","Physics","ICT lessons","Live sessions","Quizzes","Grade 12"]

export default function GlobalSearch({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [recent, setRecent] = useState<string[]>(getRecent())
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const [lessonsRes, classesRes, usersRes] = await Promise.allSettled([
        api.get(`/lessons?search=${encodeURIComponent(q)}&limit=4`).catch(() => ({ data: [] })),
        api.get(`/classes?search=${encodeURIComponent(q)}&limit=3`).catch(() => ({ data: [] })),
        api.get(`/users?search=${encodeURIComponent(q)}&limit=3`).catch(() => ({ data: [] })),
      ])
      const mapped: SearchResult[] = []
      const lessons = lessonsRes.status === "fulfilled" ? (Array.isArray(lessonsRes.value.data) ? lessonsRes.value.data : lessonsRes.value.data?.items ?? []) : []
      lessons.forEach((l: any) => mapped.push({ id: l.id, type: "lesson", title: l.title, subtitle: `Class #${l.class_id} · ${l.lesson_type}`, path: "/lessons" }))
      const classes = classesRes.status === "fulfilled" ? (Array.isArray(classesRes.value.data) ? classesRes.value.data : classesRes.value.data?.items ?? []) : []
      classes.forEach((c: any) => mapped.push({ id: c.id, type: "class", title: c.name, subtitle: `${c.member_count ?? 0} students`, path: "/classes" }))
      const users = usersRes.status === "fulfilled" ? (Array.isArray(usersRes.value.data) ? usersRes.value.data : usersRes.value.data?.items ?? []) : []
      users.forEach((u: any) => mapped.push({ id: u.id, type: "user", title: u.full_name ?? u.name, subtitle: u.role, path: `/profile/${u.id}` }))
      setResults(mapped)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, doSearch])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setFocused(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelect = (item: SearchResult) => {
    addRecent(item.title); setRecent(getRecent())
    setQuery(""); setResults([]); setFocused(false)
    navigate(item.path); onClose?.()
  }

  const handleQuerySubmit = (q: string) => {
    if (!q.trim()) return
    addRecent(q.trim()); setRecent(getRecent())
    navigate(`/discover?q=${encodeURIComponent(q.trim())}`)
    setQuery(""); setFocused(false); onClose?.()
  }

  const showDropdown = focused && (query.length > 0 || recent.length > 0)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setFocused(false); inputRef.current?.blur() }
    if (e.key === "Enter") { if (activeIdx >= 0 && results[activeIdx]) handleSelect(results[activeIdx]); else handleQuerySubmit(query) }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
  }

  return (
    <div ref={containerRef} className="gsearch-wrap">
      <div className={`gsearch-input-wrap ${focused ? "focused" : ""}`}>
        <Search size={15} className="gsearch-icon" />
        <input ref={inputRef} value={query}
          onChange={e => { setQuery(e.target.value); setActiveIdx(-1) }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search lessons, classes, people..."
          className="gsearch-input" autoComplete="off" />
        {loading && <Loader2 size={14} className="gsearch-spin" />}
        {query && !loading && (
          <button className="gsearch-clear" onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus() }}>
            <X size={13} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="gsearch-dropdown">
          {!query.trim() && (
            <>
              {recent.length > 0 && (
                <div className="gsearch-section">
                  <div className="gsearch-section-title"><Clock size={11} /> Recent</div>
                  {recent.map((r, i) => (
                    <button key={i} className="gsearch-item" onClick={() => { setQuery(r); doSearch(r) }}>
                      <span className="gsearch-item-icon"><Clock size={12} /></span>
                      <span className="gsearch-item-title">{r}</span>
                      <ArrowRight size={11} className="gsearch-item-arrow" />
                    </button>
                  ))}
                </div>
              )}
              <div className="gsearch-section">
                <div className="gsearch-section-title"><TrendingUp size={11} /> Popular</div>
                <div className="gsearch-chips">
                  {SUGGESTIONS.map(s => (
                    <button key={s} className="gsearch-chip" onClick={() => { setQuery(s); doSearch(s) }}>{s}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {query.trim() && (
            <>
              {loading && <div className="gsearch-loading"><Loader2 size={15} className="gsearch-spin" /> Searching...</div>}
              {!loading && results.length === 0 && (
                <div className="gsearch-empty">
                  <Search size={22} style={{ opacity: 0.25, marginBottom: 8 }} />
                  <div style={{ marginBottom: 8 }}>No results for "<strong>{query}</strong>"</div>
                  <button className="gsearch-chip" onClick={() => handleQuerySubmit(query)}>Search in Discover →</button>
                </div>
              )}
              {!loading && results.length > 0 && (
                <>
                  {(["lesson","class","user","post"] as const).map(type => {
                    const group = results.filter(r => r.type === type)
                    if (!group.length) return null
                    const cfg = TYPE_CONFIG[type]
                    return (
                      <div key={type} className="gsearch-section">
                        <div className="gsearch-section-title" style={{ color: cfg.color }}>{cfg.icon} {cfg.label}s</div>
                        {group.map((item) => (
                          <button key={item.id}
                            className={`gsearch-item ${activeIdx === results.indexOf(item) ? "active" : ""}`}
                            onClick={() => handleSelect(item)}>
                            <span className="gsearch-item-icon" style={{ background: `${cfg.color}15`, color: cfg.color }}>{cfg.icon}</span>
                            <div className="gsearch-item-body">
                              <span className="gsearch-item-title">{item.title}</span>
                              {item.subtitle && <span className="gsearch-item-sub">{item.subtitle}</span>}
                            </div>
                            <ArrowRight size={11} className="gsearch-item-arrow" />
                          </button>
                        ))}
                      </div>
                    )
                  })}
                  <button className="gsearch-all" onClick={() => handleQuerySubmit(query)}>
                    See all results for "{query}" <ArrowRight size={12} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}