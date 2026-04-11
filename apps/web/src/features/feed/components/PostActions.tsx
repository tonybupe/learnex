import { useState } from "react"
import { Heart, MessageCircle, Bookmark } from "lucide-react"

import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import type { Post } from "../types/feed.types"

type Props = {
  post: Post
}

export default function PostActions({ post }: Props) {

  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)

  const [reactionCount, setReactionCount] = useState(
    post.reactions_count ?? 0
  )

  async function toggleReaction() {

    try {

      if (!liked) {

        await api.post(endpoints.posts.react(post.id))

        setReactionCount((c) => c + 1)

      } else {

        await api.delete(endpoints.posts.removeReaction(post.id))

        setReactionCount((c) => Math.max(c - 1, 0))

      }

      setLiked(!liked)

    } catch (err) {

      console.error("Reaction failed", err)

    }

  }

  async function toggleSave() {

    try {

      if (!saved) {

        await api.post(endpoints.posts.save(post.id))

      } else {

        await api.delete(endpoints.posts.unsave(post.id))

      }

      setSaved(!saved)

    } catch (err) {

      console.error("Save failed", err)

    }

  }

  function openComments() {

    window.dispatchEvent(
      new CustomEvent("post:comments", {
        detail: { postId: post.id }
      })
    )

  }

  return (

    <div className="post-actions">

      {/* Reaction */}

      <button
        className={`post-action-btn ${liked ? "active" : ""}`}
        onClick={toggleReaction}
      >

        <Heart size={18} />

        {reactionCount}

      </button>


      {/* Comments */}

      <button
        className="post-action-btn"
        onClick={openComments}
      >

        <MessageCircle size={18} />

        {post.comments_count ?? 0}

      </button>


      {/* Save */}

      <button
        className={`post-action-btn ${saved ? "active" : ""}`}
        onClick={toggleSave}
      >

        <Bookmark size={18} />

      </button>

    </div>

  )

}