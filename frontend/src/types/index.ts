export type UserRole = 'USER' | 'ADMIN' | 'SUPERADMIN'
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING'
export type WalletStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
export type Devise = 'GNF' | 'EUR' | 'USD'
export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REVERSED'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  status: UserStatus
  is_email_verified: boolean
  last_login_at: string | null
  created_at: string
}

export interface Wallet {
  id: string
  nif: string
  nom: string
  prenom: string
  ville: string | null
  devise: Devise
  solde: string
  statut: WalletStatus
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  reference: string
  sender_wallet_id: string
  receiver_wallet_id: string
  montant: string
  devise: Devise
  frais: string
  montant_total: string
  statut: TransactionStatus
  motif: string | null
  idempotency_key: string
  confirmed_at: string | null
  created_at: string
  updated_at: string
}

export interface TransactionListResponse {
  total: number
  page: number
  limit: number
  items: Transaction[]
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface ApiError {
  error: {
    code: string
    message: string
    details: unknown[] | null
  }
}

export interface TransferPayload {
  receiver_wallet_id: string
  montant: string
  devise: Devise
  motif?: string
}

export interface TransactionListParams {
  page?: number
  limit?: number
  statut?: TransactionStatus
  devise?: Devise
  date_from?: string
  date_to?: string
  reference?: string
  sort_by?: 'created_at' | 'montant' | 'statut'
  sort_dir?: 'asc' | 'desc'
}

export interface Beneficiary {
  id: string
  wallet_id: string
  name: string
  nickname: string | null
  created_at: string
  updated_at: string
}

export interface BeneficiaryListResponse {
  total: number
  items: Beneficiary[]
}

export interface BeneficiaryCreate {
  wallet_id: string
  name: string
  nickname?: string
}

export interface BeneficiaryUpdate {
  name?: string
  nickname?: string | null
}

export interface Session {
  id: string
  created_at: string
  expires_at: string
  last_used_at: string | null
  user_agent: string | null
  is_current: boolean
}

export interface SessionListResponse {
  total: number
  items: Session[]
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  read_at: string | null
  metadata?: Record<string, unknown>
}

export interface NotificationListResponse {
  total: number
  unread_count: number
  items: Notification[]
}

export interface UnreadCountResponse {
  count: number
}

export interface WalletParty {
  nom: string
  prenom: string
}

export interface TransactionDetail {
  id: string
  reference: string
  montant: string
  frais: string
  montant_total: string
  devise: Devise
  statut: TransactionStatus
  motif: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
  sender: WalletParty
  receiver: WalletParty
}
