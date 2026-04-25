import { useEditor, EditorContent } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table"
import { Image } from "@tiptap/extension-image"
import { Link } from "@tiptap/extension-link"
import { Placeholder } from "@tiptap/extension-placeholder"
import { Underline } from "@tiptap/extension-underline"
import { Highlight } from "@tiptap/extension-highlight"
import { TextAlign } from "@tiptap/extension-text-align"
import { Color } from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import { useCallback, useEffect, useRef, useState } from "react"
import "./RichEditor.css"

const lowlight = createLowlight(common)

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
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "> $1")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "$1")
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "$1")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n").trim()
}

type Props = {
  value: string
  onChange: (markdown: string, html?: string) => void
  placeholder?: string
  minHeight?: number
}

type InsertTab = "media" | "table" | "template" | "code"

// ── Image Toolbar (shows when image selected) ──
function ImageToolbar({ editor }: { editor: any }) {
  const [visible, setVisible] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editor) return
    const update = () => {
      if (!editor.isActive("image")) { setVisible(false); return }
      const { from } = editor.state.selection
      const node = editor.view.nodeDOM(from) as HTMLElement | null
      if (!node) { setVisible(false); return }
      const imgEl = node.tagName === "IMG" ? node as HTMLImageElement : node.querySelector("img") as HTMLImageElement | null
      if (!imgEl) { setVisible(false); return }
      const editorEl = editor.view.dom.closest(".tiptap-editor-wrap") as HTMLElement | null
      if (!editorEl) { setVisible(false); return }
      const imgRect = imgEl.getBoundingClientRect()
      const edRect = editorEl.getBoundingClientRect()
      setStyle({
        top: imgRect.top - edRect.top - 42,
        left: imgRect.left - edRect.left + imgRect.width / 2,
        transform: "translateX(-50%)",
        position: "absolute",
      })
      setVisible(true)
    }
    editor.on("selectionUpdate", update)
    editor.on("transaction", update)
    return () => { editor.off("selectionUpdate", update); editor.off("transaction", update) }
  }, [editor])

  const updateAttr = (attrs: Record<string, string>) => {
    editor.chain().focus().updateAttributes("image", attrs).run()
  }

  if (!visible || !editor) return null

  return (
    <div ref={toolbarRef} className="image-toolbar" style={style}>
      {/* Size */}
      <button type="button" onClick={() => updateAttr({ width: "200px" })} title="Small (200px)">S</button>
      <button type="button" onClick={() => updateAttr({ width: "400px" })} title="Medium (400px)">M</button>
      <button type="button" onClick={() => updateAttr({ width: "600px" })} title="Large (600px)">L</button>
      <button type="button" onClick={() => updateAttr({ width: "100%" })} title="Full width">Full</button>
      <div style={{ width: 1, background: "var(--border)", margin: "2px 4px" }} />
      {/* Align */}
      <button type="button" onClick={() => updateAttr({ style: "display:block;margin:10px 0;float:left" })} title="Left">ÔåÉ</button>
      <button type="button" onClick={() => updateAttr({ style: "display:block;margin:10px auto" })} title="Center">Ôåö</button>
      <button type="button" onClick={() => updateAttr({ style: "display:block;margin:10px 0;float:right" })} title="Right">ÔåÆ</button>
      <div style={{ width: 1, background: "var(--border)", margin: "2px 4px" }} />
      {/* Alt */}
      <button type="button" title="Edit caption/alt" onClick={() => {
        const cur = editor.getAttributes("image").alt ?? ""
        const alt = prompt("Image caption / alt text:", cur)
        if (alt !== null) updateAttr({ alt })
      }}>Alt</button>
      {/* Delete */}
      <button type="button" title="Remove image"
        onClick={() => editor.chain().focus().deleteSelection().run()}
        style={{ color: "var(--danger)" }}>­ƒùæ</button>
    </div>
  )
}

export default function RichEditor({ value, onChange, placeholder = "Start writing...", minHeight = 320 }: Props) {
  const [showInsert, setShowInsert] = useState(false)
  const [insertTab, setInsertTab] = useState<InsertTab>("media")
  const [imageUrl, setImageUrl] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("")
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const [wordCount, setWordCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Track last externally set value to detect AI-injected content
  const lastExternalValue = useRef(value)
  const isUpdatingFromExternal = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ HTMLAttributes: { class: "editor-image" } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: value
      ? value.includes("<")
        ? value
        : value.split("\n").map(line => {
            if (!line.trim()) return "<p></p>"
            return `<p>${line}</p>`
          }).join("")
      : "",
    onUpdate: ({ editor }) => {
      if (isUpdatingFromExternal.current) return
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

  // When value changes externally (AI generation), update editor content
  useEffect(() => {
    if (!editor || !value) return
    // Only update if value changed significantly from outside (AI inject)
    if (value !== lastExternalValue.current && Math.abs(value.length - lastExternalValue.current.length) > 20) {
      lastExternalValue.current = value
      isUpdatingFromExternal.current = true
      const html = value.includes("<")
        ? value
        : value.split("\n").map(line => {
            if (!line.trim()) return "<p></p>"
            return `<p>${line}</p>`
          }).join("")
      editor.commands.setContent(html)
      setTimeout(() => { isUpdatingFromExternal.current = false }, 100)
    }
  }, [value, editor])

  const isActive = (name: string, attrs?: any) => editor?.isActive(name, attrs) ?? false

  const insertImage = useCallback((url: string, alt = "image") => {
    if (!editor || !url.trim()) return
    // Insert image with caption paragraph below
    editor.chain().focus()
      .setImage({ src: url.trim(), alt })
      .run()
    setImageUrl("")
  }, [editor])

  const insertImageFile = useCallback(async (file: File) => {
    // Upload to server
    const formData = new FormData()
    formData.append("file", file)
    try {
      // Try server upload first
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL?.replace("/api/v1","") || "http://localhost:8000"}/api/v1/uploads/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("learnex_access_token") ?? ""}` },
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        const src = data.url?.startsWith("http") ? data.url : `${import.meta.env.VITE_API_BASE_URL?.replace("/api/v1","") || "http://localhost:8000"}${data.url}`
        editor?.chain().focus().setImage({ src, alt: file.name }).run()
        return
      }
    } catch {}
    // Fallback: use object URL (temporary, session only)
    const src = URL.createObjectURL(file)
    editor?.chain().focus().setImage({ src, alt: file.name }).run()
  }, [editor])

  const insertLink = useCallback(() => {
    if (!editor || !linkUrl.trim()) return
    editor.chain().focus()
      .insertContent(`<a href="${linkUrl}">${linkText || linkUrl}</a>`)
      .run()
    setLinkUrl(""); setLinkText("")
  }, [editor, linkUrl, linkText])

  const insertTable = useCallback(() => {
    editor?.chain().focus()
      .insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true })
      .run()
    setShowInsert(false)
  }, [editor, tableRows, tableCols])

  if (!editor) return <div className="tiptap-loading">Loading editor...</div>

  const Btn = ({ onClick, active, title, children, danger }: {
    onClick: () => void; active?: boolean; title?: string
    children: React.ReactNode; danger?: boolean
  }) => (
    <button type="button" onClick={onClick} title={title}
      className={`tiptap-tool-btn${active ? " is-active" : ""}${danger ? " is-danger" : ""}`}>
      {children}
    </button>
  )

  const TEMPLATES = [
    { icon: "­ƒÄ»", label: "Learning Objectives", content: `<h2>Learning Objectives</h2><p>By the end of this lesson, students will be able to:</p><ul><li>Objective 1</li><li>Objective 2</li><li>Objective 3</li></ul>` },
    { icon: "ÔØô", label: "Review Questions", content: `<h2>Review Questions</h2><ol><li>Question one?</li><li>Question two?</li><li>Question three?</li></ol>` },
    { icon: "­ƒôî", label: "Summary", content: `<h2>Summary</h2><p>In this lesson we covered:</p><ul><li>Key point 1</li><li>Key point 2</li><li>Key point 3</li></ul>` },
    { icon: "­ƒÆí", label: "Tip Box", content: `<blockquote><p>­ƒÆí <strong>Note:</strong> Add your important note here.</p></blockquote>` },
    { icon: "ÔÜá´©Å", label: "Warning Box", content: `<blockquote><p>ÔÜá´©Å <strong>Important:</strong> Add your warning here.</p></blockquote>` },
    { icon: "­ƒº¬", label: "Example Block", content: `<h3>Example</h3><p><strong>Problem:</strong> State the problem.</p><p><strong>Solution:</strong> Show working out.</p><p><strong>Answer:</strong> Final answer.</p>` },
    { icon: "­ƒö¼", label: "Lab Report", content: `<h2>Aim</h2><p>State aim.</p><h2>Materials</h2><ul><li>Material 1</li></ul><h2>Method</h2><ol><li>Step 1</li></ol><h2>Results</h2><p>Results here.</p><h2>Conclusion</h2><p>Conclusion here.</p>` },
    { icon: "­ƒôû", label: "Full Lesson", content: `<h2>Introduction</h2><p>Brief introduction.</p><h2>Learning Objectives</h2><ul><li>Objective 1</li><li>Objective 2</li></ul><h2>Key Concepts</h2><h3>Concept 1</h3><p>Explanation here.</p><h2>Examples</h2><p><strong>Example:</strong> Description.</p><h2>Summary</h2><p>Key takeaways.</p><h2>Review Questions</h2><ol><li>Question 1?</li><li>Question 2?</li></ol>` },
    { icon: "­ƒôÉ", label: "Math Problem Set", content: `<h2>Problem Set</h2><p><strong>Question 1:</strong></p><p>Problem...</p><p><strong>Solution:</strong></p><p>Working...</p><p><strong>Answer:</strong></p>` },
    { icon: "­ƒîì", label: "Case Study", content: `<h2>Case Study</h2><h3>Background</h3><p>Background info.</p><h3>Problem</h3><p>The problem.</p><h3>Analysis</h3><p>Analysis.</p><h3>Conclusion</h3><p>Lessons learned.</p>` },
  ]

  const QUICK_TABLES = [
    { label: "Key Terms", icon: "­ƒôû", rows: 4, cols: 2 },
    { label: "Comparison", icon: "ÔÜû´©Å", rows: 4, cols: 3 },
    { label: "Schedule", icon: "­ƒôà", rows: 5, cols: 3 },
    { label: "Data Table", icon: "­ƒôê", rows: 5, cols: 4 },
  ]

  const CODE_LANGS = [
    { icon: "JS", label: "JavaScript", lang: "javascript" },
    { icon: "PY", label: "Python", lang: "python" },
    { icon: "HTML", label: "HTML", lang: "html" },
    { icon: "CSS", label: "CSS", lang: "css" },
    { icon: "SQL", label: "SQL", lang: "sql" },
    { icon: "{}", label: "JSON", lang: "json" },
    { icon: "SH", label: "Bash", lang: "bash" },
    { icon: "</>", label: "Generic", lang: "plaintext" },
  ]

  return (
    <div className="tiptap-wrapper">
      {/* ── TOOLBAR ── */}
      <div className="tiptap-toolbar">
        {/* History */}
        <div className="tiptap-tool-group">
          <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">Ôå®</Btn>
          <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)">Ôå¬</Btn>
        </div>
        <div className="tiptap-divider" />

        {/* Headings */}
        <div className="tiptap-tool-group">
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={isActive("heading", { level: 1 })} title="Heading 1">H1</Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={isActive("heading", { level: 2 })} title="Heading 2">H2</Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={isActive("heading", { level: 3 })} title="Heading 3">H3</Btn>
          <Btn onClick={() => editor.chain().focus().setParagraph().run()} active={isActive("paragraph")} title="Normal">┬Â</Btn>
        </div>
        <div className="tiptap-divider" />

        {/* Text */}
        <div className="tiptap-tool-group">
          <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={isActive("bold")} title="Bold"><strong>B</strong></Btn>
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={isActive("italic")} title="Italic"><em>I</em></Btn>
          <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={isActive("underline")} title="Underline"><u>U</u></Btn>
          <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={isActive("strike")} title="Strikethrough"><s>S</s></Btn>
          <Btn onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()} active={isActive("highlight")} title="Highlight">Ô£ª</Btn>
          <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={isActive("code")} title="Code">`</Btn>
        </div>
        <div className="tiptap-divider" />

        {/* Align */}
        <div className="tiptap-tool-group">
          <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={isActive("left")} title="Left">Ô¼£</Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={isActive("center")} title="Center">Ô¼ø</Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={isActive("right")} title="Right">Ô¼£</Btn>
        </div>
        <div className="tiptap-divider" />

        {/* Lists */}
        <div className="tiptap-tool-group">
          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={isActive("bulletList")} title="Bullet list">ÔÇó ÔÇö</Btn>
          <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={isActive("orderedList")} title="Numbered list">1.</Btn>
          <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={isActive("blockquote")} title="Quote">ÔØØ</Btn>
          <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">ÔÇö</Btn>
        </div>

        {/* Table controls */}
        {isActive("table") && (
          <>
            <div className="tiptap-divider" />
            <div className="tiptap-tool-group">
              <Btn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add col before">+ÔåÉ</Btn>
              <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add col after">+ÔåÆ</Btn>
              <Btn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete col" danger>├ùC</Btn>
              <Btn onClick={() => editor.chain().focus().addRowBefore().run()} title="Add row before">+Ôåæ</Btn>
              <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row after">+Ôåô</Btn>
              <Btn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete row" danger>├ùR</Btn>
              <Btn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete table" danger>├ùTbl</Btn>
              <Btn onClick={() => editor.chain().focus().mergeCells().run()} title="Merge">Ôè×</Btn>
              <Btn onClick={() => editor.chain().focus().splitCell().run()} title="Split">Ôèƒ</Btn>
            </div>
          </>
        )}

        {/* Insert button */}
        <button type="button"
          className={`tiptap-insert-btn${showInsert ? " active" : ""}`}
          onClick={() => setShowInsert(s => !s)}>
          Ô×ò Insert
        </button>
      </div>

      {/* ── INSERT PANEL ── */}
      {showInsert && (
        <div className="tiptap-insert-panel">
          <div className="tiptap-insert-tabs">
            {(["media","table","template","code"] as InsertTab[]).map(t => (
              <button key={t} type="button"
                className={`tiptap-insert-tab${insertTab === t ? " active" : ""}`}
                onClick={() => setInsertTab(t)}>
                {t === "media" ? "­ƒû╝´©Å Media" : t === "table" ? "­ƒôè Table" : t === "template" ? "­ƒôØ Templates" : "­ƒÆ╗ Code"}
              </button>
            ))}
            <button type="button" className="tiptap-insert-close" onClick={() => setShowInsert(false)}>Ô£ò</button>
          </div>

          <div className="tiptap-insert-content">
            {/* MEDIA */}
            {insertTab === "media" && (
              <div className="tiptap-insert-grid">
                <div className="tiptap-insert-card">
                  <div className="tiptap-insert-card-icon">­ƒû╝´©Å</div>
                  <div className="tiptap-insert-card-label">Image from URL</div>
                  <input className="audit-control" value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    style={{ fontSize: 12, height: 36 }}
                    onKeyDown={e => { if (e.key === "Enter") { insertImage(imageUrl); setShowInsert(false) } }} />
                  <button className="btn btn-primary" style={{ fontSize: 12, width: "100%" }}
                    onClick={() => { insertImage(imageUrl); setShowInsert(false) }}>Insert Image</button>
                </div>

                <div className="tiptap-insert-card" style={{ cursor: "pointer" }} onClick={() => fileInputRef.current?.click()}>
                  <div className="tiptap-insert-card-icon">­ƒôñ</div>
                  <div className="tiptap-insert-card-label">Upload Image</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>Click to browse files</div>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) { insertImageFile(f); setShowInsert(false) } e.target.value = "" }} />
                  <button className="btn" style={{ fontSize: 12, width: "100%" }}>Browse</button>
                </div>

                <div className="tiptap-insert-card">
                  <div className="tiptap-insert-card-icon">­ƒÄÑ</div>
                  <div className="tiptap-insert-card-label">YouTube Link</div>
                  <input className="audit-control" placeholder="https://youtube.com/watch?v=..."
                    style={{ fontSize: 12, height: 36 }}
                    onKeyDown={e => {
                      if (e.key !== "Enter") return
                      const url = (e.target as HTMLInputElement).value
                      editor.chain().focus().insertContent(`<p><a href="${url}">ÔûÂ Watch Video: ${url}</a></p>`).run()
                      ;(e.target as HTMLInputElement).value = ""
                      setShowInsert(false)
                    }} />
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Press Enter to insert</div>
                </div>

                <div className="tiptap-insert-card">
                  <div className="tiptap-insert-card-icon">­ƒöù</div>
                  <div className="tiptap-insert-card-label">Hyperlink</div>
                  <input className="audit-control" value={linkText} onChange={e => setLinkText(e.target.value)}
                    placeholder="Link text" style={{ fontSize: 12, height: 36, marginBottom: 6 }} />
                  <input className="audit-control" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://example.com" style={{ fontSize: 12, height: 36 }} />
                  <button className="btn btn-primary" style={{ fontSize: 12, width: "100%" }}
                    onClick={() => { insertLink(); setShowInsert(false) }}>Insert Link</button>
                </div>
              </div>
            )}

            {/* TABLE */}
            {insertTab === "table" && (
              <div className="tiptap-insert-grid">
                <div className="tiptap-insert-card" style={{ gridColumn: "span 2" }}>
                  <div className="tiptap-insert-card-icon">­ƒôè</div>
                  <div className="tiptap-insert-card-label">Custom Table Size</div>
                  <div style={{ display: "flex", gap: 20, justifyContent: "center", alignItems: "center", margin: "8px 0" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>Columns</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button type="button" className="btn" style={{ width: 30, height: 30, padding: 0 }} onClick={() => setTableCols(c => Math.max(1, c-1))}>ÔêÆ</button>
                        <span style={{ fontWeight: 900, fontSize: 22, minWidth: 32, textAlign: "center" }}>{tableCols}</span>
                        <button type="button" className="btn" style={{ width: 30, height: 30, padding: 0 }} onClick={() => setTableCols(c => Math.min(10, c+1))}>+</button>
                      </div>
                    </div>
                    <span style={{ fontSize: 24, color: "var(--muted)" }}>├ù</span>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>Rows</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button type="button" className="btn" style={{ width: 30, height: 30, padding: 0 }} onClick={() => setTableRows(r => Math.max(1, r-1))}>ÔêÆ</button>
                        <span style={{ fontWeight: 900, fontSize: 22, minWidth: 32, textAlign: "center" }}>{tableRows}</span>
                        <button type="button" className="btn" style={{ width: 30, height: 30, padding: 0 }} onClick={() => setTableRows(r => Math.min(20, r+1))}>+</button>
                      </div>
                    </div>
                  </div>
                  {/* Grid preview */}
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(tableCols, 6)}, 1fr)`, gap: 3, margin: "8px auto", maxWidth: 200 }}>
                    {Array.from({ length: Math.min(tableRows, 5) * Math.min(tableCols, 6) }).map((_, i) => (
                      <div key={i} style={{ height: i < Math.min(tableCols, 6) ? 14 : 10, borderRadius: 3, background: i < Math.min(tableCols, 6) ? "var(--accent)" : "var(--border)" }} />
                    ))}
                  </div>
                  <button className="btn btn-primary" style={{ fontSize: 13, width: "100%" }} onClick={insertTable}>
                    Insert {tableCols}├ù{tableRows} Table
                  </button>
                </div>

                {QUICK_TABLES.map((t, i) => (
                  <div key={i} className="tiptap-insert-card" style={{ cursor: "pointer" }}
                    onClick={() => { editor.chain().focus().insertTable({ rows: t.rows, cols: t.cols, withHeaderRow: true }).run(); setShowInsert(false) }}>
                    <div className="tiptap-insert-card-icon">{t.icon}</div>
                    <div className="tiptap-insert-card-label">{t.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.cols} cols ├ù {t.rows} rows</div>
                  </div>
                ))}
              </div>
            )}

            {/* TEMPLATES */}
            {insertTab === "template" && (
              <div className="tiptap-insert-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
                {TEMPLATES.map((t, i) => (
                  <div key={i} className="tiptap-insert-card" style={{ cursor: "pointer" }}
                    onClick={() => { editor.chain().focus().insertContent(t.content).run(); setShowInsert(false) }}>
                    <div className="tiptap-insert-card-icon">{t.icon}</div>
                    <div className="tiptap-insert-card-label">{t.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* CODE */}
            {insertTab === "code" && (
              <div className="tiptap-insert-grid">
                {CODE_LANGS.map((t, i) => (
                  <div key={i} className="tiptap-insert-card" style={{ cursor: "pointer" }}
                    onClick={() => { editor.chain().focus().setCodeBlock({ language: t.lang }).run(); setShowInsert(false) }}>
                    <div className="tiptap-insert-card-icon" style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 18 }}>{t.icon}</div>
                    <div className="tiptap-insert-card-label">{t.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDITOR ── */}
      <div className="tiptap-editor-wrap" style={{ position: "relative" }}>
        <EditorContent editor={editor} style={{ minHeight }} />
        <ImageToolbar editor={editor} />
      </div>

      {/* ── FOOTER ── */}
      <div className="tiptap-footer">
        <span>Ctrl+Z undo ┬À Ctrl+B bold ┬À Ctrl+I italic ┬À Select text for quick format</span>
        <span>{wordCount} words ┬À ~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
      </div>
    </div>
  )
}
