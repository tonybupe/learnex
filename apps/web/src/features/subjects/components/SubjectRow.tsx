import { useState, useCallback } from "react"
import { Pencil, Trash2 } from "lucide-react"

import type { Subject } from "../types/subject.types"

type Props = {
  subject: Subject
  onEdit: (subject: Subject) => void
  onDelete: (id: number) => Promise<void>
}

/*
-----------------------------------------
SUBJECT ROW
Represents a single subject in the table
-----------------------------------------
*/

export default function SubjectRow({
  subject,
  onEdit,
  onDelete
}: Props) {

  const [deleting, setDeleting] = useState(false)

  /*
  -----------------------------------------
  DELETE HANDLER
  -----------------------------------------
  */

  const handleDelete = useCallback(async () => {

    const confirmed = window.confirm("Delete this subject?")

    if (!confirmed) return

    try {

      setDeleting(true)

      await onDelete(subject.id)

    } catch (err) {

      console.error("Subject deletion failed:", err)

    } finally {

      setDeleting(false)

    }

  }, [onDelete, subject.id])

  /*
  -----------------------------------------
  RENDER
  -----------------------------------------
  */

  return (

    <tr>

      <td>{subject.name}</td>

      <td className="subject-code">
        {subject.code}
      </td>

      <td>
        {subject.description ?? "-"}
      </td>

      <td className="subject-actions">

        <button
          className="icon-btn"
          onClick={() => onEdit(subject)}
          aria-label="Edit subject"
          title="Edit subject"
        >
          <Pencil size={16} />
        </button>

        <button
          className="icon-btn danger"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete subject"
          title="Delete subject"
        >
          <Trash2 size={16} />
        </button>

      </td>

    </tr>

  )

}