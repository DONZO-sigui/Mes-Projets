import { apiClient } from './axios'
import type { MNBCStatus, MNBCReserve, MNBCRateItem } from '../types'

export const mnbcApi = {
  status: () =>
    apiClient.get<MNBCStatus>('/mnbc/status'),

  reserves: () =>
    apiClient.get<MNBCReserve[]>('/mnbc/reserves'),

  rates: () =>
    apiClient.get<MNBCRateItem[]>('/mnbc/rates'),
}
