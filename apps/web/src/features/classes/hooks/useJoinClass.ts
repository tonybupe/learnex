import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

export function useJoinClass() {

  async function joinClass(id: number) {

    try {

      const res = await api.post(
        endpoints.classes.join(id)
      )

      return res.data

    } catch (err: any) {

      const message =
        err?.response?.data?.detail ||
        "Failed to join class"

      throw new Error(message)

    }

  }

  return { joinClass }

}