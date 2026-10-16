import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { walletsApi } from '../../api/wallets.api'
import { transactionsApi } from '../../api/transactions.api'
import { notificationsApi } from '../../api/notifications.api'
import { BalanceCard } from '../../components/BalanceCard'
import { TransactionCard } from '../../components/TransactionCard'
import { TransactionStatusBadge } from '../../components/TransactionStatusBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import { EmptyState } from '../../components/EmptyState'
import { formatAmount, formatDate } from '../../utils/formatters'

const NOTIF_ICONS: Record<string, string> = {
  TRANSFER_COMPLETED: 'bi-check-circle-fill text-success',
  TRANSFER_RECEIVED: 'bi-arrow-down-circle-fill text-success',
  TRANSFER_FAILED: 'bi-x-circle-fill text-danger',
  PASSWORD_CHANGED: 'bi-shield-lock-fill text-warning',
  SESSION_REVOKED: 'bi-door-open-fill text-warning',
  SECURITY_ALERT: 'bi-exclamation-triangle-fill text-danger',
  BENEFICIARY_CREATED: 'bi-person-plus-fill text-primary',
  BENEFICIARY_DELETED: 'bi-person-dash-fill text-secondary',
  ACCOUNT_UPDATED: 'bi-person-check-fill text-info',
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletsApi.me().then((r) => r.data),
  })

  const txQuery = useQuery({
    queryKey: ['transactions', { page: 1, limit: 5 }],
    queryFn: () =>
      transactionsApi.list({ page: 1, limit: 5 }).then((r) => r.data),
  })

  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(1, 3).then((r) => r.data),
  })

  return (
    <div>
      {/* Salutation */}
      <h1 className="h4 fw-bold mb-4">
        Bonjour, {user?.first_name} 👋
      </h1>

      {/* Balance card */}
      <div className="mb-4">
        <BalanceCard
          wallet={walletQuery.data}
          isLoading={walletQuery.isLoading}
          error={walletQuery.error}
          onSend={() => navigate('/send')}
        />
      </div>

      {/* Wallet inactive warning */}
      {walletQuery.data?.statut !== 'ACTIVE' && !walletQuery.isLoading && walletQuery.data && (
        <div className="alert alert-warning d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
          <span>Votre portefeuille est <strong>{walletQuery.data.statut}</strong>. Contactez le support.</span>
        </div>
      )}

      {/* Quick actions */}
      <div className="row g-3 mb-4">
        <div className="col-6">
          <Link
            to="/send"
            className="btn btn-primary w-100 py-3 d-flex flex-column align-items-center gap-1"
          >
            <i className="bi bi-send fs-4" aria-hidden="true" />
            <span className="small fw-semibold">Envoyer</span>
          </Link>
        </div>
        <div className="col-6">
          <Link
            to="/transactions"
            className="btn btn-outline-primary w-100 py-3 d-flex flex-column align-items-center gap-1"
          >
            <i className="bi bi-clock-history fs-4" aria-hidden="true" />
            <span className="small fw-semibold">Historique</span>
          </Link>
        </div>
      </div>

      {/* Recent notifications */}
      {notifQuery.data && notifQuery.data.items.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-transparent d-flex justify-content-between align-items-center py-3">
            <h2 className="h6 mb-0 fw-semibold">
              Notifications récentes
              {notifQuery.data.unread_count > 0 && (
                <span className="badge bg-danger ms-2" style={{ fontSize: '0.65rem' }}>
                  {notifQuery.data.unread_count}
                </span>
              )}
            </h2>
            <Link to="/notifications" className="btn btn-link btn-sm p-0 small">
              Voir tout
            </Link>
          </div>
          <ul className="list-group list-group-flush">
            {notifQuery.data.items.map((n) => (
              <li
                key={n.id}
                className={`list-group-item d-flex gap-3 py-2 ${n.is_read ? '' : 'bg-primary bg-opacity-10'}`}
              >
                <i
                  className={`bi ${NOTIF_ICONS[n.type] ?? 'bi-bell text-secondary'} mt-1`}
                  aria-hidden="true"
                />
                <div className="flex-grow-1 min-w-0">
                  <p className="mb-0 small fw-semibold">{n.title}</p>
                  <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>{n.message}</p>
                </div>
                <span className="text-muted text-nowrap" style={{ fontSize: '0.65rem' }}>
                  {formatDate(n.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent transactions */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent d-flex justify-content-between align-items-center py-3">
          <h2 className="h6 mb-0 fw-semibold">
            Dernières transactions
          </h2>
          <Link to="/transactions" className="btn btn-link btn-sm p-0 small">
            Voir tout
          </Link>
        </div>

        {txQuery.isLoading && <LoadingSpinner size="sm" />}
        {txQuery.error && <ErrorMessage error={txQuery.error} className="m-3" />}

        {txQuery.data?.items.length === 0 && !txQuery.isLoading && (
          <EmptyState
            icon="bi-arrow-left-right"
            title="Aucune transaction"
            description="Vos transferts apparaîtront ici."
          />
        )}

        {/* Mobile: TransactionCard cliquable */}
        {txQuery.data && txQuery.data.items.length > 0 && (
          <>
            <div className="d-md-none">
              {txQuery.data.items.map((tx) => (
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

            {/* Desktop: compact list cliquable */}
            <ul className="d-none d-md-block list-group list-group-flush">
              {txQuery.data.items.map((tx) => (
                <li
                  key={tx.id}
                  className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3"
                >
                  <Link
                    to={`/transactions/${tx.id}`}
                    className="d-flex justify-content-between align-items-center w-100 text-decoration-none text-reset"
                  >
                    <div>
                      <span className="fw-medium small me-2">
                        {tx.motif ?? <span className="text-muted">Sans motif</span>}
                      </span>
                      <TransactionStatusBadge status={tx.statut} />
                    </div>
                    <div className="text-end ms-3">
                      <div className="fw-bold small text-primary">
                        {formatAmount(tx.montant, tx.devise)}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {formatDate(tx.created_at)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
