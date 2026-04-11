import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import type { Class } from "../types/class.types"

export function useUpdateClass() {

  async function updateClass(
    id: number,
    data: Partial<Class>
  ) {

    const res = await api.patch(
      endpoints.classes.update(id),
      data
    )

    return res.data

  }

  return { updateClass }

}