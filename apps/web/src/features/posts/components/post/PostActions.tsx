import { memo, useCallback } from "react"
import type { Post } from "../../types/post.types"
import { useAuthStore } from "@/features/auth/auth.store"
import { useToast } from "@/features/posts/hooks/useToast"
import { usePostActions } from "../../hooks/usePostActions"
import { Heart, MessageCircle, Share2, Bookmark, BarChart2 } from "lucide-react"

type Props = {
  post: Post
  onLike?: () => void
  onShare?: () => void
  onToggleComments: () => void
  onDelete?: () => void
  showComments?: boolean
  isLoading?: boolean
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n/1_000).toFixed(1)}K`
  return n > 0 ? n.toString() : ""
}

function PostActionsComponent({ post, onLike, onShare, onToggleComments, showComments, isLoading }: Props) {
  const user = useAuthStore(s => s.user)
  const toast = useToast()
  const { toggleLike, loading } = usePostActions({ optimisticUpdates: true })

  const handleLike = useCallback(async () => {
    if (loading) return
    await toggleLike(post.id, post.is_liked ?? false)
    onLike?.()
  }, [post.id, post.is_liked, toggleLike, loading, onLike])

  const handleShare = useCallback(async () => {
    try {
      const url = `${window.location.origin}/posts/${post.id}`
      if (navigator.share && window.innerWidth < 768) {
        await navigator.share({ title: post.title || "Post", text: post.content.slice(0,100), url })
        toast.success("Shared!")
      } else {
        await navigator.clipboard.writeText(url)
        toast.success("Link copied!")
      }
      onShare?.()
    } catch {}
  }, [post, toast, onShare])

  return (
    <div className="post-actions">
      {/* Like */}
      <button className={`post-action ${post.is_liked ? "active liked" : ""}`}
        onClick={handleLike} disabled={!!isLoading || loading} aria-label="Like">
        <Heart size={18} fill={post.is_liked ? "currentColor" : "none"} />
        {post.reactions_count > 0 && <span className="action-count">{fmt(post.reactions_count)}</span>}
      </button>

      {/* Comment */}
      <button className={`post-action ${showComments ? "active" : ""}`}
        onClick={onToggleComments} aria-label="Comment">
        <MessageCircle size={18} />
        {post.comments_count > 0 && <span className="action-count">{fmt(post.comments_count)}</span>}
      </button>

      {/* Share */}
      <button className="post-action" onClick={handleShare} aria-label="Share">
        <Share2 size={18} />
      </button>

      {/* Bookmark */}
      <button className="post-action" aria-label="Save">
        <Bookmark size={18} />
      </button>
    </div>
  )
}

export default memo(PostActionsComponent)