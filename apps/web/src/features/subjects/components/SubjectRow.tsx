import { useState, useCallback } from "react"
import { Pencil, Trash2, Lock } from "lucide-react"
import { useAuthStore } from "@/features/auth/auth.store"
import type { Subject } from "../types/subject.types"

type Props = {
  subject: Subject
  onEdit: (subject: Subject) => void
  onDelete: (id: number) => Promise<void>
}

export default function SubjectRow({ subject, onEdit, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false)
  const user = useAuthStore(s => s.user)

  // RBAC: admin can edit/delete any. Teacher only their own.
  const canModify = user?.role === "admin" ||
    (user?.role === "teacher" && subject.created_by === user?.id)

  const handleDelete = useCallback(async () => {
    if (!canModify) return
    const confirmed = window.confirm(`Delete subject "${subject.name}"? This cannot be undone.`)
    if (!confirmed) return
    try {
      setDeleting(true)
      await onDelete(subject.id)
    } catch (err) {
      console.error("Subject deletion failed:", err)
    } finally {
      setDeleting(false)
    }
  }, [onDelete, subject.id, canModify])

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{subject.name}</div>
        {subject.created_by && user?.role === "admin" && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            Created by user #{subject.created_by}
          </div>
        )}
      </td>
      <td className="subject-code">{subject.code}</td>
      <td style={{ color: subject.description ? "var(--text)" : "var(--muted)", fontSize: 13 }}>
        {subject.description ?? "—"}
      </td>
      <td className="subject-actions">
        {canModify ? (
          <>
            <button className="icon-btn" onClick={() => onEdit(subject)}
              aria-label="Edit subject" title="Edit subject">
              <Pencil size={16} />
            </button>
            <button className="icon-btn danger" onClick={handleDelete}
              disabled={deleting} aria-label="Delete subject" title="Delete subject">
              <Trash2 size={16} />
            </button>
          </>
        ) : (
          <span title="You can only edit subjects you created"
            style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
            <Lock size={13} /> View only
          </span>
        )}
      </td>
    </tr>
  )
}