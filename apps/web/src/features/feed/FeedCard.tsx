import { useState } from "react"
import { Heart, MessageCircle } from "lucide-react"
import CommentsList from "@/features/comments/CommentsList"
import CommentComposer from "@/features/comments/CommentComposer"

type FeedCardProps = {
  post: any
}

export default function FeedCard({ post }: FeedCardProps) {

  const [showComments, setShowComments] = useState(false)

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">

      {/* Author Header */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={post.author?.avatar || "/avatar.png"}
          alt="author avatar"
          className="w-10 h-10 rounded-full object-cover"
        />

        <div>
          <p className="font-semibold">{post.author?.name}</p>
          <p className="text-xs text-gray-500">
            {new Date(post.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Post Content */}
      <p className="text-gray-700 mb-3">
        {post.content}
      </p>

      {/* Actions */}
      <div className="flex gap-6 text-gray-500 border-t pt-3">

        <button className="flex items-center gap-2 hover:text-red-500 transition">
          <Heart size={18} />
          Like
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 hover:text-indigo-600 transition"
        >
          <MessageCircle size={18} />
          Comment
        </button>

      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 border-t pt-4">

          <CommentsList postId={post.id} />

          <CommentComposer postId={post.id} />

        </div>
      )}

    </div>
  )
}