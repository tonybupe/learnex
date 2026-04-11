import { useCallback } from "react"

import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

export function useDeleteClass() {

  const deleteClass = useCallback(async (id: number) => {

    await api.delete(endpoints.classes.delete(id))

  }, [])

  return { deleteClass }

}