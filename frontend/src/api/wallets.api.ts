import { apiClient } from './axios'
import type { Wallet } from '../types'

export const walletsApi = {
  me: () => apiClient.get<Wallet>('/wallets/me'),
  deposit: (montant: number) =>
    apiClient.post<Wallet>('/wallets/me/deposit', { montant }),
}
