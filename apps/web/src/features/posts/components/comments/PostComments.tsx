import { useCallback } from "react"
import { useComments } from "../../hooks/useComments"
import { useToast } from "@/features/posts/hooks/useToast"
import CommentComposer from "./CommentComposer"
import CommentItem from "./CommentItem"

type Props = {
  postId: number
  onCommentAdded?: () => void
  onCommentDeleted?: () => void
}

export default function PostComments({ postId, onCommentAdded, onCommentDeleted }: Props) {
  const toast = useToast()
  const {
    comments, loading, loadingMore, hasMore,
    error, addComment, deleteComment, loadMore, reload,
  } = useComments(postId, { initialLimit: 10, autoLoad: true })

  const handleAddComment = useCallback(async (content: string) => {
    const success = await addComment(content)
    if (success) onCommentAdded?.()
    return success
  }, [addComment, onCommentAdded])

  const handleDeleteComment = useCallback(async (commentId: number) => {
    const success = await deleteComment(commentId)
    if (success) { onCommentDeleted?.(); toast.success("Comment deleted") }
    return success
  }, [deleteComment, onCommentDeleted, toast])

  if (error && comments.length === 0) return (
    <div className="comments-error">
      <p>Failed to load comments</p>
      <button className="retry-btn" onClick={reload}>Try Again</button>
    </div>
  )

  return (
    <div className="post-comments">
      {/* Main Composer */}
      <CommentComposer onSubmit={handleAddComment} />

      {/* Loading */}
      {loading && comments.length === 0 && (
        <div className="comments-loading-more" style={{ padding: "16px 0" }}>
          <div className="spinner" />
          <span>Loading comments...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && comments.length === 0 && (
        <div className="comments-empty">
          <p>💭 No comments yet — be first!</p>
        </div>
      )}

      {/* Comment List */}
      <div className="comment-list">
        {comments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onDelete={handleDeleteComment}
            onReply={handleAddComment}
            depth={0}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <button
          className="load-more-btn"
          onClick={loadMore}
          disabled={loadingMore}
          style={{ width: "100%", marginTop: 8, padding: "8px", border: "1px solid var(--border)", borderRadius: 8, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 13 }}
        >
          {loadingMore ? "Loading..." : "Load more comments"}
        </button>
      )}
    </div>
  )
}