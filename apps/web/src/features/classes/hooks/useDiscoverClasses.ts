import { useEffect, useState } from "react"

import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import type { Class } from "../types/class.types"

export function useDiscoverClasses() {

  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {

    try {

      setLoading(true)

      const res = await api.get(
        endpoints.classes.discover
      )

      setClasses(res.data?.items ?? res.data ?? [])

    } catch (err) {

      console.error("Failed to load discover classes", err)

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {

    load()

  }, [])

  return {
    classes,
    loading,
    reload: load
  }

}