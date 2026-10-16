/**
 * Tests for the Dashboard page.
 * Verifies balance display, loading state, error state, and user greeting.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from '../pages/Dashboard'
import { walletsApi } from '../api/wallets.api'
import { transactionsApi } from '../api/transactions.api'
import type { User } from '../types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../api/wallets.api', () => ({
  walletsApi: { me: vi.fn() },
}))

vi.mock('../api/transactions.api', () => ({
  transactionsApi: { list: vi.fn() },
}))

const MOCK_USER: User = {
  id: 'user-1',
  email: 'test@example.com',
  first_name: 'Mamadou',
  last_name: 'Diallo',
  role: 'USER',
  status: 'ACTIVE',
  is_email_verified: true,
  last_login_at: null,
  created_at: '2024-01-01T00:00:00Z',
}

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: MOCK_USER }),
}))

const MOCK_WALLET = {
  id: 'wallet-1',
  nif: 'NIF001',
  nom: 'Diallo',
  prenom: 'Mamadou',
  ville: 'Conakry',
  devise: 'GNF',
  solde: '150000.0000',
  statut: 'ACTIVE',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

function renderDashboard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the user first name in the greeting', async () => {
    vi.mocked(walletsApi.me).mockResolvedValue({ data: MOCK_WALLET } as never)
    vi.mocked(transactionsApi.list).mockResolvedValue({
      data: { total: 0, page: 1, limit: 5, items: [] },
    } as never)

    renderDashboard()
    expect(screen.getByText(/Bonjour, Mamadou/i)).toBeTruthy()
  })

  it('shows loading state initially', () => {
    // Never resolves
    vi.mocked(walletsApi.me).mockReturnValue(new Promise(() => {}) as never)
    vi.mocked(transactionsApi.list).mockReturnValue(new Promise(() => {}) as never)

    renderDashboard()
    const spinners = screen.getAllByRole('status')
    expect(spinners.length).toBeGreaterThan(0)
  })

  it('displays the wallet balance after loading', async () => {
    vi.mocked(walletsApi.me).mockResolvedValue({ data: MOCK_WALLET } as never)
    vi.mocked(transactionsApi.list).mockResolvedValue({
      data: { total: 0, page: 1, limit: 5, items: [] },
    } as never)

    renderDashboard()
    await screen.findByText(/150/i) // balance contains "150"
    await screen.findByText(/GNF/i)
  })

  it('shows error when wallet fetch fails', async () => {
    vi.mocked(walletsApi.me).mockRejectedValue({
      response: { data: { error: { code: 'NOT_FOUND', message: 'Wallet introuvable.', details: null } } },
    } as never)
    vi.mocked(transactionsApi.list).mockResolvedValue({
      data: { total: 0, page: 1, limit: 5, items: [] },
    } as never)

    renderDashboard()
    await screen.findByText(/wallet introuvable/i)
  })

  it('shows empty state when no transactions', async () => {
    vi.mocked(walletsApi.me).mockResolvedValue({ data: MOCK_WALLET } as never)
    vi.mocked(transactionsApi.list).mockResolvedValue({
      data: { total: 0, page: 1, limit: 5, items: [] },
    } as never)

    renderDashboard()
    await screen.findByText(/aucune transaction/i)
  })

  it('shows Envoyer and Historique action buttons', async () => {
    vi.mocked(walletsApi.me).mockResolvedValue({ data: MOCK_WALLET } as never)
    vi.mocked(transactionsApi.list).mockResolvedValue({
      data: { total: 0, page: 1, limit: 5, items: [] },
    } as never)

    renderDashboard()
    expect(screen.getAllByText(/envoyer/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/historique/i)).toBeTruthy()
  })
})
