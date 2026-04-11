import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import type { Class } from "../types/class.types"

export function useCreateClass() {

  async function createClass(data: Partial<Class>) {

    const res = await api.post(
      endpoints.classes.create,
      data
    )

    return res.data

  }

  return { createClass }

}