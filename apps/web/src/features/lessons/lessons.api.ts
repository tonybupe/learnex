import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

export const listLessons = async () => {
  const res = await api.get(endpoints.lessons.list)
  return res.data
}

export const getLesson = async (id:number) => {
  const res = await api.get(endpoints.lessons.get(id))
  return res.data
}

export const createLesson = async (data:any) => {
  const res = await api.post(endpoints.lessons.create, data)
  return res.data
}