import type { Transaction } from '../types'
import { formatAmount, formatDate, truncateHash } from '../utils/formatters'
import { TransactionStatusBadge } from './TransactionStatusBadge'

interface Props {
  tx: Transaction
  walletId?: string
}

export function TransactionCard({ tx, walletId }: Props) {
  const isOutgoing = walletId ? tx.sender_wallet_id === walletId : false
  const isIncoming = walletId ? tx.receiver_wallet_id === walletId : false
  const sign = isOutgoing ? '-' : isIncoming ? '+' : ''
  const amountClass = isOutgoing
    ? 'text-danger'
    : isIncoming
      ? 'text-success'
      : 'text-body'

  return (
    <div className="d-flex align-items-center gap-3 p-3 border-bottom">
      {/* Direction icon */}
      <div
        className={`d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 ${
          isOutgoing
            ? 'bg-danger bg-opacity-10 text-danger'
            : isIncoming
              ? 'bg-success bg-opacity-10 text-success'
              : 'bg-secondary bg-opacity-10 text-secondary'
        }`}
        style={{ width: 40, height: 40 }}
        aria-hidden="true"
      >
        <i
          className={`bi ${isOutgoing ? 'bi-arrow-up-right' : isIncoming ? 'bi-arrow-down-left' : 'bi-arrow-left-right'}`}
        />
      </div>

      {/* Main content */}
      <div className="flex-grow-1 min-w-0">
        <div className="d-flex justify-content-between align-items-start">
          <span className="fw-medium text-truncate small me-2">
            {tx.motif ?? <span className="text-muted">Sans motif</span>}
          </span>
          <span className={`fw-bold small flex-shrink-0 ${amountClass}`}>
            {sign}{formatAmount(tx.montant, tx.devise)}
          </span>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-1">
          <div className="d-flex align-items-center gap-2">
            <TransactionStatusBadge status={tx.statut} />
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>
              {truncateHash(tx.reference, 6)}
            </span>
          </div>
          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
            {formatDate(tx.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
