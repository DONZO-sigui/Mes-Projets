/**
 * Tests for the Send/Transfer flow.
 * Verifies form validation, idempotency key generation,
 * security constraints (no sender_wallet_id, no fees, etc.).
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Send from '../pages/Send'
import { transactionsApi } from '../api/transactions.api'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../api/transactions.api', () => ({
  transactionsApi: {
    transfer: vi.fn(),
  },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderSend() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Send />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// ── Form validation ───────────────────────────────────────────────────────────

describe('Send form — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows receiver_wallet_id error when empty', async () => {
    renderSend()
    const submit = screen.getByRole('button', { name: /continuer/i })
    fireEvent.click(submit)
    await screen.findByText(/identifiant du wallet destinataire obligatoire/i)
  })

  it('shows format error for invalid UUID', async () => {
    renderSend()
    const input = screen.getByLabelText(/wallet destinataire/i)
    await userEvent.type(input, 'not-a-uuid')
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
    await screen.findByText(/format invalide/i)
  })

  it('shows montant error when empty', async () => {
    renderSend()
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
    await screen.findByText(/montant obligatoire/i)
  })

  it('shows error for negative montant', async () => {
    renderSend()
    const input = screen.getByLabelText(/^montant/i)
    await userEvent.type(input, '-100')
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
    await screen.findByText(/supérieur à zéro/i)
  })

  it('shows error for zero montant', async () => {
    renderSend()
    const input = screen.getByLabelText(/^montant/i)
    await userEvent.type(input, '0')
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
    await screen.findByText(/supérieur à zéro/i)
  })

  it('proceeds to confirm with valid inputs', async () => {
    renderSend()
    await userEvent.type(screen.getByLabelText(/wallet destinataire/i), VALID_UUID)
    await userEvent.type(screen.getByLabelText(/^montant/i), '50000')
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
    await screen.findByText(/vérifier le transfert/i)
  })
})

// ── Security constraints ──────────────────────────────────────────────────────

describe('Send — security constraints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does NOT include sender_wallet_id in the API call', async () => {
    const mockTransfer = vi.mocked(transactionsApi.transfer)
    mockTransfer.mockResolvedValue({
      data: {
        id: 'tx-1',
        reference: 'REF001',
        sender_wallet_id: 'sender-wallet',
        receiver_wallet_id: VALID_UUID,
        montant: '50000',
        frais: '0',
        montant_total: '50000',
        devise: 'GNF',
        statut: 'PENDING',
        motif: null,
        idempotency_key: 'key-1',
        confirmed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    } as never)

    renderSend()
    await userEvent.type(screen.getByLabelText(/wallet destinataire/i), VALID_UUID)
    await userEvent.type(screen.getByLabelText(/^montant/i), '50000')
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
    await screen.findByText(/vérifier le transfert/i)
    fireEvent.click(screen.getByRole('button', { name: /confirmer l'envoi/i }))

    await waitFor(() => expect(mockTransfer).toHaveBeenCalledTimes(1))

    const [payload] = mockTransfer.mock.calls[0]!
    expect(payload).not.toHaveProperty('sender_wallet_id')
    expect(payload).not.toHaveProperty('fees')
    expect(payload).not.toHaveProperty('status')
    expect(payload).not.toHaveProperty('balance')
  })

  it('sends an Idempotency-Key with the request', async () => {
    const mockTransfer = vi.mocked(transactionsApi.transfer)
    mockTransfer.mockResolvedValue({
      data: {
        id: 'tx-2',
        reference: 'REF002',
        sender_wallet_id: 'sw',
        receiver_wallet_id: VALID_UUID,
        montant: '10000',
        frais: '0',
        montant_total: '10000',
        devise: 'GNF',
        statut: 'PENDING',
        motif: null,
        idempotency_key: 'key-2',
        confirmed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    } as never)

    renderSend()
    await userEvent.type(screen.getByLabelText(/wallet destinataire/i), VALID_UUID)
    await userEvent.type(screen.getByLabelText(/^montant/i), '10000')
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
    await screen.findByText(/vérifier le transfert/i)
    fireEvent.click(screen.getByRole('button', { name: /confirmer l'envoi/i }))

    await waitFor(() => expect(mockTransfer).toHaveBeenCalledTimes(1))

    const idempotencyKey = mockTransfer.mock.calls[0]![1]
    expect(typeof idempotencyKey).toBe('string')
    expect(idempotencyKey.length).toBeGreaterThan(0)
  })

  it('disables the confirm button while the request is pending', async () => {
    const mockTransfer = vi.mocked(transactionsApi.transfer)
    // Never resolves so button stays disabled
    mockTransfer.mockReturnValue(new Promise(() => {}))

    renderSend()
    await userEvent.type(screen.getByLabelText(/wallet destinataire/i), VALID_UUID)
    await userEvent.type(screen.getByLabelText(/^montant/i), '1000')
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
    await screen.findByText(/vérifier le transfert/i)
    fireEvent.click(screen.getByRole('button', { name: /confirmer l'envoi/i }))

    // When loading, button text becomes "Envoi en cours…" and must be disabled
    const loadingBtn = await screen.findByRole('button', { name: /envoi en cours/i })
    expect(loadingBtn).toBeDisabled()
  })
})

// ── Confirmation step ─────────────────────────────────────────────────────────

describe('Send — confirmation screen', () => {
  it('shows receiver_wallet_id and montant in the summary', async () => {
    renderSend()
    await userEvent.type(screen.getByLabelText(/wallet destinataire/i), VALID_UUID)
    await userEvent.type(screen.getByLabelText(/^montant/i), '75000')
    await userEvent.type(screen.getByLabelText(/motif/i), 'Aide familiale')
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))

    await screen.findByText(/vérifier le transfert/i)
    expect(screen.getByText(VALID_UUID)).toBeTruthy()
    expect(screen.getByText(/aide familiale/i)).toBeTruthy()
  })

  it('returns to form when "Modifier" is clicked', async () => {
    renderSend()
    await userEvent.type(screen.getByLabelText(/wallet destinataire/i), VALID_UUID)
    await userEvent.type(screen.getByLabelText(/^montant/i), '5000')
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
    await screen.findByText(/vérifier le transfert/i)
    fireEvent.click(screen.getByRole('button', { name: /modifier/i }))
    await screen.findByLabelText(/wallet destinataire/i)
  })
})
