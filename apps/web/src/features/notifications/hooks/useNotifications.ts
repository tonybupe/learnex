import { useEffect, useState, useCallback } from "react"
import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"
import type { Notification } from "../types/notification.types"

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get(endpoints.notifications.list)
      const data = res.data.items ?? res.data ?? []
      setNotifications(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Notifications load failed", err)
      setNotifications([])
    }
  }, [])

  const loadUnread = useCallback(async () => {
    try {
      const res = await api.get(endpoints.notifications.unreadCount)
      setUnreadCount(res.data.count ?? res.data.unread_count ?? 0)
    } catch (err) {
      setUnreadCount(0)
    }
  }, [])

  const markRead = useCallback(async (id: number) => {
    try {
      await api.patch(endpoints.notifications.markRead(id))
      setNotifications(list => list.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(c => Math.max(0, c - 1))
    } catch (err) {
      console.error("Mark read failed", err)
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await api.patch(endpoints.notifications.markAllRead)
      setNotifications(list => list.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error("Mark all read failed", err)
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([loadNotifications(), loadUnread()])
      setLoading(false)
    }
    init()
  }, [])

  return { notifications, unreadCount, loading, reload: loadNotifications, markRead, markAllRead }
}