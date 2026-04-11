import { useEffect, useState } from "react"

import { api } from "@/api/client"

import type { Subject } from "../types/subject.types"

type UpdateSubjectPayload = {

  name: string
  code: string
  description?: string

}

export function useUpdateSubject() {

  async function updateSubject(
    id: number,
    data: UpdateSubjectPayload
  ): Promise<Subject> {

    const response = await api.patch(
      `/subjects/${id}`,
      data
    )

    return response.data

  }

  return {
    updateSubject
  }

}