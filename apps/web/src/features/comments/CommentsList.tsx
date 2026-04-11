import { usePostComments } from "./useComments"

export default function CommentsList({ postId }: { postId: number }) {

  const { data, isLoading } = usePostComments(postId)

  if (isLoading) return null

  return (

    <div className="mt-3 space-y-2">

      {data?.map((comment: any) => (

        <div key={comment.id} className="flex gap-2 text-sm">

          <img
            src={comment.author?.avatar || "/avatar.png"}
            className="w-7 h-7 rounded-full"
          />

          <div className="bg-gray-100 px-3 py-2 rounded-lg">

            <p className="font-semibold text-xs">
              {comment.author?.name}
            </p>

            <p className="text-gray-700">
              {comment.content}
            </p>

          </div>

        </div>

      ))}

    </div>

  )

}