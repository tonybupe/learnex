import { useEffect, useState } from "react"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import type { Post } from "../types/feed.types"

export function useFeed() {

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  async function loadFeed() {

    try {

      setLoading(true)

      const res = await api.get(endpoints.posts.feed)

      setPosts(res.data.items ?? res.data)

    } catch (err) {

      console.error("Feed load failed", err)

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {
    loadFeed()
  }, [])

  return {
    posts,
    loading,
    reload: loadFeed
  }

}