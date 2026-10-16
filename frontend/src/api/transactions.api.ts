import { apiClient } from './axios'
import type {
  Transaction,
  TransactionDetail,
  TransactionListResponse,
  TransactionListParams,
  TransferPayload,
} from '../types'

export const transactionsApi = {
  transfer: (payload: TransferPayload, idempotencyKey: string) =>
    apiClient.post<Transaction>('/transactions', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  list: (params?: TransactionListParams) =>
    apiClient.get<TransactionListResponse>('/transactions/me', { params }),

  get: (id: string) =>
    apiClient.get<TransactionDetail>(`/transactions/${id}`),
}
