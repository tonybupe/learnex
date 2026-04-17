import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import { Plus, X, BookOpen, Check, Search } from "lucide-react"

interface Subject { id: number; name: string; code: string; description?: string | null }

interface Props {
  value: string | number
  onChange: (id: string) => void
  required?: boolean
  showMineOnly?: boolean
}

function CreateSubjectModal({ onCreated, onClose }: {
  onCreated: (s: Subject) => void
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: "", code: "", description: "" })
  const [error, setError] = useState("")

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await api.post("/subjects", data)).data,
    onSuccess: (subject: Subject) => {
      queryClient.invalidateQueries({ queryKey: ["subjects-mine"] })
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      onCreated(subject)
    },
    onError: (err: any) => setError(err?.response?.data?.detail || "Failed to create subject"),
  })

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    setError("")
    if (!form.name.trim()) { setError("Name is required"); return }
    if (!form.code.trim()) { setError("Code is required"); return }
    createMutation.mutate({
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
    })
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card" style={{ width: "100%", maxWidth: 440, padding: 0, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, rgba(203,38,228,0.08), transparent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(203,38,228,0.12)", border: "1px solid rgba(203,38,228,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={15} style={{ color: "#cb26e4" }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>New Subject</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Create a subject for your classes</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", borderRadius: 6, padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-field">
              <label className="form-label">Subject Name *</label>
              <input id="subject-name" name="subject-name" className="audit-control" required
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Mathematics, Biology, ICT..." autoFocus />
            </div>
            <div className="form-field">
              <label className="form-label">Subject Code *
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginLeft: 6 }}>unique short code</span>
              </label>
              <input id="subject-code" name="subject-code" className="audit-control" required
                value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. MATH, BIO, ICT..." maxLength={30} />
            </div>
            <div className="form-field">
              <label className="form-label">Description
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginLeft: 6 }}>optional</span>
              </label>
              <input id="subject-desc" name="subject-desc" className="audit-control"
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of this subject..." />
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={createMutation.isPending} onClick={handleSubmit}>
                <Plus size={14} /> {createMutation.isPending ? "Creating..." : "Create Subject"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SubjectSelector({ value, onChange, required, showMineOnly = true }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  const { data: mySubjects = [], isLoading } = useQuery({
    queryKey: ["subjects-mine"],
    queryFn: async () => {
      const res = await api.get("/subjects?mine=true")
      return Array.isArray(res.data) ? res.data as Subject[] : []
    },
    staleTime: 60000,
  })

  const { data: allSubjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await api.get("/subjects")
      return Array.isArray(res.data) ? res.data as Subject[] : []
    },
    staleTime: 60000,
  })

  const subjects = showMineOnly ? mySubjects : allSubjects
  const selected = subjects.find(s => String(s.id) === String(value)) ||
    allSubjects.find(s => String(s.id) === String(value))

  const filtered = subjects.filter(s =>
    !search.trim() ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreated = (s: Subject) => {
    setShowCreate(false)
    onChange(String(s.id))
  }

  return (
    <>
      {showCreate && <CreateSubjectModal onCreated={handleCreated} onClose={() => setShowCreate(false)} />}

      <div style={{ position: "relative" }}>
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: open ? "1px solid var(--accent)" : value ? "1px solid rgba(203,38,228,0.35)" : "1px solid var(--border)", background: value ? "rgba(203,38,228,0.04)" : "var(--bg2)", color: "var(--text)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}>
          <BookOpen size={14} style={{ color: value ? "#cb26e4" : "var(--muted)", flexShrink: 0 }} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: selected ? "var(--text)" : "var(--muted)" }}>
            {selected ? selected.name : isLoading ? "Loading subjects..." : subjects.length === 0 ? "No subjects yet — create one" : "Select a subject..."}
          </span>
          {selected && (
            <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 999, background: "rgba(203,38,228,0.12)", color: "#cb26e4", fontWeight: 700, flexShrink: 0 }}>
              {selected.code}
            </span>
          )}
        </button>

        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", overflow: "hidden" }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <Search size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search subjects..."
                style={{ flex: 1, border: "none", background: "transparent", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                autoFocus />
              {search && <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><X size={12} /></button>}
            </div>

            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {isLoading ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  {subjects.length === 0 ? "You have no subjects yet." : "No match found."}
                </div>
              ) : filtered.map(s => (
                <button key={s.id} type="button"
                  onClick={() => { onChange(String(s.id)); setOpen(false); setSearch("") }}
                  style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, background: String(s.id) === String(value) ? "rgba(203,38,228,0.06)" : "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                  onMouseEnter={e => { if (String(s.id) !== String(value)) (e.currentTarget as HTMLElement).style.background = "var(--bg2)" }}
                  onMouseLeave={e => { if (String(s.id) !== String(value)) (e.currentTarget as HTMLElement).style.background = String(s.id) === String(value) ? "rgba(203,38,228,0.06)" : "transparent" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(203,38,228,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <BookOpen size={15} style={{ color: "#cb26e4" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {s.code}{s.description ? " · " + s.description.slice(0, 45) : ""}
                    </div>
                  </div>
                  {String(s.id) === String(value) && <Check size={15} style={{ color: "#cb26e4", flexShrink: 0 }} />}
                </button>
              ))}
            </div>

            <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
              <button type="button" onClick={() => { setOpen(false); setShowCreate(true) }}
                style={{ width: "100%", padding: "9px 14px", borderRadius: 9, border: "1px dashed rgba(203,38,228,0.4)", background: "rgba(203,38,228,0.04)", color: "#cb26e4", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(203,38,228,0.1)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(203,38,228,0.04)"}>
                <Plus size={14} /> Create New Subject
              </button>
            </div>
          </div>
        )}

        {open && <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setOpen(false); setSearch("") }} />}
      </div>
    </>
  )
}
