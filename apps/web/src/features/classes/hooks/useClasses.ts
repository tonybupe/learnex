import { useEffect, useState, useCallback } from "react"

import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import type { Class } from "../types/class.types"

export function useClasses() {

  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (signal?: AbortSignal) => {

    try {

      setLoading(true)

      const res = await api.get(endpoints.classes.list, { signal })

      const data = res.data?.items ?? res.data ?? []

      setClasses(data)

    } catch (err: any) {

      if (err?.name === "CanceledError") return

      console.error("Classes loading failed:", err)

    } finally {

      setLoading(false)

    }

  }, [])

  useEffect(() => {

    const controller = new AbortController()

    load(controller.signal)

    return () => controller.abort()

  }, [load])

  return {
    classes,
    loading,
    reload: () => load()
  }

}