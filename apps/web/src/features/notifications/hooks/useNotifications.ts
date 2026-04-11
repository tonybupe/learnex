import { useEffect, useState } from "react"

import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

import type { Notification } from "../types/notification.types"

export function useNotifications() {

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  async function loadNotifications() {

    try {

      const res = await api.get(endpoints.notifications.list)

      setNotifications(res.data.items ?? res.data)

    } catch (err) {

      console.error("Notifications load failed", err)

    }

  }

  async function loadUnread() {

    try {

      const res = await api.get(endpoints.notifications.unreadCount)

      setUnreadCount(res.data.count ?? 0)

    } catch (err) {

      console.error("Unread count failed", err)

    }

  }

  async function markRead(id: number) {

    try {

      await api.patch(endpoints.notifications.markRead(id))

      setNotifications((list) =>
        list.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        )
      )

    } catch (err) {

      console.error("Mark read failed", err)

    }

  }

  useEffect(() => {

    async function init() {

      setLoading(true)

      await Promise.all([
        loadNotifications(),
        loadUnread()
      ])

      setLoading(false)

    }

    init()

  }, [])

  return {

    notifications,
    unreadCount,
    loading,

    reload: loadNotifications,
    markRead

  }

}