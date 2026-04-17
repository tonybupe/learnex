export type Notification = {
  id: number
  user_id?: number
  actor_id?: number
  notification_type: string
  title?: string
  message: string
  entity_type?: string | null
  entity_id?: number | null
  action_url?: string | null
  is_read: boolean
  is_seen?: boolean
  created_at: string
  updated_at?: string
}
