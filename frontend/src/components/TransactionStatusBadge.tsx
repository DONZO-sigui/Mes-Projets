import type { TransactionStatus } from '../types'

const BADGE_CLASS: Record<TransactionStatus, string> = {
  PENDING: 'bg-secondary',
  PROCESSING: 'bg-info text-dark',
  COMPLETED: 'bg-success',
  FAILED: 'bg-danger',
  CANCELLED: 'bg-warning text-dark',
  REVERSED: 'bg-dark',
}

export const STATUS_LABEL: Record<TransactionStatus, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En cours',
  COMPLETED: 'Terminé',
  FAILED: 'Échoué',
  CANCELLED: 'Annulé',
  REVERSED: 'Inversé',
}

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span className={`badge ${BADGE_CLASS[status]}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}
