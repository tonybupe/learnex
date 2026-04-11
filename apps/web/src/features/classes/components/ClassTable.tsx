import ClassRow from "./ClassRow"

import type { Class } from "../types/class.types"

type Props = {
  classes: Class[]
  onEdit: (c: Class) => void
  onDelete: (id: number) => Promise<void>
}

export default function ClassTable({
  classes,
  onEdit,
  onDelete
}: Props) {

  if (!classes.length) {

    return (
      <div className="card page-empty">
        No classes available.
      </div>
    )

  }

  return (

    <div className="card class-table-card">

      <table className="class-table">

        <thead>

          <tr>

            <th>Name</th>
            <th>Code</th>
            <th>Description</th>
            <th>Actions</th>

          </tr>

        </thead>

        <tbody>

          {classes.map((c) => (

            <ClassRow
              key={c.id}
              classItem={c}
              onEdit={onEdit}
              onDelete={onDelete}
            />

          ))}

        </tbody>

      </table>

    </div>

  )

}