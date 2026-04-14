import { useState, useRef, useEffect, useCallback } from "react"
import AppShell from "@/components/layout/AppShell"
import { api } from "@/api/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/useAuth"
import { useAuthStore } from "@/features/auth/auth.store"
import {
  ChevronLeft, FileText, Video, Link2, BookOpen,
  Eye, Clock, Edit2, Save, X, Share2, MessageCircle,
  Send, Trash2, ExternalLink, Monitor, MonitorOff,
  Mic, MicOff, VideoOff, Users, Copy, Maximize2,
  Bold, Italic, List, Heading2, Code, AlignLeft
} from "lucide-react"

interface LessonResource { id: number; resource_type: string; url: string; title?: string; mime_type?: string }
interface Lesson {
  id: number; title: string; description?: string; content: string
  class_id: number; subject_id: number; teacher_id: number
  lesson_type: string; visibility: string; status: string
  resources: LessonResource[]; created_at: string; updated_at: string
}
interface Comment {
  id: number; content: string; user_id: number; lesson_id: number
  created_at: string; author: { id: number; full_name: string; role: string } | null
}
type Props = { lesson: Lesson; onBack: () => void }

const TYPE_LABEL: Record<string, string> = {
  note: "📝 Note", video: "🎥 Video", live: "🔴 Live", assignment: "📋 Assignment"
}
const RESOURCE_ICON: Record<string, React.ReactNode> = {
  file: <FileText size={15} />, image: <Eye size={15} />,
  video: <Video size={15} />, link: <Link2 size={15} />,
}

function getBaseUrl() { return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1","") || "http://localhost:8000" }

function Avatar({ user, size = 32 }: { user: any; size?: number }) {
  const colors = ["#cb26e4","#38bdf8","#22c55e","#f59e0b","#ef4444","#8b5cf6"]
  const color = colors[(user?.full_name?.charCodeAt(0) ?? 0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: size * 0.38, flexShrink: 0 }}>
      {user?.full_name?.[0]?.toUpperCase() ?? "?"}
    </div>
  )
}

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("# ")) return <h1 key={i} style={{ fontSize: 26, fontWeight: 900, margin: "20px 0 10px" }}>{line.slice(2)}</h1>
    if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: 20, fontWeight: 800, margin: "18px 0 8px", color: "var(--accent)" }}>{line.slice(3)}</h2>
    if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 16, fontWeight: 700, margin: "14px 0 6px" }}>{line.slice(4)}</h3>
    if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} style={{ marginLeft: 24, lineHeight: 1.8 }}>{line.slice(2)}</li>
    if (line.startsWith("**") && line.endsWith("**")) return <strong key={i} style={{ display: "block", margin: "6px 0" }}>{line.slice(2, -2)}</strong>
    if (line.startsWith("> ")) return <blockquote key={i} style={{ borderLeft: "4px solid var(--accent)", paddingLeft: 14, margin: "8px 0", color: "var(--muted)", fontStyle: "italic" }}>{line.slice(2)}</blockquote>
    if (line === "") return <div key={i} style={{ height: 8 }} />
    return <p key={i} style={{ margin: "6px 0", lineHeight: 1.8 }}>{line}</p>
  })
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(d).toLocaleDateString()
}

// ── Rich Content Editor with Preview ──
function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [preview, setPreview] = useState(false)
  const [activeTab, setActiveTab] = useState<"write"|"insert">("write")
  const [history, setHistory] = useState<string[]>([value])
  const [historyIdx, setHistoryIdx] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Save to history on meaningful change
  const pushHistory = useCallback((newVal: string) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIdx + 1)
      return [...trimmed, newVal].slice(-50)
    })
    setHistoryIdx(prev => Math.min(prev + 1, 49))
    onChange(newVal)
  }, [historyIdx, onChange])

  const undo = useCallback(() => {
    if (historyIdx <= 0) return
    const newIdx = historyIdx - 1
    setHistoryIdx(newIdx)
    onChange(history[newIdx])
  }, [historyIdx, history, onChange])

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return
    const newIdx = historyIdx + 1
    setHistoryIdx(newIdx)
    onChange(history[newIdx])
  }, [historyIdx, history, onChange])

  const insert = useCallback((before: string, after: string = "", placeholder: string = "", newLine = false) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = ta.value.substring(start, end) || placeholder
    const prefix = newLine && start > 0 && ta.value[start - 1] !== "\n" ? "\n" : ""
    const suffix = newLine ? "\n" : ""
    const newText = ta.value.substring(0, start) + prefix + before + selected + after + suffix + ta.value.substring(end)
    pushHistory(newText)
    setTimeout(() => {
      ta.focus()
      const pos = start + prefix.length + before.length
      ta.setSelectionRange(pos, pos + selected.length)
    }, 0)
  }, [pushHistory])

  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const newText = ta.value.substring(0, start) + text + ta.value.substring(start)
    pushHistory(newText)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + text.length, start + text.length) }, 0)
  }, [pushHistory])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo() }
    if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo() }
    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); insert("**","**","bold text") }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); insert("*","*","italic text") }
    if (e.key === "Tab") { e.preventDefault(); insertAtCursor("  ") }
  }, [undo, redo, insert, insertAtCursor])

  const TABLE_TEMPLATE = `| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
`
  const DIAGRAM_TEMPLATE = `\`\`\`
[Box A] --> [Box B] --> [Box C]
              |
           [Box D]
\`\`\`
`
  const MATH_TEMPLATE = `$$
E = mc^2
$$
`

  const TOOLBAR_GROUPS = [
    {
      label: "Format",
      items: [
        { icon: "H1", title: "Heading 1 (Ctrl+1)", action: () => insert("# ","","Heading 1", true) },
        { icon: "H2", title: "Heading 2", action: () => insert("## ","","Heading 2", true) },
        { icon: "H3", title: "Heading 3", action: () => insert("### ","","Heading 3", true) },
        { icon: "─", title: "Divider", action: () => insertAtCursor("\n---\n") },
      ]
    },
    {
      label: "Text",
      items: [
        { icon: "B", title: "Bold (Ctrl+B)", action: () => insert("**","**","bold"), style: { fontWeight: 900 } },
        { icon: "I", title: "Italic (Ctrl+I)", action: () => insert("*","*","italic"), style: { fontStyle: "italic" } },
        { icon: "S̶", title: "Strikethrough", action: () => insert("~~","~~","strikethrough") },
        { icon: "`", title: "Inline Code", action: () => insert("`","`","code") },
        { icon: "==", title: "Highlight", action: () => insert("==","==","highlighted") },
      ]
    },
    {
      label: "Lists",
      items: [
        { icon: "•", title: "Bullet List", action: () => insert("- ","","List item", true) },
        { icon: "1.", title: "Numbered List", action: () => insert("1. ","","List item", true) },
        { icon: "✓", title: "Checklist", action: () => insert("- [ ] ","","Task", true) },
        { icon: "❝", title: "Blockquote", action: () => insert("> ","","Quote", true) },
      ]
    },
  ]

  const INSERT_ITEMS = [
    {
      group: "Media",
      items: [
        {
          icon: "🖼️", label: "Image from URL",
          action: () => {
            const url = prompt("Enter image URL:")
            const alt = prompt("Alt text (optional):") || "image"
            if (url) insertAtCursor(`\n![${alt}](${url})\n`)
          }
        },
        {
          icon: "📷", label: "Upload Image",
          action: () => fileInputRef.current?.click()
        },
        {
          icon: "🎥", label: "YouTube Video",
          action: () => {
            const url = prompt("Enter YouTube URL:")
            if (url) {
              const id = url.match(/(?:v=|youtu\.be\/)([^&?\s]+)/)?.[1]
              if (id) insertAtCursor(`\n[![YouTube](https://img.youtube.com/vi/${id}/0.jpg)](${url})\n`)
              else insertAtCursor(`\n[▶ Watch Video](${url})\n`)
            }
          }
        },
        {
          icon: "🔗", label: "Link",
          action: () => {
            const url = prompt("Enter URL:")
            const text = prompt("Link text:") || url
            if (url) insert(`[${text}](`, ")", url)
          }
        },
      ]
    },
    {
      group: "Tables & Structure",
      items: [
        {
          icon: "📊", label: "Insert Table",
          action: () => insertAtCursor("\n" + TABLE_TEMPLATE)
        },
        {
          icon: "📋", label: "2-Col Table",
          action: () => insertAtCursor("\n| Term | Definition |\n|------|------------|\n| Term | Definition |\n")
        },
        {
          icon: "📐", label: "Diagram",
          action: () => insertAtCursor("\n" + DIAGRAM_TEMPLATE)
        },
        {
          icon: "➗", label: "Math Formula",
          action: () => insertAtCursor("\n" + MATH_TEMPLATE)
        },
      ]
    },
    {
      group: "Lesson Templates",
      items: [
        {
          icon: "📝", label: "Learning Objectives",
          action: () => insertAtCursor("\n## Learning Objectives\n\nBy the end of this lesson, students will be able to:\n- Objective 1\n- Objective 2\n- Objective 3\n")
        },
        {
          icon: "❓", label: "Review Questions",
          action: () => insertAtCursor("\n## Review Questions\n\n1. Question one?\n2. Question two?\n3. Question three?\n")
        },
        {
          icon: "🔑", label: "Key Terms Box",
          action: () => insertAtCursor("\n## Key Terms\n\n| Term | Definition |\n|------|------------|\n| Term 1 | Definition here |\n| Term 2 | Definition here |\n")
        },
        {
          icon: "💡", label: "Note/Tip Box",
          action: () => insertAtCursor("\n> 💡 **Note:** Add your important note or tip here.\n")
        },
        {
          icon: "⚠️", label: "Warning Box",
          action: () => insertAtCursor("\n> ⚠️ **Important:** Add your warning or caution here.\n")
        },
        {
          icon: "📌", label: "Summary Box",
          action: () => insertAtCursor("\n## Summary\n\nIn this lesson we covered:\n- Key point 1\n- Key point 2\n- Key point 3\n")
        },
        {
          icon: "🧪", label: "Example Block",
          action: () => insertAtCursor("\n### Example\n\n**Problem:** State the problem here.\n\n**Solution:** Show the solution step by step.\n\n**Answer:** Final answer.\n")
        },
        {
          icon: "📖", label: "Full Lesson Template",
          action: () => insertAtCursor(`
## Introduction

Brief introduction to the topic.

## Learning Objectives

- Students will understand...
- Students will be able to...
- Students will apply...

## Key Concepts

### Concept 1

Explanation here.

### Concept 2

Explanation here.

## Examples

### Example 1

**Problem:** ...
**Solution:** ...

## Key Terms

| Term | Definition |
|------|------------|
| Term | Definition |

## Summary

Key takeaways from this lesson.

## Review Questions

1. Question one?
2. Question two?
3. Question three?
`)
        },
      ]
    },
    {
      group: "Code Blocks",
      items: [
        { icon: "JS", label: "JavaScript", action: () => insertAtCursor("\n```javascript\n// code here\n```\n") },
        { icon: "PY", label: "Python", action: () => insertAtCursor("\n```python\n# code here\n```\n") },
        { icon: "</>", label: "HTML", action: () => insertAtCursor("\n```html\n<!-- code here -->\n```\n") },
        { icon: "{ }", label: "Generic Code", action: () => insertAtCursor("\n```\ncode here\n```\n") },
      ]
    },
  ]

  const canUndo = historyIdx > 0
  const canRedo = historyIdx < history.length - 1

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--card)" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
        {["write","insert"].map(t => (
          <button key={t} type="button" onClick={() => setActiveTab(t as any)}
            style={{ padding: "9px 18px", border: "none", background: activeTab === t ? "var(--card)" : "transparent", color: activeTab === t ? "var(--accent)" : "var(--muted)", fontWeight: 800, fontSize: 13, cursor: "pointer", borderBottom: activeTab === t ? "2px solid var(--accent)" : "2px solid transparent", fontFamily: "inherit", textTransform: "capitalize" }}>
            {t === "write" ? "✏️ Write" : "➕ Insert"}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {/* Undo/Redo */}
        <div style={{ display: "flex", gap: 2, padding: "0 8px" }}>
          <button type="button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            style={{ width: 30, height: 30, borderRadius: 6, border: "none", background: "transparent", cursor: canUndo ? "pointer" : "not-allowed", color: canUndo ? "var(--text)" : "var(--muted)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ↩
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"
            style={{ width: 30, height: 30, borderRadius: 6, border: "none", background: "transparent", cursor: canRedo ? "pointer" : "not-allowed", color: canRedo ? "var(--text)" : "var(--muted)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ↪
          </button>
        </div>
        {/* Preview toggle */}
        <button type="button" onClick={() => setPreview(p => !p)}
          style={{ margin: "4px 8px 4px 0", padding: "4px 12px", borderRadius: 8, border: "1px solid var(--border)", background: preview ? "var(--accent)" : "transparent", color: preview ? "white" : "var(--muted)", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
          {preview ? "✏️ Edit" : "👁 Preview"}
        </button>
      </div>

      {/* WRITE TAB — Toolbar */}
      {activeTab === "write" && !preview && (
        <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "6px 10px", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexWrap: "wrap", rowGap: 4 }}>
          {TOOLBAR_GROUPS.map((group, gi) => (
            <div key={gi} style={{ display: "flex", alignItems: "center", gap: 1 }}>
              {gi > 0 && <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 6px" }} />}
              {group.items.map((item, ii) => (
                <button key={ii} type="button" onClick={item.action} title={item.title}
                  style={{ minWidth: 28, height: 28, padding: "0 5px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "var(--text)", fontSize: 12, fontWeight: 700, fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", ...((item as any).style ?? {}) }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--card)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  {item.icon}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* INSERT TAB */}
      {activeTab === "insert" && (
        <div style={{ padding: 16, background: "var(--bg2)", borderBottom: "1px solid var(--border)", maxHeight: 300, overflowY: "auto" }}>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = ev => {
                  const url = ev.target?.result as string
                  insertAtCursor(`\n![${file.name}](${url})\n`)
                }
                reader.readAsDataURL(file)
              }
              e.target.value = ""
            }} />
          {INSERT_ITEMS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{group.group}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6 }}>
                {group.items.map((item, ii) => (
                  <button key={ii} type="button"
                    onClick={() => { item.action(); setActiveTab("write") }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 6%, var(--card))" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--card)" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor / Preview */}
      {preview ? (
        <div style={{ padding: 24, minHeight: 280, fontSize: 15, lineHeight: 1.8 }}>
          {renderContent(value)}
        </div>
      ) : (
        <textarea ref={textareaRef} value={value}
          onChange={e => pushHistory(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write lesson content...&#10;&#10;Use the toolbar above or Insert tab for tables, images, templates and more.&#10;&#10;Keyboard shortcuts:&#10;Ctrl+Z = Undo  |  Ctrl+Y = Redo  |  Ctrl+B = Bold  |  Ctrl+I = Italic  |  Tab = Indent"
          style={{ width: "100%", minHeight: 300, padding: "16px", border: "none", background: "var(--card)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.8, display: "block" }} />
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 14px", background: "var(--bg2)", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--muted)" }}>
        <span>Ctrl+Z undo · Ctrl+B bold · Ctrl+I italic · Tab indent · Insert tab for tables & templates</span>
        <span>{value.length} chars · {value.split(/\s+/).filter(Boolean).length} words · ~{Math.max(1, Math.ceil(value.split(/\s+/).length / 200))} min read</span>
      </div>
    </div>
  )
}
// ── Live Presentation Mode ──
function LivePresentation({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [slide, setSlide] = useState(0)
  const [shareLink] = useState(`${window.location.origin}/live/${lesson.id}`)
  const [copied, setCopied] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const screenRef = useRef<HTMLVideoElement>(null)

  const slides = lesson.content.split("\n").filter(l => l.startsWith("## ")).map(l => l.slice(3))
  const contentLines = lesson.content.split("\n")

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(s => {
        setStream(s)
        if (videoRef.current) videoRef.current.srcObject = s
      }).catch(() => {})
    return () => { stream?.getTracks().forEach(t => t.stop()); screenStream?.getTracks().forEach(t => t.stop()) }
  }, [])

  const toggleMic = () => {
    stream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setMicOn(m => !m)
  }

  const toggleCam = () => {
    stream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setCamOn(c => !c)
  }

  const startScreenShare = async () => {
    try {
      const s = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true })
      setScreenStream(s)
      setSharing(true)
      if (screenRef.current) screenRef.current.srcObject = s
      s.getVideoTracks()[0].onended = () => { setSharing(false); setScreenStream(null) }
    } catch {}
  }

  const stopScreenShare = () => {
    screenStream?.getTracks().forEach(t => t.stop())
    setScreenStream(null); setSharing(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // Get content for current slide
  const getSlideContent = (slideTitle: string) => {
    const start = contentLines.findIndex(l => l === `## ${slideTitle}`)
    if (start < 0) return []
    const end = contentLines.findIndex((l, i) => i > start && l.startsWith("## "))
    return contentLines.slice(start + 1, end < 0 ? undefined : end).filter(l => l.trim())
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0f", zIndex: 2000, display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "rpPulse 1.5s infinite" }} />
          <span style={{ color: "white", fontWeight: 800, fontSize: 15 }}>🔴 Live: {lesson.title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Share link */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <Users size={13} style={{ color: "#38bdf8" }} />
            <span style={{ color: "white", fontSize: 12, fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shareLink}</span>
            <button onClick={copyLink} style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>
              {copied ? "✅" : <Copy size={12} />}
            </button>
          </div>
          <button onClick={onClose}
            style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.15)", color: "#fb7185", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
            End Session
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Presentation area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {sharing && screenStream ? (
            <video ref={screenRef} autoPlay muted style={{ flex: 1, objectFit: "contain", background: "#000" }} />
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, background: "linear-gradient(135deg, #1a0a2e 0%, #0d1117 100%)" }}>
              {slides.length > 0 ? (
                <>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 20, fontWeight: 600 }}>
                    SLIDE {slide + 1} / {slides.length}
                  </div>
                  <h1 style={{ color: "white", fontSize: 36, fontWeight: 900, textAlign: "center", marginBottom: 32, lineHeight: 1.3 }}>
                    {slides[slide]}
                  </h1>
                  <div style={{ maxWidth: 700, width: "100%" }}>
                    {getSlideContent(slides[slide]).slice(0, 6).map((line, i) => (
                      <div key={i} style={{ color: "rgba(255,255,255,0.8)", fontSize: 18, lineHeight: 1.8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-start", gap: 10 }}>
                        {line.startsWith("- ") ? (
                          <><span style={{ color: "#cb26e4", fontSize: 20, lineHeight: 1.5 }}>◆</span><span>{line.slice(2)}</span></>
                        ) : <span>{line}</span>}
                      </div>
                    ))}
                  </div>
                  {/* Slide nav */}
                  <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
                    <button onClick={() => setSlide(s => Math.max(0, s - 1))} disabled={slide === 0}
                      style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "white", cursor: slide === 0 ? "not-allowed" : "pointer", opacity: slide === 0 ? 0.4 : 1, fontWeight: 700, fontFamily: "inherit" }}>
                      ← Prev
                    </button>
                    <button onClick={() => setSlide(s => Math.min(slides.length - 1, s + 1))} disabled={slide === slides.length - 1}
                      style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(203,38,228,0.5)", background: "rgba(203,38,228,0.15)", color: "#d946ef", cursor: slide === slides.length - 1 ? "not-allowed" : "pointer", opacity: slide === slides.length - 1 ? 0.4 : 1, fontWeight: 700, fontFamily: "inherit" }}>
                      Next →
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
                  <h2 style={{ color: "white", marginBottom: 8 }}>{lesson.title}</h2>
                  <p style={{ fontSize: 14 }}>No slide headings found. Use ## in content to create slides.</p>
                  <p style={{ fontSize: 13, marginTop: 8 }}>Share your screen to present external content.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar — camera + controls */}
        <div style={{ width: 260, background: "rgba(255,255,255,0.03)", borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" }}>
          {/* Camera */}
          <div style={{ position: "relative", aspectRatio: "4/3", background: "#000", overflow: "hidden" }}>
            <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: camOn ? "block" : "none" }} />
            {!camOn && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
                <VideoOff size={32} style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={toggleMic}
                style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", background: micOn ? "rgba(255,255,255,0.1)" : "rgba(239,68,68,0.3)", color: micOn ? "white" : "#fb7185", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
                {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                {micOn ? "Mute" : "Unmute"}
              </button>
              <button onClick={toggleCam}
                style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", background: camOn ? "rgba(255,255,255,0.1)" : "rgba(239,68,68,0.3)", color: camOn ? "white" : "#fb7185", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
                {camOn ? <Video size={16} /> : <VideoOff size={16} />}
                {camOn ? "Hide" : "Show"}
              </button>
            </div>

            <button onClick={sharing ? stopScreenShare : startScreenShare}
              style={{ padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", background: sharing ? "rgba(34,197,94,0.2)" : "rgba(56,189,248,0.15)", color: sharing ? "#34d399" : "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
              {sharing ? <MonitorOff size={16} /> : <Monitor size={16} />}
              {sharing ? "Stop Sharing" : "Share Screen"}
            </button>

            {/* Slide list */}
            {slides.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Slides</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                  {slides.map((s, i) => (
                    <button key={i} onClick={() => setSlide(i)}
                      style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${i === slide ? "rgba(203,38,228,0.5)" : "rgba(255,255,255,0.08)"}`, background: i === slide ? "rgba(203,38,228,0.15)" : "transparent", color: i === slide ? "#d946ef" : "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 12, fontWeight: 600, textAlign: "left", fontFamily: "inherit" }}>
                      {i + 1}. {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Invite link */}
            <div style={{ marginTop: "auto", padding: "12px", borderRadius: 10, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)" }}>
              <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, marginBottom: 6 }}>🔗 Invite Link</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", wordBreak: "break-all", marginBottom: 8 }}>{shareLink}</div>
              <button onClick={copyLink}
                style={{ width: "100%", padding: "6px", borderRadius: 6, border: "none", background: "rgba(56,189,248,0.2)", color: "#38bdf8", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>
                {copied ? "✅ Copied!" : <><Copy size={11} /> Copy Link</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LessonDetail({ lesson, onBack }: Props) {
  const { isTeacher, isAdmin, user } = useAuth()
  const currentUser = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: lesson.title, description: lesson.description ?? "",
    content: lesson.content, status: lesson.status, visibility: lesson.visibility
  })
  const [commentText, setCommentText] = useState("")
  const [tab, setTab] = useState<"content"|"discussion"|"resources">("content")
  const [shareLoading, setShareLoading] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [liveMode, setLiveMode] = useState(false)
  const [contentPreview, setContentPreview] = useState(false)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const { data: fresh, refetch } = useQuery({
    queryKey: ["lesson", lesson.id],
    queryFn: async () => (await api.get(`/lessons/${lesson.id}`)).data as Lesson,
    initialData: lesson, staleTime: 30000,
  })

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["lesson-discussion", lesson.id],
    queryFn: async () => {
      const res = await api.get(`/lessons/${lesson.id}/discussion`).catch(() => ({ data: [] }))
      return Array.isArray(res.data) ? res.data as Comment[] : []
    },
    enabled: tab === "discussion",
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => api.patch(`/lessons/${lesson.id}`, data),
    onSuccess: () => { refetch(); setEditing(false); queryClient.invalidateQueries({ queryKey: ["lessons"] }) },
  })

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => api.post(`/lessons/${lesson.id}/discussion`, { content }),
    onSuccess: () => { setCommentText(""); refetchComments() },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async (cid: number) => api.delete(`/lessons/${lesson.id}/discussion/${cid}`),
    onSuccess: () => refetchComments(),
  })

  const shareToFeed = async () => {
    setShareLoading(true)
    try {
      const joinUrl = `${window.location.origin}/classes/discover`
      const shareContent = [
        `📚 **${fresh.title}**`,
        ``,
        fresh.description || fresh.content.slice(0, 200) + "...",
        ``,
        `## What you will learn:`,
        fresh.content.split("\n").filter((line: string) => line.startsWith("- ") || line.startsWith("## ")).slice(0, 4).join("\n"),
        ``,
        `🎓 **Join the class to access the full interactive lesson, resources and discussion!**`,
        `🔗 Find the class at: ${joinUrl}`,
      ].filter(Boolean).join("\n")
      await api.post("/posts", {
        content: shareContent, post_type: "note", visibility: "public",
        title: `📚 ${fresh.title}`,
      })
      setShareSuccess(true)
      setTimeout(() => setShareSuccess(false), 3000)
    } catch (e) { console.error("Share failed", e) }
    finally { setShareLoading(false) }
  }

  const l = fresh ?? lesson
  const wordCount = l.content.split(/\s+/).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))
  const canEdit = (isTeacher && l.teacher_id === currentUser?.id) || !!isAdmin
  const slides = l.content.split("\n").filter(line => line.startsWith("## ")).map(l => l.slice(3))

  return (
    <>
      {/* Live Presentation Overlay */}
      {liveMode && <LivePresentation lesson={l} onClose={() => setLiveMode(false)} />}

      <AppShell>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 16px 40px" }}>

          {/* Back */}
          <button className="btn" onClick={onBack} style={{ marginBottom: 16 }}>
            <ChevronLeft size={16} /> Back to Lessons
          </button>

          {/* Header card */}
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            {editing ? (
              /* ── EDIT FORM ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--accent)" }}>
                  <Edit2 size={18} /> Edit Lesson
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-field">
                    <label className="form-label">Title</label>
                    <input className="audit-control" value={editForm.title}
                      onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Description</label>
                    <input className="audit-control" value={editForm.description}
                      onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                </div>

                {/* Rich editor with preview */}
                <div className="form-field">
                  <label className="form-label" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Content</span>
                    <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>
                      {slides.length > 0 && `${slides.length} slide sections detected`}
                    </span>
                  </label>
                  <RichEditor value={editForm.content} onChange={v => setEditForm(p => ({ ...p, content: v }))} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-field">
                    <label className="form-label">Status</label>
                    <select className="audit-control select" value={editForm.status}
                      onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Visibility</label>
                    <select className="audit-control select" value={editForm.visibility}
                      onChange={e => setEditForm(p => ({ ...p, visibility: e.target.value }))}>
                      <option value="class">Class only</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button className="btn" onClick={() => setEditing(false)}><X size={14} /> Cancel</button>
                  <button className="btn btn-primary" onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending}>
                    <Save size={14} /> {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              /* ── VIEW HEADER ── */
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    <span className="chip">{TYPE_LABEL[l.lesson_type] ?? l.lesson_type}</span>
                    <span className="chip" style={{ color: l.status === "published" ? "var(--success)" : "var(--muted)" }}>{l.status}</span>
                    {l.visibility === "public" && <span className="chip" style={{ color: "var(--accent2)" }}>🌐 Public</span>}
                    <span className="chip">Class #{l.class_id}</span>
                    {slides.length > 0 && <span className="chip" style={{ color: "var(--accent)" }}>📊 {slides.length} slides</span>}
                  </div>
                  <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 8px" }}>{l.title}</h1>
                  {l.description && <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 12px" }}>{l.description}</p>}
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> ~{readTime} min read</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><BookOpen size={12} /> {wordCount} words</span>
                    <span>Updated {new Date(l.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {/* Live Present button */}
                  {canEdit && (
                    <button className="btn" style={{ fontSize: 12, background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.3)" }}
                      onClick={() => setLiveMode(true)}>
                      🔴 Go Live
                    </button>
                  )}
                  <button className="btn" style={{ fontSize: 12 }} onClick={shareToFeed} disabled={shareLoading}>
                    {shareSuccess ? "✅ Shared!" : shareLoading ? "..." : <><Share2 size={13} /> Share</>}
                  </button>
                  {canEdit && (
                    <button className="btn" style={{ fontSize: 12 }} onClick={() => setEditing(true)}>
                      <Edit2 size={13} /> Edit
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="tabs-bar" style={{ marginBottom: 16 }}>
            {[
              { key: "content", label: "📖 Content" },
              { key: "discussion", label: `💬 Discussion${comments.length > 0 ? ` (${comments.length})` : ""}` },
              { key: "resources", label: `🔗 Resources${l.resources.length > 0 ? ` (${l.resources.length})` : ""}` },
            ].map(t => (
              <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key as any)}>{t.label}</button>
            ))}
          </div>

          {/* CONTENT TAB */}
          {tab === "content" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Content preview toggle */}
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justify: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <span style={{ fontWeight: 800 }}>Lesson Content</span>
                  <button className="btn" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setContentPreview(p => !p)}>
                    {contentPreview ? <><AlignLeft size={13} /> Raw</> : <><Eye size={13} /> Preview</>}
                  </button>
                </div>
                {contentPreview ? (
                  <div style={{ fontSize: 15, lineHeight: 1.8 }}>{renderContent(l.content)}</div>
                ) : (
                  <pre style={{ fontSize: 13, lineHeight: 1.7, color: "var(--muted)", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{l.content}</pre>
                )}
              </div>

              {/* Slides overview */}
              {slides.length > 0 && (
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    📊 Presentation Slides
                    {canEdit && (
                      <button className="btn" style={{ fontSize: 11, padding: "4px 12px", marginLeft: "auto" }} onClick={() => setLiveMode(true)}>
                        🔴 Present Live
                      </button>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                    {slides.map((s, i) => (
                      <div key={i} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg2)", fontSize: 13 }}>
                        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>SLIDE {i + 1}</div>
                        <div style={{ fontWeight: 700, color: "var(--text)" }}>{s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Share section */}
              <div className="card" style={{ padding: 20, borderLeft: "4px solid var(--accent)" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>📢 Share this lesson</div>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
                  Share a preview to the feed so others can discover and join the class.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={shareToFeed} disabled={shareLoading}>
                    <Share2 size={13} /> {shareLoading ? "Sharing..." : "Share to Feed"}
                  </button>
                  <button className="btn" style={{ fontSize: 12 }}
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/lessons/${l.id}`).then(() => alert("Link copied!"))}>
                    <Link2 size={13} /> Copy Link
                  </button>
                  {canEdit && (
                    <button className="btn" style={{ fontSize: 12, background: "rgba(239,68,68,0.08)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.25)" }}
                      onClick={() => setLiveMode(true)}>
                      🔴 Start Live Presentation
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DISCUSSION TAB */}
          {tab === "discussion" && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>💬 Class Discussion</div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
                Ask questions, share insights and discuss this lesson with classmates.
              </p>
              {/* Comment Input */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
                <Avatar user={currentUser} size={36} />
                <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)" }}>
                  <input ref={commentInputRef} value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && commentText.trim()) { e.preventDefault(); addCommentMutation.mutate(commentText) } }}
                    placeholder="Add a comment or question..."
                    style={{ flex: 1, border: "none", background: "transparent", color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px" }}
                    onClick={() => commentText.trim() && addCommentMutation.mutate(commentText)}
                    disabled={!commentText.trim() || addCommentMutation.isPending}>
                    {addCommentMutation.isPending ? "..." : <Send size={14} />}
                  </button>
                </div>
              </div>
              {/* Comments */}
              {comments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)" }}>
                  <MessageCircle size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div style={{ fontSize: 14 }}>No comments yet — be the first!</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {comments.map((c, i) => (
                    <div key={c.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < comments.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <Avatar user={c.author} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 800, fontSize: 14 }}>{c.author?.full_name ?? "Unknown"}</span>
                          {c.author?.role !== "learner" && (
                            <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
                              {c.author?.role}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>{timeAgo(c.created_at)}</span>
                          {(c.user_id === currentUser?.id || isAdmin || isTeacher) && (
                            <button onClick={() => deleteCommentMutation.mutate(c.id)}
                              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", padding: 2, borderRadius: 4, transition: "color 0.15s" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
                              onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>{c.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RESOURCES TAB */}
          {tab === "resources" && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>🔗 Lesson Resources</div>
              {l.resources.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)" }}>
                  <Link2 size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div style={{ fontSize: 14 }}>No resources attached to this lesson</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {l.resources.map(res => (
                    <a key={res.id} href={res.url} target="_blank" rel="noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)", textDecoration: "none", color: "var(--text)", transition: "all 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                      <span style={{ color: "var(--accent)", flexShrink: 0 }}>{RESOURCE_ICON[res.resource_type] ?? <Link2 size={15} />}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, fontWeight: 600 }}>{res.title ?? res.url}</span>
                      <ExternalLink size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </AppShell>
    </>
  )
}