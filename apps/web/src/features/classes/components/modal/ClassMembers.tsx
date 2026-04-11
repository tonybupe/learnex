import { useEffect, useState } from "react"

import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import type { ClassMember } from "../../types/member.types"

type Props = {
  classId: number
}

export default function ClassMembers({ classId }: Props) {

  const [members, setMembers] = useState<ClassMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    async function loadMembers() {

      try {

        const res = await api.get(
          endpoints.classes.members(classId)
        )

        setMembers(res.data ?? [])

      } finally {

        setLoading(false)

      }

    }

    loadMembers()

  }, [classId])

  if (loading) {

    return (
      <p className="members-loading">
        Loading members...
      </p>
    )

  }

  if (!members.length) {

    return (
      <p className="members-empty">
        No members in this class yet.
      </p>
    )

  }

  return (

    <div className="members-container">

      {members.map((member) => (

        <div
          key={member.id}
          className="member-card"
        >

          <div className="member-name">
            {member.learner?.full_name ?? "Unknown User"}
          </div>

          <div className="member-email">
            {member.learner?.email ?? "Unavailable Email"}
          </div>


          <div className="member-role">

            {member.learner?.role === "teacher"
              ? "Teacher"
              : "Learner"}

          </div>

        </div>

      ))}

    </div>

  )

}