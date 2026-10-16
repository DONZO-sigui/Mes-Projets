import { apiClient } from './axios'
import type { TokenResponse, User } from '../types'

export interface RegisterPayload {
  email: string
  password: string
  first_name: string
  last_name: string
}

export interface LoginPayload {
  email: string
  password: string
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<TokenResponse>('/auth/register', payload),

  login: (payload: LoginPayload) =>
    apiClient.post<TokenResponse>('/auth/login', payload),

  refresh: (refresh_token: string) =>
    apiClient.post<TokenResponse>('/auth/refresh', { refresh_token }),

  logout: (refresh_token: string) =>
    apiClient.post<void>('/auth/logout', { refresh_token }),

  me: () => apiClient.get<User>('/auth/me'),
}
