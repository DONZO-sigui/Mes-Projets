import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { notificationsApi } from '../../api/notifications.api'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import { EmptyState } from '../../components/EmptyState'
import { formatDate } from '../../utils/formatters'
import type { Notification } from '../../types'

const TRANSFER_TYPES = new Set([
  'TRANSFER_COMPLETED',
  'TRANSFER_RECEIVED',
  'TRANSFER_FAILED',
])

const TYPE_ICONS: Record<string, string> = {
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

function NotificationItem({
  notif,
  onMarkRead,
}: {
  notif: Notification
  onMarkRead: (id: string) => void
}) {
  const icon = TYPE_ICONS[notif.type] ?? 'bi-bell-fill text-secondary'

  return (
    <div
      className={`list-group-item list-group-item-action d-flex gap-3 py-3 ${
        notif.is_read ? '' : 'bg-primary bg-opacity-10'
      }`}
    >
      <div className="flex-shrink-0 pt-1">
        <i className={`bi ${icon} fs-5`} aria-hidden="true" />
      </div>
      <div className="flex-grow-1 min-w-0">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <p className="mb-0 fw-semibold small">{notif.title}</p>
          <span className="text-muted text-nowrap" style={{ fontSize: '0.7rem' }}>
            {formatDate(notif.created_at)}
          </span>
        </div>
        <p className="mb-0 text-muted small">{notif.message}</p>
      </div>
      <div className="flex-shrink-0 d-flex flex-column gap-1">
        {TRANSFER_TYPES.has(notif.type) &&
          typeof notif.metadata?.transaction_id === 'string' && (
          <Link
            to={`/transactions/${notif.metadata.transaction_id}`}
            className="btn btn-link btn-sm p-0 text-secondary"
            title="Voir la transaction"
            aria-label="Voir le détail de la transaction"
          >
            <i className="bi bi-arrow-right-circle" aria-hidden="true" />
          </Link>
        )}
        {!notif.is_read && (
          <button
            className="btn btn-link btn-sm p-0 text-primary"
            title="Marquer comme lue"
            onClick={() => onMarkRead(notif.id)}
          >
            <i className="bi bi-check2" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function Notifications() {
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(1, 50).then((r) => r.data),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold mb-0">Notifications</h1>
        {(data?.unread_count ?? 0) > 0 && (
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            <i className="bi bi-check2-all me-1" aria-hidden="true" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {data && data.unread_count > 0 && (
        <p className="text-muted small mb-3">
          {data.unread_count} notification{data.unread_count > 1 ? 's' : ''} non lue
          {data.unread_count > 1 ? 's' : ''}
        </p>
      )}

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}

      {data?.items.length === 0 && !isLoading && (
        <EmptyState
          icon="bi-bell-slash"
          title="Aucune notification"
          description="Vos alertes de sécurité et activités apparaîtront ici."
        />
      )}

      {data && data.items.length > 0 && (
        <div className="list-group shadow-sm">
          {data.items.map((notif) => (
            <NotificationItem
              key={notif.id}
              notif={notif}
              onMarkRead={(id) => markRead.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
