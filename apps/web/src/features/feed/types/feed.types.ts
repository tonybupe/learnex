export type Post = {

  id: number
  content: string
  created_at: string

  author?: {
    id: number
    name: string
    avatar_url?: string | null
  }

  attachments?: {
    id: number
    url: string
  }[]

  reactions_count?: number
  comments_count?: number

}


export type Comment = {

  id: number
  content: string
  created_at: string

  author?: {
    id: number
    name: string
    avatar_url?: string | null
  }

}