import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getPostComments, createComment } from "./comments.api"

export function usePostComments(postId: number) {
  return useQuery({
    queryKey: ["post-comments", postId],
    queryFn: () => getPostComments(postId)
  })
}

export function useCreateComment(postId: number) {

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (content: string) =>
      createComment({ postId, content }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["post-comments", postId]
      })
    }
  })

}