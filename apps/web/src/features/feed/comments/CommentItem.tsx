import type { Comment } from "./PostComments"

type Props = {
  comment: Comment
}

export default function CommentItem({ comment }: Props) {

  const avatar =
    comment.author?.avatar_url || "/avatar.png"

  const name =
    comment.author?.name || "User"

  return (

    <div className="comment-item">

      <img
        src={avatar}
        className="comment-avatar"
        alt={name}
      />

      <div className="comment-body">

        <div className="comment-author">
          {name}
        </div>

        <div className="comment-text">
          {comment.content}
        </div>

        <div className="comment-time">
          {new Date(comment.created_at).toLocaleString()}
        </div>

      </div>

    </div>

  )

}