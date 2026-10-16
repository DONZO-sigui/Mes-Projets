import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TransactionDetail from './index'

vi.mock('../../api/transactions.api', () => ({
  transactionsApi: {
    get: vi.fn(),
    list: vi.fn(),
    transfer: vi.fn(),
  },
}))

import { transactionsApi } from '../../api/transactions.api'

const mockTx = {
  id: 'aabbccdd-0011-2233-4455-66778899aabb',
  reference: 'REF-ABCDEF1234567890',
  montant: '50000',
  frais: '500',
  montant_total: '50500',
  devise: 'GNF' as const,
  statut: 'COMPLETED' as const,
  motif: 'Aide familiale',
  confirmed_at: '2024-01-15T10:30:00Z',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  sender: { nom: 'DIALLO', prenom: 'Mamadou' },
  receiver: { nom: 'CAMARA', prenom: 'Fatoumata' },
}

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
    },
  })
}

function renderDetail(txId = mockTx.id) {
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={[`/transactions/${txId}`]}>
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

describe('TransactionDetail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche un indicateur de chargement', () => {
    vi.mocked(transactionsApi.get).mockReturnValue(new Promise(() => {}))
    renderDetail()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('affiche le montant formaté', async () => {
    vi.mocked(transactionsApi.get).mockResolvedValue({ data: mockTx } as any)
    renderDetail()
    await waitFor(() =>
      expect(document.body.textContent).toMatch(/50[\s  ]?000/),
    )
  })

  it('affiche la devise GNF', async () => {
    vi.mocked(transactionsApi.get).mockResolvedValue({ data: mockTx } as any)
    renderDetail()
    await waitFor(() =>
      expect(document.body.textContent).toMatch(/GNF/),
    )
  })

  it('affiche le statut de la transaction', async () => {
    vi.mocked(transactionsApi.get).mockResolvedValue({ data: mockTx } as any)
    renderDetail()
    // STATUS_LABELS['COMPLETED'] = 'Transfert confirmé' ; badge = 'Terminé'
    await waitFor(() =>
      expect(document.body.textContent).toMatch(/Terminé|Transfert confirmé/),
    )
  })

  it('affiche la référence complète', async () => {
    vi.mocked(transactionsApi.get).mockResolvedValue({ data: mockTx } as any)
    renderDetail()
    await waitFor(() =>
      expect(document.body.textContent).toContain('REF-ABCDEF1234567890'),
    )
  })

  it("affiche le prénom et le nom de l'expéditeur", async () => {
    vi.mocked(transactionsApi.get).mockResolvedValue({ data: mockTx } as any)
    renderDetail()
    await waitFor(() => {
      expect(document.body.textContent).toContain('Mamadou')
      expect(document.body.textContent).toContain('DIALLO')
    })
  })

  it('affiche le prénom et le nom du destinataire', async () => {
    vi.mocked(transactionsApi.get).mockResolvedValue({ data: mockTx } as any)
    renderDetail()
    await waitFor(() => {
      expect(document.body.textContent).toContain('Fatoumata')
      expect(document.body.textContent).toContain('CAMARA')
    })
  })

  it('affiche les frais non nuls', async () => {
    vi.mocked(transactionsApi.get).mockResolvedValue({ data: mockTx } as any)
    renderDetail()
    // frais = 500 → row is visible when Number(frais) > 0
    await waitFor(() =>
      expect(document.body.textContent).toMatch(/500/),
    )
  })

  it('affiche le montant total débité', async () => {
    vi.mocked(transactionsApi.get).mockResolvedValue({ data: mockTx } as any)
    renderDetail()
    await waitFor(() =>
      expect(document.body.textContent).toMatch(/50[\s  ]?500/),
    )
  })

  it('affiche le motif', async () => {
    vi.mocked(transactionsApi.get).mockResolvedValue({ data: mockTx } as any)
    renderDetail()
    await waitFor(() =>
      expect(screen.getAllByText('Aide familiale').length).toBeGreaterThan(0),
    )
  })

  it("affiche un message d'erreur générique sur erreur API", async () => {
    vi.mocked(transactionsApi.get).mockRejectedValue({ response: { status: 500 } })
    renderDetail()
    await waitFor(
      () =>
        expect(
          screen.getByText(/Impossible de charger la transaction/i),
        ).toBeInTheDocument(),
      { timeout: 10_000 },
    )
  })

  it("affiche 'Transaction introuvable' pour une réponse 404", async () => {
    vi.mocked(transactionsApi.get).mockRejectedValue({ response: { status: 404 } })
    renderDetail()
    await waitFor(
      () =>
        expect(
          screen.getByText(/Transaction introuvable/i),
        ).toBeInTheDocument(),
      { timeout: 5_000 },
    )
  })

  it('le bouton Copier inscrit la référence dans le presse-papiers', async () => {
    vi.mocked(transactionsApi.get).mockResolvedValue({ data: mockTx } as any)
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })
    renderDetail()
    const copyBtn = await screen.findByLabelText(/copier la référence/i)
    await userEvent.click(copyBtn)
    expect(writeText).toHaveBeenCalledWith('REF-ABCDEF1234567890')
  })

  it("le bouton 'Voir / imprimer le reçu' appelle window.print()", async () => {
    vi.mocked(transactionsApi.get).mockResolvedValue({ data: mockTx } as any)
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderDetail()
    const printBtn = await screen.findByText(/imprimer le reçu/i)
    await userEvent.click(printBtn)
    expect(printSpy).toHaveBeenCalledOnce()
    printSpy.mockRestore()
  })
})
