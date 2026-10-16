import { apiClient } from './axios'
import type {
  Beneficiary,
  BeneficiaryCreate,
  BeneficiaryListResponse,
  BeneficiaryUpdate,
} from '../types'

export const beneficiariesApi = {
  list: (page = 1, limit = 50) =>
    apiClient.get<BeneficiaryListResponse>('/beneficiaries', {
      params: { page, limit },
    }),

  get: (id: string) =>
    apiClient.get<Beneficiary>(`/beneficiaries/${id}`),

  create: (data: BeneficiaryCreate) =>
    apiClient.post<Beneficiary>('/beneficiaries', data),

  update: (id: string, data: BeneficiaryUpdate) =>
    apiClient.patch<Beneficiary>(`/beneficiaries/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`/beneficiaries/${id}`),
}
