import { useEffect, useState } from "react"

import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import type { ClassMember } from "../types/class.types"

export function useClassMembers(classId: number) {

  const [members, setMembers] = useState<ClassMember[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {

    try {

      const res = await api.get(
        endpoints.classes.members(classId)
      )

      setMembers(res.data?.items ?? res.data ?? [])

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {
    load()
  }, [classId])

  return {
    members,
    loading
  }

}