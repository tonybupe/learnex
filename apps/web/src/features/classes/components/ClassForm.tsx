import { useState, useEffect } from "react"

import type { Class } from "../types/class.types"
import { useSubjects } from "@/features/subjects/hooks/useSubjects"

type Props = {
  initial?: Partial<Class>
  onSubmit: (data: Partial<Class>) => Promise<void>
  onCancel: () => void
}

export default function ClassForm({
  initial,
  onSubmit,
  onCancel
}: Props) {

  const { subjects, loading: subjectsLoading } = useSubjects()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [classCode, setClassCode] = useState("")
  const [gradeLevel, setGradeLevel] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("public")
  const [subjectId, setSubjectId] = useState<number | "">("")

  const [saving, setSaving] = useState(false)

  useEffect(() => {

    if (initial) {

      setTitle(initial.title ?? "")
      setDescription(initial.description ?? "")
      setClassCode(initial.class_code ?? "")
      setGradeLevel(initial.grade_level ?? "")
      setVisibility(initial.visibility ?? "public")
      setSubjectId(initial.subject_id ?? "")

    }

  }, [initial])

  async function handleSubmit(e: React.FormEvent) {

    e.preventDefault()

    if (!subjectId) {

      alert("Please select a subject")

      return

    }

    try {

      setSaving(true)

      await onSubmit({

        title,
        description,
        class_code: classCode,
        grade_level: gradeLevel,
        visibility,
        subject_id: Number(subjectId)

      })

    } finally {

      setSaving(false)

    }

  }

  return (

    <form className="class-form" onSubmit={handleSubmit}>

      {/* CLASS TITLE */}

      <div className="form-group">

        <label>Class Title</label>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g ICT Class"
          required
        />

      </div>

      {/* CLASS CODE */}

      <div className="form-group">

        <label>Class Code</label>

        <input
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          placeholder="e.g ICT-F1"
          required
        />

      </div>

      {/* GRADE LEVEL */}

      <div className="form-group">

        <label>Grade Level</label>

        <input
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
          placeholder="e.g FORM 1"
          required
        />

      </div>

      {/* VISIBILITY */}

      <div className="form-group">

        <label>Visibility</label>

        <select
          value={visibility}
          onChange={(e) =>
            setVisibility(e.target.value as "public" | "private")
          }
        >

          <option value="public">
            Public
          </option>

          <option value="private">
            Private
          </option>

        </select>

      </div>

      {/* SUBJECT DROPDOWN */}

      <div className="form-group">

        <label>Subject</label>

        <select
          value={subjectId}
          onChange={(e) =>
            setSubjectId(Number(e.target.value))
          }
          disabled={subjectsLoading}
          required
        >

          <option value="">
            {subjectsLoading ? "Loading subjects..." : "Select subject"}
          </option>

          {subjects.map((subject) => (

            <option
              key={subject.id}
              value={subject.id}
            >

              {subject.name} ({subject.code})

            </option>

          ))}

        </select>

      </div>

      {/* DESCRIPTION */}

      <div className="form-group">

        <label>Description</label>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />

      </div>

      {/* ACTIONS */}

      <div className="form-actions">

        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="btn-primary"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Class"}
        </button>

      </div>

    </form>

  )

}
