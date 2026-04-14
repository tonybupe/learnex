export type Subject = {
  id: number
  name: string
  code: string
  description?: string | null
  created_by: number | null
  created_at: string
  updated_at: string
}
export type SubjectCreate = {
  name: string
  code: string
  description?: string
}