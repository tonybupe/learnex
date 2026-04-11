export type ClassMember = {

  id: number

  role: string

  status: string

  created_at?: string

  learner?: {
    id: number
    full_name: string
    email: string
    phone_number?: string
    role: string
  }

}