import { apiClient } from './axios'
import type { User, SessionListResponse } from '../types'

export interface UserUpdatePayload {
  first_name?: string
  last_name?: string
}

export interface PasswordChangePayload {
  current_password: string
  new_password: string
}

export const usersApi = {
  me: () =>
    apiClient.get<User>('/users/me'),

  update: (payload: UserUpdatePayload) =>
    apiClient.patch<User>('/users/me', payload),

  changePassword: (payload: PasswordChangePayload) =>
    apiClient.post<void>('/users/me/password', payload),

  getSessions: () =>
    apiClient.get<SessionListResponse>('/users/me/sessions'),

  revokeSession: (sessionId: string) =>
    apiClient.delete<void>(`/users/me/sessions/${sessionId}`),

  revokeAllSessions: () =>
    apiClient.delete<void>('/users/me/sessions'),
}
