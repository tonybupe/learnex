import FeedPost from "./components/FeedPost"
import { useFeed } from "./hooks/useFeed"
import type { Post } from "./types/feed.types"

export default function FeedList() {

  const { posts, loading } = useFeed()

  if (loading) {

    return (
      <div className="card feed-loading">
        Loading feed...
      </div>
    )

  }

  if (!posts?.length) {

    return (
      <div className="card feed-empty">
        No posts yet.
      </div>
    )

  }

  return (

    <div className="feed-list">

      {posts.map((post: Post) => (

        <FeedPost
          key={post.id}
          post={post}
        />

      ))}

    </div>

  )

}