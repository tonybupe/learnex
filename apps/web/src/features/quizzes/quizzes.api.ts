import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

export const listQuizzes = async () => {
  const res = await api.get(endpoints.quizzes.list)
  return res.data
}

export const startQuiz = async (quizId:number) => {
  const res = await api.post(endpoints.quizzes.start(quizId))
  return res.data
}

export const submitQuiz = async (quizId:number, attemptId:number, data:any) => {
  const res = await api.post(
    endpoints.quizzes.submit(quizId, attemptId),
    data
  )
  return res.data
}