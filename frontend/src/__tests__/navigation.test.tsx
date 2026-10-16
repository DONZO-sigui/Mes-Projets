import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/AuthContext'
import Transactions from '../pages/Transactions'
import Dashboard from '../pages/Dashboard'
import Notifications from '../pages/Notifications'
import Send from '../pages/Send'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../api/transactions.api', () => ({
  transactionsApi: { get: vi.fn(), list: vi.fn(), transfer: vi.fn() },
}))
vi.mock('../api/wallets.api', () => ({
  walletsApi: { me: vi.fn() },
}))
vi.mock('../api/notifications.api', () => ({
  notificationsApi: {
    list: vi.fn(),
    unreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))
vi.mock('../api/beneficiaries.api', () => ({
  beneficiariesApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { transactionsApi } from '../api/transactions.api'
import { walletsApi } from '../api/wallets.api'
import { notificationsApi } from '../api/notifications.api'
import { beneficiariesApi } from '../api/beneficiaries.api'

// ── Données de test ───────────────────────────────────────────────────────────

const TX_ID = '11111111-2222-3333-4444-555566667777'
const NOTIF_TX_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'
const WALLET_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const TX_REFERENCE = 'REF-11111111'

const mockWallet = {
  id: WALLET_ID,
  nif: '123456',
  nom: 'DIALLO',
  prenom: 'Mamadou',
  ville: 'Conakry',
  devise: 'GNF' as const,
  solde: '100000',
  statut: 'ACTIVE' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockTx = {
  id: TX_ID,
  reference: TX_REFERENCE,
  sender_wallet_id: WALLET_ID,
  receiver_wallet_id: '99999999-8888-7777-6666-555544443333',
  montant: '10000',
  devise: 'GNF' as const,
  frais: '0',
  montant_total: '10000',
  statut: 'COMPLETED' as const,
  motif: null,
  idempotency_key: 'test-key',
  confirmed_at: '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

const mockUser = {
  id: 'user-uuid-1234',
  email: 'mamadou@test.com',
  first_name: 'Mamadou',
  last_name: 'DIALLO',
  role: 'USER' as const,
  status: 'ACTIVE' as const,
  is_email_verified: true,
  last_login_at: null,
  created_at: '2024-01-01T00:00:00Z',
}

const authValue: AuthContextValue = {
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  setUser: vi.fn(),
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  })
}

function renderPage(ui: React.ReactElement, withAuth = false) {
  const content = withAuth ? (
    <AuthContext.Provider value={authValue}>{ui}</AuthContext.Provider>
  ) : ui
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter>{content}</MemoryRouter>
    </QueryClientProvider>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Navigation — page Historique (Transactions)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("chaque transaction affiche un lien cliquable vers /transactions/:id", async () => {
    vi.mocked(walletsApi.me).mockResolvedValue({ data: mockWallet } as any)
    vi.mocked(transactionsApi.list).mockResolvedValue({
      data: { total: 1, page: 1, limit: 20, items: [mockTx] },
    } as any)

    renderPage(<Transactions />)

    // La vue mobile enveloppe chaque carte dans un <Link aria-label="Voir détail transaction ...">
    const link = await screen.findByRole('link', {
      name: new RegExp(`Voir détail transaction.*${TX_REFERENCE}`, 'i'),
    })
    expect(link).toHaveAttribute('href', `/transactions/${TX_ID}`)
  })
})

describe("Navigation — Dashboard (transactions récentes)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("les transactions récentes ont un lien vers leur détail", async () => {
    vi.mocked(walletsApi.me).mockResolvedValue({ data: mockWallet } as any)
    vi.mocked(transactionsApi.list).mockResolvedValue({
      data: { total: 1, page: 1, limit: 5, items: [mockTx] },
    } as any)
    vi.mocked(notificationsApi.list).mockResolvedValue({
      data: { total: 0, unread_count: 0, items: [] },
    } as any)

    renderPage(<Dashboard />, true)

    const link = await screen.findByRole('link', {
      name: new RegExp(`Voir détail transaction.*${TX_REFERENCE}`, 'i'),
    })
    expect(link).toHaveAttribute('href', `/transactions/${TX_ID}`)
  })
})

describe("Navigation — page Notifications (lien vers transaction)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("une notification TRANSFER avec metadata.transaction_id affiche un lien vers le détail", async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue({
      data: {
        total: 1,
        unread_count: 1,
        items: [
          {
            id: 'notif-uuid-0001',
            type: 'TRANSFER_COMPLETED',
            title: 'Transfert effectué',
            message: 'Votre transfert a été confirmé.',
            is_read: false,
            created_at: '2024-01-15T10:00:00Z',
            read_at: null,
            metadata: { transaction_id: NOTIF_TX_ID },
          },
        ],
      },
    } as any)

    renderPage(<Notifications />)

    const link = await screen.findByRole('link', {
      name: /voir le détail de la transaction/i,
    })
    expect(link).toHaveAttribute('href', `/transactions/${NOTIF_TX_ID}`)
  })
})

describe("Navigation — page Send (résultat de transfert)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("le résultat d'un transfert réussi affiche un lien 'Voir le détail'", async () => {
    vi.mocked(beneficiariesApi.list).mockResolvedValue({
      data: { total: 0, items: [] },
    } as any)
    vi.mocked(transactionsApi.transfer).mockResolvedValue({
      data: mockTx,
    } as any)
    // Invalidation queries après mutation
    vi.mocked(walletsApi.me).mockResolvedValue({ data: mockWallet } as any)
    vi.mocked(transactionsApi.list).mockResolvedValue({
      data: { total: 0, page: 1, limit: 20, items: [] },
    } as any)

    renderPage(<Send />)

    // Étape 1 — remplir le formulaire
    await userEvent.type(
      screen.getByLabelText(/wallet destinataire/i),
      '99999999-8888-7777-6666-555544443333',
    )
    await userEvent.type(screen.getByLabelText(/montant/i), '10000')
    await userEvent.click(screen.getByRole('button', { name: /continuer/i }))

    // Étape 2 — confirmer
    const confirmBtn = await screen.findByRole('button', {
      name: /confirmer l'envoi/i,
    })
    await userEvent.click(confirmBtn)

    // Étape 3 — résultat : lien "Voir le détail" doit pointer vers l'ID
    const detailLink = await screen.findByRole('link', {
      name: /voir le détail/i,
    })
    expect(detailLink).toHaveAttribute('href', `/transactions/${TX_ID}`)
  })
})
