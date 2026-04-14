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
  grade_level?: string | null
  visibility: "public" | "private"
  status?: string
  subject_id: number
  teacher_id?: number
  teacher?: Teacher
  subject?: Subject
  member_count?: number
  is_member?: boolean
  created_at?: string
  updated_at?: string
}

export type ClassMember = {
  id: number
  learner_id: number
  class_id: number
  status: string
  created_at: string
  learner: {
    id: number
    full_name: string
    email: string
    role: string
  }
}