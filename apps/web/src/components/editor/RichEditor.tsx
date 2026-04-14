import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import Highlight from "@tiptap/extension-highlight"
import TextAlign from "@tiptap/extension-text-align"
import Color from "@tiptap/extension-color"
import TextStyle from "@tiptap/extension-text-style"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import { useCallback, useRef, useState, useEffect } from "react"
import "./RichEditor.css"

const lowlight = createLowlight(common)

// Convert TipTap HTML to markdown-compatible content for backend
function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<u[^>]*>(.*?)<\/u>/gi, "_$1_")
    .replace(/<mark[^>]*>(.*?)<\/mark>/gi, "==$1==")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```\n")
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, "> $1")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "$1")
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "$1")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

type Props = {
  value: string
  onChange: (markdown: string, html: string) => void
  placeholder?: string
  minHeight?: number
}

type InsertTab = "media" | "table" | "template" | "code"

const INSERT_TABS: { key: InsertTab; label: string; icon: string }[] = [
  { key: "media",    label: "Media",     icon: "🖼️" },
  { key: "table",    label: "Table",     icon: "📊" },
  { key: "template", label: "Templates", icon: "📝" },
  { key: "code",     label: "Code",      icon: "💻" },
]

export default function RichEditor({ value, onChange, placeholder = "Start writing your lesson...", minHeight = 320 }: Props) {
  const [showInsert, setShowInsert] = useState(false)
  const [insertTab, setInsertTab] = useState<InsertTab>("media")
  const [imageUrl, setImageUrl] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("")
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const [wordCount, setWordCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "editor-link" } }),
      Image.configure({ resizable: false, HTMLAttributes: { class: "editor-image" } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: value ? `<p>${value.split("\n").join("</p><p>")}</p>` : "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const md = htmlToMarkdown(html)
      const words = editor.state.doc.textContent.split(/\s+/).filter(Boolean).length
      setWordCount(words)
      onChange(md, html)
    },
    editorProps: {
      attributes: { class: "tiptap-editor", spellcheck: "true" },
    },
  })

  const insertImage = useCallback((url: string, alt = "image") => {
    if (!editor || !url.trim()) return
    editor.chain().focus().setImage({ src: url.trim(), alt }).run()
    setImageUrl("")
  }, [editor])

  const insertImageFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const src = e.target?.result as string
      editor?.chain().focus().setImage({ src, alt: file.name }).run()
    }
    reader.readAsDataURL(file)
  }, [editor])

  const insertLink = useCallback(() => {
    if (!editor || !linkUrl.trim()) return
    if (linkText) {
      editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run()
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run()
    }
    setLinkUrl(""); setLinkText("")
  }, [editor, linkUrl, linkText])

  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run()
    setShowInsert(false)
  }, [editor, tableRows, tableCols])

  if (!editor) return <div className="tiptap-loading">Loading editor...</div>

  const isActive = (name: string, attrs?: any) => editor.isActive(name, attrs)

  const ToolBtn = ({ onClick, active, title, children, danger }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode; danger?: boolean }) => (
    <button type="button" onClick={onClick} title={title}
      className={`tiptap-tool-btn ${active ? "is-active" : ""} ${danger ? "is-danger" : ""}`}>
      {children}
    </button>
  )

  return (
    <div className="tiptap-wrapper">

      {/* ── MAIN TOOLBAR ── */}
      <div className="tiptap-toolbar">
        {/* History */}
        <div className="tiptap-tool-group">
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)" active={false}>↩</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)" active={false}>↪</ToolBtn>
        </div>

        <div className="tiptap-divider" />

        {/* Headings */}
        <div className="tiptap-tool-group">
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1" active={isActive("heading", { level: 1 })}>H1</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2" active={isActive("heading", { level: 2 })}>H2</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3" active={isActive("heading", { level: 3 })}>H3</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setParagraph().run()} title="Normal text" active={isActive("paragraph")}>¶</ToolBtn>
        </div>

        <div className="tiptap-divider" />

        {/* Text formatting */}
        <div className="tiptap-tool-group">
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)" active={isActive("bold")}><strong>B</strong></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)" active={isActive("italic")}><em>I</em></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)" active={isActive("underline")}><u>U</u></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough" active={isActive("strike")}><s>S</s></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()} title="Highlight" active={isActive("highlight")}>✦</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code" active={isActive("code")}>`</ToolBtn>
        </div>

        <div className="tiptap-divider" />

        {/* Alignment */}
        <div className="tiptap-tool-group">
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left" active={isActive({ textAlign: "left" })}>≡</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Center" active={isActive({ textAlign: "center" })}>≡̈</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align right" active={isActive({ textAlign: "right" })}>≡</ToolBtn>
        </div>

        <div className="tiptap-divider" />

        {/* Lists */}
        <div className="tiptap-tool-group">
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list" active={isActive("bulletList")}>• —</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list" active={isActive("orderedList")}>1.</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote" active={isActive("blockquote")}>❝</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">—</ToolBtn>
        </div>

        <div className="tiptap-divider" />

        {/* Table controls (when in table) */}
        {isActive("table") && (
          <>
            <div className="tiptap-tool-group">
              <ToolBtn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add column before">+←</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column after">+→</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete column" danger>×col</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().addRowBefore().run()} title="Add row before">+↑</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row after">+↓</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete row" danger>×row</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete table" danger>×tbl</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleHeaderRow().run()} title="Toggle header">hdr</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().mergeCells().run()} title="Merge cells">⊞</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().splitCell().run()} title="Split cell">⊟</ToolBtn>
            </div>
            <div className="tiptap-divider" />
          </>
        )}

        {/* Insert button */}
        <button type="button" className={`tiptap-insert-btn ${showInsert ? "active" : ""}`}
          onClick={() => setShowInsert(s => !s)}>
          ➕ Insert
        </button>
      </div>

      {/* ── INSERT PANEL ── */}
      {showInsert && (
        <div className="tiptap-insert-panel">
          {/* Insert Tabs */}
          <div className="tiptap-insert-tabs">
            {INSERT_TABS.map(t => (
              <button key={t.key} type="button" className={`tiptap-insert-tab ${insertTab === t.key ? "active" : ""}`}
                onClick={() => setInsertTab(t.key)}>
                {t.icon} {t.label}
              </button>
            ))}
            <button type="button" className="tiptap-insert-close" onClick={() => setShowInsert(false)}>✕</button>
          </div>

          {/* MEDIA TAB */}
          {insertTab === "media" && (
            <div className="tiptap-insert-content">
              <div className="tiptap-insert-grid">

                {/* Image from URL */}
                <div className="tiptap-insert-card">
                  <div className="tiptap-insert-card-icon">🖼️</div>
                  <div className="tiptap-insert-card-label">Image from URL</div>
                  <input className="audit-control" value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    style={{ fontSize: 12, height: 36 }}
                    onKeyDown={e => { if (e.key === "Enter") { insertImage(imageUrl); setShowInsert(false) } }} />
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px", width: "100%" }}
                    onClick={() => { insertImage(imageUrl); setShowInsert(false) }}>
                    Insert Image
                  </button>
                </div>

                {/* Upload Image */}
                <div className="tiptap-insert-card" style={{ cursor: "pointer" }} onClick={() => fileInputRef.current?.click()}>
                  <div className="tiptap-insert-card-icon">📤</div>
                  <div className="tiptap-insert-card-label">Upload Image</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>Click to browse your device</div>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) { insertImageFile(f); setShowInsert(false) }; e.target.value = "" }} />
                  <button className="btn" style={{ fontSize: 12, width: "100%" }}>Browse Files</button>
                </div>

                {/* YouTube */}
                <div className="tiptap-insert-card">
                  <div className="tiptap-insert-card-icon">🎥</div>
                  <div className="tiptap-insert-card-label">YouTube Video</div>
                  <input className="audit-control" placeholder="https://youtube.com/watch?v=..."
                    style={{ fontSize: 12, height: 36 }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const url = (e.target as HTMLInputElement).value
                        const id = url.match(/(?:v=|youtu\.be\/)([^&?\s]+)/)?.[1]
                        if (id) {
                          editor.chain().focus().insertContent(
                            `<p><a href="${url}" target="_blank">▶ Watch on YouTube: ${url}</a></p>`
                          ).run()
                          ;(e.target as HTMLInputElement).value = ""
                          setShowInsert(false)
                        }
                      }
                    }} />
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Press Enter to insert link</div>
                </div>

                {/* Link */}
                <div className="tiptap-insert-card">
                  <div className="tiptap-insert-card-icon">🔗</div>
                  <div className="tiptap-insert-card-label">Hyperlink</div>
                  <input className="audit-control" value={linkText} onChange={e => setLinkText(e.target.value)}
                    placeholder="Link text" style={{ fontSize: 12, height: 36, marginBottom: 6 }} />
                  <input className="audit-control" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://example.com" style={{ fontSize: 12, height: 36 }} />
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px", width: "100%" }}
                    onClick={() => { insertLink(); setShowInsert(false) }}>
                    Insert Link
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TABLE TAB */}
          {insertTab === "table" && (
            <div className="tiptap-insert-content">
              <div className="tiptap-insert-grid">

                {/* Custom table */}
                <div className="tiptap-insert-card" style={{ gridColumn: "span 2" }}>
                  <div className="tiptap-insert-card-icon">📊</div>
                  <div className="tiptap-insert-card-label">Insert Custom Table</div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", margin: "8px 0" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Columns</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button type="button" className="btn" style={{ width: 28, height: 28, padding: 0, fontSize: 16 }} onClick={() => setTableCols(c => Math.max(1, c - 1))}>−</button>
                        <span style={{ fontWeight: 900, fontSize: 20, minWidth: 30, textAlign: "center" }}>{tableCols}</span>
                        <button type="button" className="btn" style={{ width: 28, height: 28, padding: 0, fontSize: 16 }} onClick={() => setTableCols(c => Math.min(10, c + 1))}>+</button>
                      </div>
                    </div>
                    <span style={{ fontSize: 20, color: "var(--muted)" }}>×</span>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Rows</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button type="button" className="btn" style={{ width: 28, height: 28, padding: 0, fontSize: 16 }} onClick={() => setTableRows(r => Math.max(1, r - 1))}>−</button>
                        <span style={{ fontWeight: 900, fontSize: 20, minWidth: 30, textAlign: "center" }}>{tableRows}</span>
                        <button type="button" className="btn" style={{ width: 28, height: 28, padding: 0, fontSize: 16 }} onClick={() => setTableRows(r => Math.min(20, r + 1))}>+</button>
                      </div>
                    </div>
                  </div>
                  {/* Visual grid preview */}
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(tableCols, 6)}, 1fr)`, gap: 2, margin: "8px auto", maxWidth: 240 }}>
                    {Array.from({ length: Math.min(tableRows, 4) * Math.min(tableCols, 6) }).map((_, i) => (
                      <div key={i} style={{ height: i < Math.min(tableCols, 6) ? 16 : 12, borderRadius: 3, background: i < Math.min(tableCols, 6) ? "var(--accent)" : "var(--border)" }} />
                    ))}
                  </div>
                  <button className="btn btn-primary" style={{ fontSize: 13, width: "100%" }} onClick={insertTable}>
                    Insert {tableCols}×{tableRows} Table
                  </button>
                </div>

                {/* Quick table templates */}
                {[
                  { label: "Key Terms Table", icon: "📖", rows: 4, cols: 2, header: ["Term", "Definition"] },
                  { label: "Comparison Table", icon: "⚖️", rows: 4, cols: 3, header: ["Item", "Option A", "Option B"] },
                  { label: "Schedule Table", icon: "📅", rows: 5, cols: 3, header: ["Time", "Activity", "Notes"] },
                  { label: "Data Table", icon: "📈", rows: 5, cols: 4, header: ["Name", "Value", "Unit", "Notes"] },
                ].map((t, i) => (
                  <div key={i} className="tiptap-insert-card" style={{ cursor: "pointer" }}
                    onClick={() => {
                      editor.chain().focus().insertTable({ rows: t.rows, cols: t.cols, withHeaderRow: true }).run()
                      setShowInsert(false)
                    }}>
                    <div className="tiptap-insert-card-icon">{t.icon}</div>
                    <div className="tiptap-insert-card-label">{t.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.cols} cols × {t.rows} rows</div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
                      {t.header.map((h, j) => (
                        <span key={j} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--chip)", color: "var(--accent)" }}>{h}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TEMPLATE TAB */}
          {insertTab === "template" && (
            <div className="tiptap-insert-content">
              <div className="tiptap-insert-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                {[
                  {
                    icon: "🎯", label: "Learning Objectives",
                    content: `<h2>Learning Objectives</h2><p>By the end of this lesson, students will be able to:</p><ul><li>Objective 1</li><li>Objective 2</li><li>Objective 3</li></ul>`
                  },
                  {
                    icon: "❓", label: "Review Questions",
                    content: `<h2>Review Questions</h2><ol><li>Question one?</li><li>Question two?</li><li>Question three?</li></ol>`
                  },
                  {
                    icon: "📌", label: "Summary Section",
                    content: `<h2>Summary</h2><p>In this lesson we covered:</p><ul><li>Key point 1</li><li>Key point 2</li><li>Key point 3</li></ul>`
                  },
                  {
                    icon: "💡", label: "Tip/Note Box",
                    content: `<blockquote><p>💡 <strong>Note:</strong> Add your important note or tip here.</p></blockquote>`
                  },
                  {
                    icon: "⚠️", label: "Warning Box",
                    content: `<blockquote><p>⚠️ <strong>Important:</strong> Add your warning or caution here.</p></blockquote>`
                  },
                  {
                    icon: "🧪", label: "Example Block",
                    content: `<h3>Example</h3><p><strong>Problem:</strong> State the problem here.</p><p><strong>Solution:</strong> Show the solution step by step.</p><p><strong>Answer:</strong> Final answer.</p>`
                  },
                  {
                    icon: "🔑", label: "Key Terms Table",
                    content: `<h2>Key Terms</h2>`
                  },
                  {
                    icon: "📊", label: "Comparison",
                    content: `<h2>Comparison</h2>`
                  },
                  {
                    icon: "📖", label: "Full Lesson Template",
                    content: `<h2>Introduction</h2><p>Brief introduction to the topic.</p><h2>Learning Objectives</h2><ul><li>Students will understand...</li><li>Students will be able to...</li></ul><h2>Key Concepts</h2><h3>Concept 1</h3><p>Explanation here.</p><h3>Concept 2</h3><p>Explanation here.</p><h2>Examples</h2><h3>Example 1</h3><p><strong>Problem:</strong> ...</p><p><strong>Solution:</strong> ...</p><h2>Summary</h2><p>Key takeaways from this lesson.</p><h2>Review Questions</h2><ol><li>Question one?</li><li>Question two?</li><li>Question three?</li></ol>`
                  },
                  {
                    icon: "🔬", label: "Lab Report",
                    content: `<h2>Aim</h2><p>State the aim of the experiment.</p><h2>Materials</h2><ul><li>Material 1</li><li>Material 2</li></ul><h2>Method</h2><ol><li>Step 1</li><li>Step 2</li></ol><h2>Results</h2><p>Record your results here.</p><h2>Discussion</h2><p>Analyse your results.</p><h2>Conclusion</h2><p>State your conclusion.</p>`
                  },
                  {
                    icon: "📐", label: "Math Problem Set",
                    content: `<h2>Problem Set</h2><p><strong>Question 1:</strong></p><p>State the problem...</p><p><strong>Solution:</strong></p><p>Working out...</p><p><strong>Answer:</strong> </p><hr/><p><strong>Question 2:</strong></p><p>State the problem...</p>`
                  },
                  {
                    icon: "🌍", label: "Case Study",
                    content: `<h2>Case Study</h2><h3>Background</h3><p>Provide background information.</p><h3>The Problem</h3><p>Describe the problem or situation.</p><h3>Analysis</h3><p>Analyse the situation.</p><h3>Solution</h3><p>Describe the solution.</p><h3>Lessons Learned</h3><ul><li>Lesson 1</li><li>Lesson 2</li></ul>`
                  },
                ].map((t, i) => (
                  <div key={i} className="tiptap-insert-card" style={{ cursor: "pointer" }}
                    onClick={() => {
                      if (t.label.includes("Key Terms")) {
                        editor.chain().focus()
                          .insertContent(t.content)
                          .insertTable({ rows: 4, cols: 2, withHeaderRow: true })
                          .run()
                      } else if (t.label === "Comparison") {
                        editor.chain().focus()
                          .insertContent(t.content)
                          .insertTable({ rows: 4, cols: 3, withHeaderRow: true })
                          .run()
                      } else {
                        editor.chain().focus().insertContent(t.content).run()
                      }
                      setShowInsert(false)
                    }}>
                    <div className="tiptap-insert-card-icon">{t.icon}</div>
                    <div className="tiptap-insert-card-label">{t.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CODE TAB */}
          {insertTab === "code" && (
            <div className="tiptap-insert-content">
              <div className="tiptap-insert-grid">
                {[
                  { icon: "JS", label: "JavaScript", lang: "javascript" },
                  { icon: "PY", label: "Python", lang: "python" },
                  { icon: "HTML", label: "HTML", lang: "html" },
                  { icon: "CSS", label: "CSS", lang: "css" },
                  { icon: "SQL", label: "SQL", lang: "sql" },
                  { icon: "{}",  label: "JSON", lang: "json" },
                  { icon: "SH",  label: "Shell/Bash", lang: "bash" },
                  { icon: "C++", label: "C++", lang: "cpp" },
                  { icon: "JAVA", label: "Java", lang: "java" },
                  { icon: "</>", label: "Generic Code", lang: "plaintext" },
                ].map((t, i) => (
                  <div key={i} className="tiptap-insert-card" style={{ cursor: "pointer" }}
                    onClick={() => {
                      editor.chain().focus().setCodeBlock({ language: t.lang }).run()
                      setShowInsert(false)
                    }}>
                    <div className="tiptap-insert-card-icon" style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 900 }}>{t.icon}</div>
                    <div className="tiptap-insert-card-label">{t.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BUBBLE MENU (selection toolbar) ── */}
      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div className="tiptap-bubble-menu">
          <button type="button" className={`tiptap-bubble-btn ${isActive("bold") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
          <button type="button" className={`tiptap-bubble-btn ${isActive("italic") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
          <button type="button" className={`tiptap-bubble-btn ${isActive("underline") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></button>
          <button type="button" className={`tiptap-bubble-btn ${isActive("highlight") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}>✦</button>
          <button type="button" className={`tiptap-bubble-btn ${isActive("strike") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></button>
          <div className="tiptap-bubble-divider" />
          <button type="button" className={`tiptap-bubble-btn ${isActive("link") ? "active" : ""}`} onClick={() => { const url = prompt("URL:"); if (url) editor.chain().focus().setLink({ href: url }).run() }}>🔗</button>
          <button type="button" className="tiptap-bubble-btn" onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run() }}>H2</button>
          <button type="button" className="tiptap-bubble-btn" onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</button>
        </div>
      </BubbleMenu>

      {/* ── EDITOR CONTENT ── */}
      <EditorContent editor={editor} style={{ minHeight }} />

      {/* ── FOOTER ── */}
      <div className="tiptap-footer">
        <span>Ctrl+Z undo · Ctrl+B bold · Ctrl+I italic · Select text for quick format</span>
        <span>{wordCount} words · ~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
      </div>
    </div>
  )
}