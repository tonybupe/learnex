export type Notification = {

  id: number

  title?: string
  message: string

  created_at: string

  is_read?: boolean
  is_seen?: boolean

  entity_type?: string
  entity_id?: number

}