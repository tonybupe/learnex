import { useState } from "react"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

type Props = {
  postId: number
  onCommentCreated: () => void
}

export default function CommentComposer({
  postId,
  onCommentCreated,
}: Props) {

  const [content, setContent] = useState("")
  const [sending, setSending] = useState(false)

  async function submitComment() {

    if (!content.trim()) return

    try {

      setSending(true)

      await api.post(
        endpoints.posts.comments(postId),
        { content }
      )

      setContent("")

      onCommentCreated()

    } catch (err) {

      console.error("Comment failed", err)

    } finally {

      setSending(false)

    }

  }

  return (

    <div className="comment-composer">

      <input
        className="comment-input"
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <button
        className="btn btn-primary"
        onClick={submitComment}
        disabled={sending}
      >
        Post
      </button>

    </div>

  )

}