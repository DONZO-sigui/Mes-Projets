import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Wallet } from '../types'
import { formatAmount } from '../utils/formatters'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'
import { walletsApi } from '../api/wallets.api'

interface Props {
  wallet?: Wallet
  isLoading?: boolean
  error?: unknown
  onSend?: () => void
}

const PRESET_AMOUNTS = [500_000, 1_000_000, 5_000_000]

export function BalanceCard({ wallet, isLoading, error, onSend }: Props) {
  const [hidden, setHidden] = useState(false)
  const [showTopUp, setShowTopUp] = useState(false)
  const [customAmount, setCustomAmount] = useState('1000000')
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const depositMutation = useMutation({
    mutationFn: (amount: number) => walletsApi.deposit(amount),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      setTopUpSuccess(`Compte rechargé avec succès de ${formatAmount(customAmount, wallet?.devise ?? 'GNF')} !`)
      setTimeout(() => {
        setShowTopUp(false)
        setTopUpSuccess(null)
      }, 2000)
    },
  })

  const handleDeposit = (amount: number) => {
    depositMutation.mutate(amount)
  }

  return (
    <>
      <div className="card border-0 shadow-sm text-white bg-primary rounded-4">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <p className="mb-0 small opacity-75 text-uppercase fw-semibold tracking-wide">
                Solde disponible
              </p>
              <p className="mb-0 small opacity-75">{wallet?.devise ?? 'GNF'}</p>
            </div>
            <button
              className="btn btn-link text-white p-0 opacity-75"
              onClick={() => setHidden((h) => !h)}
              aria-label={hidden ? 'Afficher le solde' : 'Masquer le solde'}
            >
              <i
                className={`bi ${hidden ? 'bi-eye' : 'bi-eye-slash'} fs-5`}
                aria-hidden="true"
              />
            </button>
          </div>

          {isLoading && (
            <div className="py-2">
              <LoadingSpinner size="sm" label="Chargement du solde…" />
            </div>
          )}
          {error != null && !isLoading ? (
            <ErrorMessage
              error={error}
              className="mt-2 bg-white bg-opacity-25 border-0 text-white"
            />
          ) : null}
          {wallet && !isLoading && (
            <p
              className="display-6 fw-bold mb-0"
              aria-label={`Solde : ${formatAmount(wallet.solde, wallet.devise)}`}
            >
              {hidden
                ? '••••••'
                : formatAmount(wallet.solde, wallet.devise)}
            </p>
          )}

          {wallet?.statut === 'ACTIVE' && (
            <div className="mt-4 d-flex flex-wrap gap-2">
              {onSend && (
                <button
                  className="btn btn-light btn-sm fw-semibold px-4"
                  onClick={onSend}
                  aria-label="Envoyer de l'argent"
                >
                  <i className="bi bi-send me-2" aria-hidden="true" />
                  Envoyer
                </button>
              )}
              <button
                className="btn btn-outline-light btn-sm fw-semibold px-4"
                onClick={() => setShowTopUp(true)}
                aria-label="Recharger le compte"
              >
                <i className="bi bi-plus-circle me-2" aria-hidden="true" />
                Recharger
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de Rechargement ── */}
      {showTopUp && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 p-2">
              <div className="modal-header border-0 pb-0">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-3">
                    <i className="bi bi-wallet2 fs-5" />
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold mb-0">Recharger mon compte</h5>
                    <p className="text-muted small mb-0">Crédit immédiat de démonstration</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowTopUp(false)}
                  disabled={depositMutation.isPending}
                  aria-label="Fermer"
                />
              </div>

              <div className="modal-body py-3">
                {topUpSuccess && (
                  <div className="alert alert-success d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-check-circle-fill fs-5" />
                    <span className="small fw-semibold">{topUpSuccess}</span>
                  </div>
                )}

                {depositMutation.error && (
                  <ErrorMessage error={depositMutation.error} className="mb-3" />
                )}

                <label className="form-label text-muted small fw-semibold">
                  Montants rapides prédéfinis :
                </label>
                <div className="d-flex gap-2 mb-3">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`btn btn-sm flex-fill ${
                        customAmount === String(amt)
                          ? 'btn-primary'
                          : 'btn-outline-secondary'
                      }`}
                      onClick={() => setCustomAmount(String(amt))}
                      disabled={depositMutation.isPending}
                    >
                      +{(amt / 1000).toLocaleString()} k FG
                    </button>
                  ))}
                </div>

                <div className="mb-3">
                  <label htmlFor="topup-amount" className="form-label small fw-semibold">
                    Montant personnalisé (GNF) :
                  </label>
                  <div className="input-group">
                    <input
                      id="topup-amount"
                      type="number"
                      min="1000"
                      step="1000"
                      className="form-control"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      disabled={depositMutation.isPending}
                    />
                    <span className="input-group-text bg-light text-muted">GNF</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setShowTopUp(false)}
                  disabled={depositMutation.isPending}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-primary px-4"
                  onClick={() => handleDeposit(Number(customAmount))}
                  disabled={
                    depositMutation.isPending ||
                    !customAmount ||
                    Number(customAmount) <= 0
                  }
                >
                  {depositMutation.isPending ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Crédit en cours…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle me-2" />
                      Valider le crédit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
