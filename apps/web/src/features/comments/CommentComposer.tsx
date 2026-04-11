import { useState } from "react"
import { useCreateComment } from "./useComments"

type Props = {
  postId: number
}

export default function CommentComposer({ postId }: Props) {

  const [content, setContent] = useState("")
  const createComment = useCreateComment(postId)

  const submit = async () => {
    const value = content.trim()

    if (!value) return

    try {
      await createComment.mutateAsync(value)
      setContent("")
    } catch (error) {
      console.error("Failed to create comment", error)
    }
  }

  return (

    <div className="flex gap-2 mt-3">

      <input
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
        }}
      />

      <button
        onClick={submit}
        disabled={createComment.isPending}
        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        Send
      </button>

    </div>

  )
}