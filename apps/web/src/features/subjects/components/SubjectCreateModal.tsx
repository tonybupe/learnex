import SubjectForm from "./SubjectForm"

import { useCreateSubject } from "../hooks/useCreateSubject"
import { useUpdateSubject } from "../hooks/useSubjectUpdate"

import type { Subject } from "../types/subject.types"

type Props = {
  subject?: Subject | null
  onCreated: () => void
  onCancel?: () => void
}

export default function SubjectCreateModal({
  subject,
  onCreated,
  onCancel
}: Props) {

  const { createSubject } = useCreateSubject()
  const { updateSubject } = useUpdateSubject()

  const isEditing = !!subject

  async function handleSubmit(data: any) {

    if (isEditing && subject) {

      await updateSubject(subject.id, data)

    } else {

      await createSubject(data)

    }

    onCreated()

  }

  return (

    <div className="card">

      <div className="card-title">
        {isEditing ? "Edit Subject" : "Create Subject"}
      </div>

      <SubjectForm
        initialData={subject}
        onSubmit={handleSubmit}
      />

      {isEditing && onCancel && (
        <button
          className="btn"
          onClick={onCancel}
        >
          Cancel Edit
        </button>
      )}

    </div>

  )

}