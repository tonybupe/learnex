import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

export function useLeaveClass() {

  async function leaveClass(id: number) {

    try {

      const res = await api.post(
        endpoints.classes.leave(id)
      )

      return res.data

    } catch (err) {

      console.error("Failed to leave class", err)

      throw err

    }

  }

  return { leaveClass }

}