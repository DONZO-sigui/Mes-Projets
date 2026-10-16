import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '../../api/transactions.api'
import { TransactionStatusBadge } from '../../components/TransactionStatusBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { formatAmount, formatDate } from '../../utils/formatters'

// ─── Statut → libellé lisible ─────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Transfert confirmé',
  PENDING: 'Transfert en attente',
  PROCESSING: 'Transfert en cours',
  FAILED: 'Transfert échoué',
  CANCELLED: 'Transfert annulé',
  REVERSED: 'Transfert remboursé',
}

// ─── Bouton copier référence ───────────────────────────────────

function CopyReferenceButton({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(reference).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      className="btn btn-outline-secondary btn-sm"
      onClick={handleCopy}
      aria-label="Copier la référence"
    >
      {copied ? (
        <>
          <i className="bi bi-check-lg me-1 text-success" aria-hidden="true" />
          Copiée
        </>
      ) : (
        <>
          <i className="bi bi-clipboard me-1" aria-hidden="true" />
          Copier
        </>
      )}
    </button>
  )
}

// ─── Page principale ───────────────────────────────────────────

export default function TransactionDetail() {
  const { transactionId } = useParams<{ transactionId: string }>()
  const navigate = useNavigate()

  const { data: tx, isLoading, error } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => transactionsApi.get(transactionId!).then((r) => r.data),
    enabled: !!transactionId,
    retry: (count, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404 || status === 401) return false
      return count < 2
    },
  })

  const errStatus = (error as { response?: { status?: number } } | null)
    ?.response?.status

  return (
    <>
      {/* ── Styles d'impression ─────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #receipt-print, #receipt-print * { visibility: visible !important; }
          #receipt-print {
            position: fixed !important;
            top: 0; left: 0;
            width: 100%;
            padding: 2rem;
            background: white;
          }
        }
      `}</style>

      {/* ── Navigation ──────────────────────────────────────── */}
      <div className="d-flex align-items-center mb-4 gap-2 d-print-none">
        <button
          className="btn btn-link p-0 text-muted text-decoration-none"
          onClick={() => navigate(-1)}
          aria-label="Retour"
        >
          <i className="bi bi-arrow-left me-1" aria-hidden="true" />
          Retour
        </button>
        <h1 className="h5 fw-bold mb-0 ms-2">Détail de la transaction</h1>
      </div>

      {/* ── États ───────────────────────────────────────────── */}
      {isLoading && <LoadingSpinner />}

      {error && (
        <div className="alert alert-danger d-print-none" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
          {errStatus === 404
            ? 'Transaction introuvable.'
            : 'Impossible de charger la transaction.'}
          {errStatus !== 404 && (
            <button
              className="btn btn-link btn-sm p-0 ms-2"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </button>
          )}
        </div>
      )}

      {/* ── Détail ──────────────────────────────────────────── */}
      {tx && (
        <>
          {/* ── Statut + montant ──────────────────────────── */}
          <div className="text-center mb-4 d-print-none">
            <p className="text-muted small mb-1">
              {STATUS_LABELS[tx.statut] ?? tx.statut}
            </p>
            <div className="mb-2">
              <TransactionStatusBadge status={tx.statut} />
            </div>
            <p className="display-6 fw-bold text-primary mb-0">
              {formatAmount(tx.montant, tx.devise)}
            </p>
          </div>

          {/* ── Référence ─────────────────────────────────── */}
          <div className="card border-0 shadow-sm mb-3 d-print-none">
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted small mb-0">Référence</p>
                  <p className="font-monospace fw-bold mb-0">{tx.reference}</p>
                </div>
                <CopyReferenceButton reference={tx.reference} />
              </div>
            </div>
          </div>

          {/* ── Parties ───────────────────────────────────── */}
          <div className="card border-0 shadow-sm mb-3 d-print-none">
            <ul className="list-group list-group-flush rounded-3">
              <li className="list-group-item d-flex justify-content-between py-3">
                <span className="text-muted">Expéditeur</span>
                <span className="fw-medium">
                  {tx.sender.prenom} {tx.sender.nom}
                </span>
              </li>
              <li className="list-group-item d-flex justify-content-between py-3">
                <span className="text-muted">Destinataire</span>
                <span className="fw-medium">
                  {tx.receiver.prenom} {tx.receiver.nom}
                </span>
              </li>
            </ul>
          </div>

          {/* ── Résumé financier ──────────────────────────── */}
          <div className="card border-0 shadow-sm mb-3 d-print-none">
            <ul className="list-group list-group-flush rounded-3">
              <li className="list-group-item d-flex justify-content-between py-3">
                <span className="text-muted">Montant</span>
                <span className="fw-medium">
                  {formatAmount(tx.montant, tx.devise)}
                </span>
              </li>
              {Number(tx.frais) > 0 && (
                <li className="list-group-item d-flex justify-content-between py-3">
                  <span className="text-muted">Frais</span>
                  <span>{formatAmount(tx.frais, tx.devise)}</span>
                </li>
              )}
              <li className="list-group-item d-flex justify-content-between py-3">
                <span className="text-muted fw-semibold">Total débité</span>
                <span className="fw-bold">
                  {formatAmount(tx.montant_total, tx.devise)}
                </span>
              </li>
              <li className="list-group-item d-flex justify-content-between py-3">
                <span className="text-muted">Date</span>
                <span className="small">
                  {formatDate(tx.confirmed_at ?? tx.created_at)}
                </span>
              </li>
              {tx.motif && (
                <li className="list-group-item d-flex justify-content-between py-3">
                  <span className="text-muted">Motif</span>
                  <span className="ms-3 text-end">{tx.motif}</span>
                </li>
              )}
            </ul>
          </div>

          {/* ── Actions ───────────────────────────────────── */}
          <button
            className="btn btn-outline-secondary w-100 d-print-none"
            onClick={() => window.print()}
          >
            <i className="bi bi-printer me-2" aria-hidden="true" />
            Voir / imprimer le reçu
          </button>

          {/* ── REÇU IMPRIMABLE ───────────────────────────── */}
          <div id="receipt-print" className="d-none d-print-block">
            <div className="text-center mb-4">
              <h2 className="fw-bold fs-4">GNF-TOKEN</h2>
              <p className="text-muted small mb-0">REÇU DE TRANSFERT</p>
            </div>

            <div className="text-center mb-4">
              <span
                className={`badge fs-6 px-3 py-2 ${
                  tx.statut === 'COMPLETED'
                    ? 'bg-success'
                    : tx.statut === 'FAILED'
                      ? 'bg-danger'
                      : 'bg-warning text-dark'
                }`}
              >
                {STATUS_LABELS[tx.statut] ?? tx.statut}
              </span>
            </div>

            <table className="table table-borderless">
              <tbody>
                <tr>
                  <td className="text-muted">Référence</td>
                  <td className="fw-bold font-monospace">{tx.reference}</td>
                </tr>
                <tr>
                  <td className="text-muted">Date</td>
                  <td>{formatDate(tx.confirmed_at ?? tx.created_at)}</td>
                </tr>
                <tr>
                  <td className="text-muted">Expéditeur</td>
                  <td>{tx.sender.prenom} {tx.sender.nom}</td>
                </tr>
                <tr>
                  <td className="text-muted">Destinataire</td>
                  <td>{tx.receiver.prenom} {tx.receiver.nom}</td>
                </tr>
                <tr>
                  <td className="text-muted">Montant</td>
                  <td className="fw-bold">
                    {formatAmount(tx.montant, tx.devise)}
                  </td>
                </tr>
                {Number(tx.frais) > 0 && (
                  <tr>
                    <td className="text-muted">Frais</td>
                    <td>{formatAmount(tx.frais, tx.devise)}</td>
                  </tr>
                )}
                <tr>
                  <td className="text-muted fw-semibold">Total</td>
                  <td className="fw-bold">
                    {formatAmount(tx.montant_total, tx.devise)}
                  </td>
                </tr>
                {tx.motif && (
                  <tr>
                    <td className="text-muted">Motif</td>
                    <td>{tx.motif}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <p
              className="text-center text-muted mt-4"
              style={{ fontSize: '0.7rem' }}
            >
              GNF-Token — usage interne uniquement
            </p>
          </div>
        </>
      )}
    </>
  )
}
