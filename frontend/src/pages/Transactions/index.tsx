import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { transactionsApi } from '../../api/transactions.api'
import { walletsApi } from '../../api/wallets.api'
import { TransactionCard } from '../../components/TransactionCard'
import { TransactionStatusBadge } from '../../components/TransactionStatusBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import { EmptyState } from '../../components/EmptyState'
import { formatAmount, formatDate, truncateHash } from '../../utils/formatters'
import type { TransactionListParams, TransactionStatus, Devise } from '../../types'

const STATUS_OPTIONS: TransactionStatus[] = [
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED',
]

export default function Transactions() {
  const [params, setParams] = useState<TransactionListParams>({
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_dir: 'desc',
  })
  const [showFilters, setShowFilters] = useState(false)

  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletsApi.me().then((r) => r.data),
    staleTime: 60_000,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', params],
    queryFn: () => transactionsApi.list(params).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const set = <K extends keyof TransactionListParams>(
    key: K,
    value: TransactionListParams[K],
  ) => setParams((p) => ({ ...p, [key]: value, page: 1 }))

  const resetFilters = () =>
    setParams({ page: 1, limit: 20, sort_by: 'created_at', sort_dir: 'desc' })

  const totalPages = data ? Math.ceil(data.total / (params.limit ?? 20)) : 0
  const hasFilters =
    params.statut || params.devise || params.date_from || params.date_to

  return (
    <div>
      <h1 className="h4 fw-bold mb-4">Historique</h1>

      {/* Filter toggle + sort */}
      <div className="d-flex justify-content-between align-items-center mb-3 gap-2">
        <button
          className={`btn btn-sm ${hasFilters ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-controls="filter-panel"
        >
          <i className="bi bi-funnel me-1" aria-hidden="true" />
          Filtres
          {hasFilters && (
            <span className="badge bg-white text-primary ms-1 small">!</span>
          )}
        </button>

        <div className="d-flex gap-2 align-items-center">
          <span className="text-muted small d-none d-sm-inline">
            {data ? `${data.total} résultat${data.total !== 1 ? 's' : ''}` : ''}
          </span>
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={params.sort_by}
            onChange={(e) =>
              set(
                'sort_by',
                e.target.value as TransactionListParams['sort_by'],
              )
            }
            aria-label="Trier par"
          >
            <option value="created_at">Date</option>
            <option value="montant">Montant</option>
            <option value="statut">Statut</option>
          </select>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() =>
              set('sort_dir', params.sort_dir === 'asc' ? 'desc' : 'asc')
            }
            title={params.sort_dir === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
            aria-label={`Ordre ${params.sort_dir === 'asc' ? 'croissant' : 'décroissant'}, cliquer pour inverser`}
          >
            <i
              className={`bi bi-sort-${params.sort_dir === 'asc' ? 'up' : 'down'}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div id="filter-panel" className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-sm-6 col-md-3">
                <label className="form-label small fw-semibold">Statut</label>
                <select
                  className="form-select form-select-sm"
                  value={params.statut ?? ''}
                  onChange={(e) =>
                    set('statut', (e.target.value as TransactionStatus) || undefined)
                  }
                >
                  <option value="">Tous</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="col-sm-6 col-md-3">
                <label className="form-label small fw-semibold">Devise</label>
                <select
                  className="form-select form-select-sm"
                  value={params.devise ?? ''}
                  onChange={(e) =>
                    set('devise', (e.target.value as Devise) || undefined)
                  }
                >
                  <option value="">Toutes</option>
                  <option value="GNF">GNF</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="col-sm-6 col-md-3">
                <label className="form-label small fw-semibold">Du</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={params.date_from ?? ''}
                  onChange={(e) =>
                    set('date_from', e.target.value || undefined)
                  }
                />
              </div>
              <div className="col-sm-6 col-md-3">
                <label className="form-label small fw-semibold">Au</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={params.date_to ?? ''}
                  onChange={(e) =>
                    set('date_to', e.target.value || undefined)
                  }
                />
              </div>
            </div>
            {hasFilters && (
              <button
                className="btn btn-link btn-sm p-0 mt-3 text-muted"
                onClick={resetFilters}
              >
                <i className="bi bi-x-circle me-1" aria-hidden="true" />
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}

      {data && data.items.length === 0 && !isLoading && (
        <EmptyState
          icon="bi-arrow-left-right"
          title="Aucune transaction"
          description={hasFilters ? 'Essayez de modifier les filtres.' : 'Vos transferts apparaîtront ici.'}
        />
      )}

      {data && data.items.length > 0 && (
        <>
          {/* ── Mobile: cards cliquables ───────────────────────── */}
          <div className="card border-0 shadow-sm d-md-none">
            {data.items.map((tx) => (
              <Link
                key={tx.id}
                to={`/transactions/${tx.id}`}
                className="text-decoration-none text-reset d-block"
                aria-label={`Voir détail transaction ${tx.reference}`}
              >
                <TransactionCard
                  tx={tx}
                  walletId={walletQuery.data?.id}
                />
              </Link>
            ))}
          </div>

          {/* ── Desktop: table cliquable ───────────────────────── */}
          <div className="card border-0 shadow-sm d-none d-md-block">
            <div className="table-responsive">
              <table className="table table-hover mb-0" aria-label="Liste des transactions">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Référence</th>
                    <th scope="col">Montant</th>
                    <th scope="col">Statut</th>
                    <th scope="col">Motif</th>
                    <th scope="col">Date</th>
                    <th scope="col"><span className="visually-hidden">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((tx) => (
                    <tr
                      key={tx.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => window.location.assign(`/transactions/${tx.id}`)}
                    >
                      <td className="font-monospace small">
                        {truncateHash(tx.reference, 8)}
                      </td>
                      <td className="fw-medium">
                        {formatAmount(tx.montant, tx.devise)}
                      </td>
                      <td>
                        <TransactionStatusBadge status={tx.statut} />
                      </td>
                      <td className="text-muted small">{tx.motif ?? '—'}</td>
                      <td className="text-muted small">
                        {formatDate(tx.created_at)}
                      </td>
                      <td>
                        <Link
                          to={`/transactions/${tx.id}`}
                          className="btn btn-link btn-sm p-0 text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Détail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ─────────────────────────────────────── */}
          {totalPages > 1 && (
            <nav
              className="mt-4"
              aria-label="Pagination des transactions"
            >
              <ul className="pagination justify-content-center flex-wrap gap-1">
                <li
                  className={`page-item ${params.page === 1 ? 'disabled' : ''}`}
                >
                  <button
                    className="page-link"
                    onClick={() =>
                      setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))
                    }
                    disabled={params.page === 1}
                    aria-label="Page précédente"
                  >
                    <i className="bi bi-chevron-left" aria-hidden="true" />
                  </button>
                </li>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = i + 1
                  return (
                    <li
                      key={p}
                      className={`page-item ${params.page === p ? 'active' : ''}`}
                    >
                      <button
                        className="page-link"
                        onClick={() =>
                          setParams((prev) => ({ ...prev, page: p }))
                        }
                        aria-label={`Page ${p}`}
                        aria-current={params.page === p ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    </li>
                  )
                })}

                {totalPages > 7 && (
                  <li className="page-item disabled">
                    <span className="page-link">…</span>
                  </li>
                )}

                <li
                  className={`page-item ${params.page === totalPages ? 'disabled' : ''}`}
                >
                  <button
                    className="page-link"
                    onClick={() =>
                      setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))
                    }
                    disabled={params.page === totalPages}
                    aria-label="Page suivante"
                  >
                    <i className="bi bi-chevron-right" aria-hidden="true" />
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
