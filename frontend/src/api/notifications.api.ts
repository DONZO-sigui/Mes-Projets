import { apiClient } from './axios'
import type {
  NotificationListResponse,
  Notification,
  UnreadCountResponse,
} from '../types'

export const notificationsApi = {
  list: (page = 1, limit = 50, unread = false) =>
    apiClient.get<NotificationListResponse>('/notifications', {
      params: { page, limit, unread },
    }),

  unreadCount: () =>
    apiClient.get<UnreadCountResponse>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiClient.patch<Notification>(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.post<{ updated: number }>('/notifications/read-all'),
}
