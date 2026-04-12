import { memo } from "react"
import type { Post } from "../../types/post.types"

type Props = { post: Post }

function PostStats({ post }: Props) {
  const likes = post.reactions_count ?? 0
  const comments = post.comments_count ?? 0

  const fmt = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toString()

  if (likes === 0 && comments === 0) return null

  return (
    <div className="post-stats">
      <div className="post-stats-left">
        {likes > 0 && (
          <span className="post-stats-item">
            <span className="stats-icon">❤️</span>
            <span className="stats-count">{fmt(likes)}</span>
          </span>
        )}
      </div>
      <div className="post-stats-right">
        {comments > 0 && (
          <span className="post-stats-item">
            <span className="stats-count">{fmt(comments)} comment{comments !== 1 ? "s" : ""}</span>
          </span>
        )}
      </div>
    </div>
  )
}

export default memo(PostStats)