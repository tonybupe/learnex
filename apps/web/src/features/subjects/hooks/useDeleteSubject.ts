import { useCallback } from "react"

import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

/*
-----------------------------------------
DELETE SUBJECT HOOK
Handles subject deletion
-----------------------------------------
*/

export function useDeleteSubject() {

  const deleteSubject = useCallback(
    async (id: number, signal?: AbortSignal) => {

      try {

        await api.delete(
          endpoints.subjects.delete(id),
          { signal }
        )

        return true

      } catch (err: any) {

        /*
        Ignore cancellation errors
        */

        if (err?.name === "CanceledError") return false

        console.error("Subject deletion failed:", err)

        throw err

      }

    },
    []
  )

  return {

    deleteSubject

  }

}