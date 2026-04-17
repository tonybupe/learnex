import { memo, useCallback, useState } from "react"
import type { Post } from "../../types/post.types"
import { useToast } from "@/features/posts/hooks/useToast"
import { usePostActions } from "../../hooks/usePostActions"
import { toggleSave } from "../../api/posts.api"
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react"

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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n > 0 ? n.toString() : ""
}

function PostActionsComponent({
  post, onLike, onShare, onToggleComments, showComments, isLoading
}: Props) {
  const toast = useToast()
  const { toggleLike, loading } = usePostActions({ optimisticUpdates: true })

  const [isSaved, setIsSaved] = useState(post.is_saved ?? false)
  const [savesCount, setSavesCount] = useState(post.saves_count ?? 0)
  const [saveLoading, setSaveLoading] = useState(false)

  const handleLike = useCallback(async () => {
    if (loading) return
    await toggleLike(post.id, post.is_liked ?? false)
    onLike?.()
  }, [post.id, post.is_liked, toggleLike, loading, onLike])

  const handleSave = useCallback(async () => {
    if (saveLoading) return
    setSaveLoading(true)

    const wasSaved = isSaved

    // Optimistic update
    setIsSaved(!wasSaved)
    setSavesCount(c => wasSaved ? Math.max(0, c - 1) : c + 1)

    try {
      await toggleSave(post.id, wasSaved)
      if (wasSaved) {
        toast.success("Removed from saved")
      } else {
        toast.success("Post saved to bookmarks!", {
          action: {
            label: "View Saved",
            onClick: () => { window.location.href = "/saved" }
          }
        })
      }
    } catch {
      // Revert on error
      setIsSaved(wasSaved)
      setSavesCount(c => wasSaved ? c + 1 : Math.max(0, c - 1))
      toast.error("Failed to save post. Please try again.")
    } finally {
      setSaveLoading(false)
    }
  }, [post.id, isSaved, saveLoading, toast])

  const handleShare = useCallback(async () => {
    try {
      const url = `${window.location.origin}/feed`
      if (navigator.share && window.innerWidth < 768) {
        await navigator.share({ title: post.title || "Post", text: post.content?.slice(0, 100), url })
        toast.success("Shared!")
      } else {
        await navigator.clipboard.writeText(url)
        toast.success("Link copied to clipboard!")
      }
      onShare?.()
    } catch {}
  }, [post, toast, onShare])

  return (
    <div className="post-actions">
      {/* Like */}
      <button
        className={`post-action ${post.is_liked ? "active liked" : ""}`}
        onClick={handleLike}
        disabled={!!isLoading || loading}
        aria-label="Like"
        title={post.is_liked ? "Unlike" : "Like"}>
        <Heart size={18} fill={post.is_liked ? "currentColor" : "none"} />
        {post.reactions_count > 0 && (
          <span className="action-count">{fmt(post.reactions_count)}</span>
        )}
      </button>

      {/* Comment */}
      <button
        className={`post-action ${showComments ? "active" : ""}`}
        onClick={onToggleComments}
        aria-label="Comment"
        title="Comment">
        <MessageCircle size={18} />
        {post.comments_count > 0 && (
          <span className="action-count">{fmt(post.comments_count)}</span>
        )}
      </button>

      {/* Share */}
      <button
        className="post-action"
        onClick={handleShare}
        aria-label="Share"
        title="Copy link">
        <Share2 size={18} />
      </button>

      {/* Save / Bookmark */}
      <button
        className={`post-action ${isSaved ? "active" : ""}`}
        onClick={handleSave}
        disabled={saveLoading}
        aria-label={isSaved ? "Unsave post" : "Save post"}
        title={isSaved ? "Remove from saved" : "Save to bookmarks"}
        style={{
          color: isSaved ? "#f59e0b" : undefined,
          opacity: saveLoading ? 0.6 : 1,
          transition: "all 0.2s",
          transform: saveLoading ? "scale(0.9)" : "scale(1)",
        }}>
        <Bookmark
          size={18}
          fill={isSaved ? "#f59e0b" : "none"}
          stroke={isSaved ? "#f59e0b" : "currentColor"}
        />
        {savesCount > 0 && (
          <span className="action-count" style={{ color: isSaved ? "#f59e0b" : undefined }}>
            {fmt(savesCount)}
          </span>
        )}
      </button>
    </div>
  )
}

export default memo(PostActionsComponent)