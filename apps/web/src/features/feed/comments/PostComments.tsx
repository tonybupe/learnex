import { useEffect, useState } from "react"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import CommentItem from "./CommentItem"
import CommentComposer from "./CommentComposer"

export type Comment = {

  id: number
  content: string
  created_at: string

  author: {
    id: number
    name: string
    avatar_url?: string | null
  }

}

type Props = {
  postId: number
}

export default function PostComments({ postId }: Props) {

  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  async function loadComments() {

    try {

      setLoading(true)

      const res = await api.get(
        endpoints.posts.comments(postId)
      )

      setComments(res.data.items ?? res.data)

    } catch (err) {

      console.error("Comments load failed", err)

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {

    loadComments()

  }, [postId])


  return (

    <div className="post-comments">

      <CommentComposer
        postId={postId}
        onCommentCreated={loadComments}
      />

      {loading && (
        <div className="comment-loading">
          Loading comments...
        </div>
      )}

      {!loading && comments.map((comment) => (

        <CommentItem
          key={comment.id}
          comment={comment}
        />

      ))}

    </div>

  )

}