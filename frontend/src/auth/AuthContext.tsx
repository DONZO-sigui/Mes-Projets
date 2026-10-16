import { createContext } from 'react'
import type { User } from '../types'

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthActions {
  login: (accessToken: string, refreshToken: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
}

export type AuthContextValue = AuthState & AuthActions

export const AuthContext = createContext<AuthContextValue | null>(null)
