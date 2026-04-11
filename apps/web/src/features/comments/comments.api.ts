import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

export const getPostComments = async (postId: number) => {
  const res = await api.get(endpoints.posts.comments(postId))
  return res.data
}

export const createComment = async ({
  postId,
  content
}: {
  postId: number
  content: string
}) => {
  const res = await api.post(
    endpoints.posts.comments(postId),
    { content }
  )

  return res.data
}