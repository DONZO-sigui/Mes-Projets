import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TransactionDetail from '../pages/TransactionDetail'

vi.mock('../api/transactions.api', () => ({
  transactionsApi: {
    get: vi.fn(),
    list: vi.fn(),
    transfer: vi.fn(),
  },
}))

import { transactionsApi } from '../api/transactions.api'

const TX_ID = 'sec-00001111-2222-3333-4444-555566667777'

const mockTx = {
  id: TX_ID,
  reference: 'REF-SECURITYCHECK',
  montant: '75000',
  frais: '750',
  montant_total: '75750',
  devise: 'GNF' as const,
  statut: 'COMPLETED' as const,
  motif: null,
  confirmed_at: '2024-01-15T10:30:00Z',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  sender: { nom: 'DIALLO', prenom: 'Mamadou' },
  receiver: { nom: 'CAMARA', prenom: 'Fatoumata' },
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
}

function renderDetail() {
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={[`/transactions/${TX_ID}`]}>
        <Routes>
          <Route
            path="/transactions/:transactionId"
            element={<TransactionDetail />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Sécurité frontend — page TransactionDetail (lecture seule)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(transactionsApi.get).mockResolvedValue({ data: mockTx } as any)
  })

  it("ne déclenche aucun appel en écriture (transfer ou list n'est pas appelé)", async () => {
    renderDetail()
    await waitFor(() =>
      expect(document.body.textContent).toContain('REF-SECURITYCHECK'),
    )
    expect(transactionsApi.transfer).not.toHaveBeenCalled()
    expect(transactionsApi.list).not.toHaveBeenCalled()
  })

  it("ne contient aucun champ permettant de définir sender_wallet_id", async () => {
    renderDetail()
    await waitFor(() =>
      expect(document.body.textContent).toContain('REF-SECURITYCHECK'),
    )
    const allFields = document.querySelectorAll('input, select, textarea')
    allFields.forEach((el) => {
      const name = (el.getAttribute('name') ?? '').toLowerCase()
      const id = (el.getAttribute('id') ?? '').toLowerCase()
      expect(name).not.toContain('sender')
      expect(id).not.toContain('sender')
    })
  })

  it("ne contient aucun champ de saisie pour modifier le montant", async () => {
    renderDetail()
    await waitFor(() =>
      expect(document.body.textContent).toContain('REF-SECURITYCHECK'),
    )
    const allInputs = document.querySelectorAll('input, textarea')
    allInputs.forEach((el) => {
      const name = (el.getAttribute('name') ?? '').toLowerCase()
      const id = (el.getAttribute('id') ?? '').toLowerCase()
      expect(name).not.toContain('montant')
      expect(id).not.toContain('montant')
    })
  })

  it("ne contient aucun champ pour modifier les frais ou le statut", async () => {
    renderDetail()
    await waitFor(() =>
      expect(document.body.textContent).toContain('REF-SECURITYCHECK'),
    )
    const allFields = document.querySelectorAll('input, select, textarea')
    allFields.forEach((el) => {
      const name = (el.getAttribute('name') ?? '').toLowerCase()
      const id = (el.getAttribute('id') ?? '').toLowerCase()
      expect(name).not.toMatch(/frais|statut|status|solde/)
      expect(id).not.toMatch(/frais|statut|status|solde/)
    })
  })

  it("affiche exactement les données reçues du backend sans les modifier", async () => {
    renderDetail()
    await waitFor(() =>
      expect(document.body.textContent).toContain('REF-SECURITYCHECK'),
    )
    // Référence affichée verbatim
    expect(document.body.textContent).toContain('REF-SECURITYCHECK')
    // Noms affichés verbatim
    expect(document.body.textContent).toContain('Mamadou')
    expect(document.body.textContent).toContain('DIALLO')
    expect(document.body.textContent).toContain('Fatoumata')
    expect(document.body.textContent).toContain('CAMARA')
    // Aucun appel en écriture
    expect(transactionsApi.transfer).not.toHaveBeenCalled()
  })
})
