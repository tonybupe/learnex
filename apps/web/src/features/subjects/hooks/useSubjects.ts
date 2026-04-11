import { useEffect, useState, useCallback } from "react"

import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import type { Subject } from "../types/subject.types"

/*
-----------------------------------------
SUBJECTS HOOK
Fetch and manage subjects list
-----------------------------------------
*/

export function useSubjects() {

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  /*
  -----------------------------------------
  LOAD SUBJECTS
  -----------------------------------------
  */

  const load = useCallback(async (signal?: AbortSignal) => {

    try {

      setLoading(true)

      const res = await api.get(endpoints.subjects.list, { signal })

      /*
      Backend may return:
      { items: [] }
      OR direct array
      */

      const data = res.data?.items ?? res.data ?? []

      setSubjects(data)

    } catch (err: any) {

      /*
      Ignore abort errors
      */

      if (err?.name === "CanceledError") return

      console.error("Subjects loading failed:", err)

    } finally {

      setLoading(false)

    }

  }, [])

  /*
  -----------------------------------------
  INITIAL LOAD
  -----------------------------------------
  */

  useEffect(() => {

    const controller = new AbortController()

    load(controller.signal)

    return () => controller.abort()

  }, [load])

  /*
  -----------------------------------------
  EXPOSE API
  -----------------------------------------
  */

  return {

    subjects,

    loading,

    reload: () => load()

  }

}