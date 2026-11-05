import { apiClient } from './axios'
import type { BlockchainStatus, BlockchainBlock } from '../types'

export const blockchainApi = {
  status: () =>
    apiClient.get<BlockchainStatus>('/blockchain/status'),

  getBlock: (id: string) =>
    apiClient.get<BlockchainBlock>(`/blockchain/blocks/${id}`),
}
