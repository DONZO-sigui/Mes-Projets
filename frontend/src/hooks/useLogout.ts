import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { apiClient } from '../api/axios'

/**
 * Hook de déconnexion sécurisé :
 * 1. Appelle POST /auth/logout sur le backend (révoque le refresh token)
 * 2. Vide le cache React Query
 * 3. Efface les tokens localStorage + dispatche l'événement auth:logout
 *
 * Utiliser ce hook dans les composants UI à la place de useAuth().logout().
 */
export function useLogout() {
  const { logout } = useAuth()
  const queryClient = useQueryClient()

  return useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refresh_token: refreshToken })
      } catch {
        // Non-bloquant : on déconnecte toujours côté client
      }
    }
    queryClient.clear()
    logout()
  }, [logout, queryClient])
}
