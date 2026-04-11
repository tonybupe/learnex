import { useState } from "react"
import type { Class } from "../types/class.types"

import ClassOverview from "./modal/ClassOverview"
import ClassMembers from "./modal/ClassMembers"
import ClassLessons from "./modal/ClassLessons"
import ClassQuizzes from "./modal/ClassQuizzes"
import ClassDiscussion from "./modal/ClassDiscussion"

type Props = {
  open: boolean
  classItem: Class | null
  onClose: () => void
}

export default function ClassViewModal({
  open,
  classItem,
  onClose
}: Props) {

  const [tab, setTab] = useState("overview")

  if (!open || !classItem) return null

  return (

    <div className="modal-overlay">

      <div className="modal class-view-modal">

        {/* HEADER */}

        <div className="class-view-header">

          <div>

            <h2>{classItem.title}</h2>

            <p className="class-view-sub">
              {classItem.subject?.name ?? "-"} • {classItem.grade_level}
            </p>

          </div>

          <button
            className="btn-secondary"
            onClick={onClose}
          >
            Close
          </button>

        </div>


        {/* TAB NAVIGATION */}

        <div className="class-tabs">

          <button
            className={tab === "overview" ? "tab active" : "tab"}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>

          <button
            className={tab === "members" ? "tab active" : "tab"}
            onClick={() => setTab("members")}
          >
            Members
          </button>

          <button
            className={tab === "lessons" ? "tab active" : "tab"}
            onClick={() => setTab("lessons")}
          >
            Lessons
          </button>

          <button
            className={tab === "quizzes" ? "tab active" : "tab"}
            onClick={() => setTab("quizzes")}
          >
            Quizzes
          </button>

          <button
            className={tab === "discussion" ? "tab active" : "tab"}
            onClick={() => setTab("discussion")}
          >
            Discussion
          </button>

        </div>


        {/* TAB CONTENT */}

        <div className="class-tab-content">

          {tab === "overview" && (
            <ClassOverview classItem={classItem} />
          )}

          {tab === "members" && (
            <ClassMembers classId={classItem.id} />
          )}

          {tab === "lessons" && (
            <ClassLessons classId={classItem.id} />
          )}

          {tab === "quizzes" && (
            <ClassQuizzes classId={classItem.id} />
          )}

          {tab === "discussion" && (
            <ClassDiscussion classId={classItem.id} />
          )}

        </div>

      </div>

    </div>

  )

}