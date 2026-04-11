import { Pencil, Trash2 } from "lucide-react"
import type { Class } from "../types/class.types"

type Props = {
  classItem: Class
  onEdit: (classItem: Class) => void
  onDelete: (id: number) => Promise<void>
}

export default function ClassRow({
  classItem,
  onEdit,
  onDelete
}: Props) {

  async function handleDelete() {

    if (!confirm("Delete this class?")) return

    await onDelete(classItem.id)

  }

  return (

    <tr>

      {/* NAME */}
      <td>
        {classItem.title}
      </td>

      {/* CODE */}
      <td className="class-code">
        {classItem.class_code}
      </td>

      {/* DESCRIPTION */}
      <td>
        {classItem.description ?? "-"}
      </td>

      {/* ACTIONS */}
      <td className="class-actions">

        <button
          className="icon-btn"
          onClick={() => onEdit(classItem)}
        >
          <Pencil size={16} />
        </button>

        <button
          className="icon-btn danger"
          onClick={handleDelete}
        >
          <Trash2 size={16} />
        </button>

      </td>

    </tr>

  )

}