import { useState } from "react"
import type { Class } from "../types/class.types"
import ClassViewModal from "./ClassViewModal"

type Props = {
  classItem: Class
  joined: boolean
  processing: boolean
  onJoin: (id: number) => Promise<void>
  onLeave: (id: number) => Promise<void>
}

export default function ClassCard({
  classItem,
  joined,
  processing,
  onJoin,
  onLeave
}: Props) {

  const [message, setMessage] = useState<string | null>(null)
  const [viewOpen, setViewOpen] = useState(false)

  /*
  -----------------------------------------
  MESSAGE HELPER
  -----------------------------------------
  */

  function showMessage(text: string) {

    setMessage(text)

    setTimeout(() => {
      setMessage(null)
    }, 3000)

  }

  /*
  -----------------------------------------
  JOIN CLASS
  -----------------------------------------
  */

  async function handleJoin() {

    if (processing || joined) return

    try {

      await onJoin(classItem.id)

      showMessage("✓ Joined class successfully.")

    } catch (err: any) {

      showMessage(err?.message ?? "Unable to join class.")

    }

  }

  /*
  -----------------------------------------
  LEAVE CLASS
  -----------------------------------------
  */

  async function handleLeave() {

    if (processing || !joined) return


    try {

      await onLeave(classItem.id)

      showMessage("You have left the class.")

    } catch (err: any) {

      showMessage(err?.message ?? "Unable to leave class.")

    }

  }

  /*
  -----------------------------------------
  VIEW CLASS
  -----------------------------------------
  */

  function handleView() {

    setViewOpen(true)

  }

  return (

    <>

      <div className="class-row-card">

        {/* LEFT SECTION */}

        <div className="class-row-left">

          <h3 className="class-title">
            {classItem.title}
          </h3>

          <div className="class-meta-row">
            <span>Code: {classItem.class_code}</span>
            <span>Subject: {classItem.subject?.name ?? "-"}</span>
          </div>

        </div>


        {/* CENTER SECTION */}

        <div className="class-row-middle">

          <span>
            Teacher: {classItem.teacher?.full_name ?? "-"}
          </span>

          <span>
            {classItem.grade_level}
          </span>

        </div>


        {/* RIGHT SECTION */}

        <div className="class-row-actions">

          {joined && (
            <span className="class-badge">
              Joined
            </span>
          )}

          <button
            className="btn-primary"
            disabled={processing || joined}
            onClick={handleJoin}
          >
            {processing ? "Joining..." : joined ? "Joined" : "Join"}
          </button>

          <button
            className="btn-secondary"
            disabled={processing || !joined}
            onClick={handleLeave}
          >
            Leave
          </button>

          <button
            className="btn-secondary"
            disabled={processing || !joined}
            onClick={handleView}
          >
            View
          </button>

        </div>


        {/* FEEDBACK MESSAGE */}

        {message && (

          <p className="class-feedback">
            {message}
          </p>

        )}

      </div>


      {/* CLASS VIEW MODAL */}

      <ClassViewModal
        open={viewOpen}
        classItem={classItem}
        onClose={() => setViewOpen(false)}
      />

    </>

  )

}