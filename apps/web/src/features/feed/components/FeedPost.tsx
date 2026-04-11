import { useState, useEffect } from "react"

import PostActions from "./PostActions"
import PostComments from "../comments/PostComments"

import type { Post } from "../types/feed.types"

type Props = {
  post: Post
}

export default function FeedPost({ post }: Props) {

  const [showComments, setShowComments] = useState(false)

  useEffect(() => {

    function handleOpen(e: CustomEvent) {

      if (e.detail?.postId === post.id) {
        setShowComments(v => !v)
      }

    }

    window.addEventListener("post:comments", handleOpen as EventListener)

    return () => {
      window.removeEventListener("post:comments", handleOpen as EventListener)
    }

  }, [post.id])


  const avatar = post.author?.avatar_url || "/avatar.png"
  const name = post.author?.name || "User"

  return (

    <div className="card feed-post">

      {/* HEADER */}

      <div className="post-header">

        <img
          src={avatar}
          alt={name}
          className="post-avatar"
        />

        <div className="post-author">

          <div className="post-author-name">
            {name}
          </div>

          <div className="post-time">
            {new Date(post.created_at).toLocaleString()}
          </div>

        </div>

      </div>


      {/* CONTENT */}

      {post.content && (
        <div className="post-content">
          {post.content}
        </div>
      )}


      {/* ATTACHMENTS */}

      {post.attachments?.length ? (

        <div className="post-attachments">

          {post.attachments.map(file => (

            <img
              key={file.id}
              src={file.url}
              className="post-image"
              alt="attachment"
            />

          ))}

        </div>

      ) : null}


      {/* STATS */}

      <div className="post-stats">

        <span>
          👍 {post.reactions_count ?? 0}
        </span>

        <span>
          💬 {post.comments_count ?? 0}
        </span>

      </div>


      {/* ACTIONS */}

      <PostActions post={post} />


      {/* COMMENTS */}

      {showComments && (
        <PostComments postId={post.id} />
      )}

    </div>

  )

}