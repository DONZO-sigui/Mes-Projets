import { apiClient } from './axios'
import type { MNBCStatus, MNBCReserve } from '../types'

export const mnbcApi = {
  status: () =>
    apiClient.get<MNBCStatus>('/mnbc/status'),

  reserves: () =>
    apiClient.get<MNBCReserve[]>('/mnbc/reserves'),
}
