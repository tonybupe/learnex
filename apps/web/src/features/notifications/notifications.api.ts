import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"

export const getNotifications = async () => {
  const res = await api.get(endpoints.notifications.list)
  return res.data
}

export const getUnreadCount = async () => {
  const res = await api.get(endpoints.notifications.unreadCount)
  return res.data
}

export const markNotificationRead = async (notificationId: number) => {
  const res = await api.patch(endpoints.notifications.markRead(notificationId))
  return res.data
}

export const markNotificationSeen = async (notificationId: number) => {
  const res = await api.patch(endpoints.notifications.markSeen(notificationId))
  return res.data
}

export const markAllRead = async () => {
  const res = await api.patch(endpoints.notifications.markAllRead)
  return res.data
}

export const markAllSeen = async () => {
  const res = await api.patch(endpoints.notifications.markAllSeen)
  return res.data
}