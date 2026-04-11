import SubjectRow from "./SubjectRow"
import type { Subject } from "../types/subject.types"

type Props = {
  subjects: Subject[]
  onEdit: (subject: Subject) => void
  onDelete: (id: number) => Promise<void>
}

/*
-----------------------------------------
SUBJECT TABLE
Displays subjects in a structured table
-----------------------------------------
*/

export default function SubjectTable({
  subjects,
  onEdit,
  onDelete
}: Props) {

  /*
  -----------------------------------------
  EMPTY STATE
  -----------------------------------------
  */

  if (!subjects || subjects.length === 0) {

    return (
      <div className="card page-empty">
        No subjects created yet.
      </div>
    )

  }

  /*
  -----------------------------------------
  TABLE
  -----------------------------------------
  */

  return (

    <div className="card subject-table-card">

      <table className="subject-table">

        <thead>

          <tr>

            <th scope="col">Name</th>

            <th scope="col">Code</th>

            <th scope="col">Description</th>

            <th scope="col" className="subject-actions-col">
              Actions
            </th>

          </tr>

        </thead>

        <tbody>

          {subjects.map((subject) => (

            <SubjectRow
              key={subject.id}
              subject={subject}
              onEdit={onEdit}
              onDelete={onDelete}
            />

          ))}

        </tbody>

      </table>

    </div>

  )

}