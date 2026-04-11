export type Teacher = {
  id: number
  full_name: string
  email: string
  phone_number?: string
  role: string
}

export type Subject = {
  id: number
  name: string
  code: string
}

export type Class = {

  id: number

  title: string
  description?: string | null

  class_code: string
  grade_level: string

  visibility: "public" | "private"
  status?: string

  subject_id: number

  teacher?: Teacher
  subject?: Subject

  created_at?: string
  updated_at?: string

}