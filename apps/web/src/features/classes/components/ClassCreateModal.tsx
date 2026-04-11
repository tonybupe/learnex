import { useState, useEffect } from "react"

import ClassForm from "./ClassForm"

import { useCreateClass } from "../hooks/useCreateClass"
import { useUpdateClass } from "../hooks/useUpdateClass"

import type { Class } from "../types/class.types"

type Props = {
  classItem?: Class | null
  onCreated: () => void
  onCancel: () => void
}

export default function ClassCreateModal({
  classItem,
  onCreated,
  onCancel
}: Props) {

  const { createClass } = useCreateClass()
  const { updateClass } = useUpdateClass()

  const [open, setOpen] = useState(false)

  /*
  -----------------------------------------
  OPEN MODAL WHEN EDITING
  -----------------------------------------
  */

  useEffect(() => {

    if (classItem) {
      setOpen(true)
    }

  }, [classItem])

  /*
  -----------------------------------------
  SUBMIT HANDLER
  -----------------------------------------
  */

  async function handleSubmit(data: Partial<Class>) {

    if (classItem) {

      await updateClass(classItem.id, data)

    } else {

      await createClass(data)

    }

    setOpen(false)

    onCreated()

  }

  /*
  -----------------------------------------
  OPEN MODAL (CREATE)
  -----------------------------------------
  */

  function handleOpen() {

    setOpen(true)

  }

  /*
  -----------------------------------------
  CLOSE MODAL
  -----------------------------------------
  */

  function handleClose() {

    setOpen(false)

    onCancel()

  }

  return (

    <>

      {/* CREATE BUTTON */}

      <button
        className="btn-primary"
        onClick={handleOpen}
      >
        Create Class
      </button>

      {/* MODAL */}

      {open && (

        <div className="modal-overlay">

          <div className="modal">

            <h2>
              {classItem
                ? "Edit Class"
                : "Create Class"}
            </h2>

            <ClassForm
              initial={classItem ?? undefined}
              onSubmit={handleSubmit}
              onCancel={handleClose}
            />

          </div>

        </div>

      )}

    </>

  )

}