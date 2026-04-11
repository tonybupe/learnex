// components/post/PostStats.tsx
import { memo } from "react"
import type { Post } from "../../types/post.types"

type Props = {
  post: Post
  showIcons?: boolean
  compact?: boolean
}

function PostStats({ post, showIcons = true, compact = false }: Props) {
  const likes = post.reactions_count ?? 0
  const comments = post.comments_count ?? 0
  const saves = post.saves_count ?? 0

  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
    return num.toString()
  }

  const getLikeText = () => {
    if (likes === 0) return showIcons ? "0" : "No likes yet"
    if (likes === 1) return showIcons ? "1" : "1 like"
    return showIcons ? formatNumber(likes) : `${formatNumber(likes)} likes`
  }

  const getCommentText = () => {
    if (comments === 0) return showIcons ? "0" : "No comments yet"
    if (comments === 1) return showIcons ? "1" : "1 comment"
    return showIcons ? formatNumber(comments) : `${formatNumber(comments)} comments`
  }

  return (
    <div className={`post-stats ${compact ? 'compact' : ''}`}>
      <div className="post-stats-item">
        {showIcons && <span className="stats-icon">👍</span>}
        <span className="stats-count">{getLikeText()}</span>
      </div>

      <div className="post-stats-item">
        {showIcons && <span className="stats-icon">💬</span>}
        <span className="stats-count">{getCommentText()}</span>
      </div>

      {saves > 0 && (
        <div className="post-stats-item">
          {showIcons && <span className="stats-icon">🔖</span>}
          <span className="stats-count">{formatNumber(saves)} saves</span>
        </div>
      )}
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(PostStats)