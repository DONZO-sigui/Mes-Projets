import { apiClient } from './axios'
import type { Wallet, WalletPublicInfo } from '../types'

export const walletsApi = {
  me: () => apiClient.get<Wallet>('/wallets/me'),
  deposit: (montant: number) =>
    apiClient.post<Wallet>('/wallets/me/deposit', { montant }),
  publicLookup: (numero: string) =>
    apiClient.get<WalletPublicInfo>(`/wallets/public/${numero}`),
}
