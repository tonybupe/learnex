import { useEffect, useState } from "react"

import type { Subject, SubjectCreate } from "../types/subject.types"

type Props = {
  initialData?: Subject | null
  onSubmit: (data: SubjectCreate) => Promise<void>
}

export default function SubjectForm({ initialData, onSubmit }: Props) {

  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")

  const [loading, setLoading] = useState(false)

  const isEditing = Boolean(initialData)


  // ---------- LOAD SUBJECT INTO FORM WHEN EDITING ----------
  useEffect(() => {

    if (initialData) {

      setName(initialData.name ?? "")
      setCode(initialData.code ?? "")
      setDescription(initialData.description ?? "")

    } else {

      // Reset form if switching from edit ÔåÆ create
      setName("")
      setCode("")
      setDescription("")

    }

  }, [initialData])


  // ---------- SUBMIT HANDLER ----------
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {

    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedCode = code.trim()

    if (!trimmedName || !trimmedCode) return

    try {

      setLoading(true)

      await onSubmit({
        name: trimmedName,
        code: trimmedCode,
        description: description.trim()
      })

      // Reset only when creating
      if (!isEditing) {

        setName("")
        setCode("")
        setDescription("")

      }

    } finally {

      setLoading(false)

    }

  }


  return (

    <form
      onSubmit={handleSubmit}
      className="subject-form"
    >

      <input
        placeholder="Subject name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="audit-control"
        required
      />

      <input
        placeholder="Subject code (e.g. CSC101)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="audit-control"
        required
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="audit-control"
      />

      <button
        type="submit"
        className="btn"
        disabled={loading}
      >
        {loading
          ? (isEditing ? "Updating..." : "Creating...")
          : (isEditing ? "Update Subject" : "Create Subject")}
      </button>

    </form>

  )

}
