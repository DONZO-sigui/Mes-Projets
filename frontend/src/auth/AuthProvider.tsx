import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { AuthContext } from './AuthContext'
import { _logout } from '../api/axios'
import type { User } from '../types'

interface State {
  user: User | null
  isLoading: boolean
}

type Action =
  | { type: 'INIT'; user: User | null }
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; user: User }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INIT':
      return { user: action.user, isLoading: false }
    case 'LOGIN':
      return { user: action.user, isLoading: false }
    case 'LOGOUT':
      return { user: null, isLoading: false }
    case 'SET_USER':
      return { ...state, user: action.user }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    user: null,
    isLoading: true,
  })

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem('auth_user')
    if (raw) {
      try {
        const user = JSON.parse(raw) as User
        dispatch({ type: 'INIT', user })
      } catch {
        dispatch({ type: 'INIT', user: null })
      }
    } else {
      dispatch({ type: 'INIT', user: null })
    }
  }, [])

  // Listen for cross-module logout signals (e.g. from Axios interceptor)
  useEffect(() => {
    const handle = () => dispatch({ type: 'LOGOUT' })
    window.addEventListener('auth:logout', handle)
    return () => window.removeEventListener('auth:logout', handle)
  }, [])

  const login = useCallback(
    (accessToken: string, refreshToken: string, user: User) => {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      localStorage.setItem('auth_user', JSON.stringify(user))
      dispatch({ type: 'LOGIN', user })
    },
    [],
  )

  const logout = useCallback(() => {
    _logout()
    localStorage.removeItem('auth_user')
    dispatch({ type: 'LOGOUT' })
  }, [])

  const setUser = useCallback((user: User) => {
    localStorage.setItem('auth_user', JSON.stringify(user))
    dispatch({ type: 'SET_USER', user })
  }, [])

  const value = useMemo(
    () => ({
      user: state.user,
      isAuthenticated: state.user !== null,
      isLoading: state.isLoading,
      login,
      logout,
      setUser,
    }),
    [state, login, logout, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
