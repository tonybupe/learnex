import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import type { SubjectCreate } from "../types/subject.types"

export function useCreateSubject() {

  async function createSubject(data: SubjectCreate) {

    try {

      const res = await api.post(
        endpoints.subjects.create,
        data
      )

      return res.data

    } catch (err) {

      console.error("Subject creation failed", err)

      throw err

    }

  }

  return { createSubject }

}