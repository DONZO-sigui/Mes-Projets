import { useState, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionsApi } from '../../api/transactions.api'
import { beneficiariesApi } from '../../api/beneficiaries.api'
import { ErrorMessage } from '../../components/ErrorMessage'
import { TransactionStatusBadge } from '../../components/TransactionStatusBadge'
import { formatAmount, formatDate, truncateHash } from '../../utils/formatters'
import type { Transaction, Devise, Beneficiary } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'form' | 'confirm' | 'result'

interface FormState {
  receiver_wallet_id: string
  montant: string
  devise: Devise
  motif: string
}

const INITIAL_FORM: FormState = {
  receiver_wallet_id: '',
  montant: '',
  devise: 'GNF',
  motif: '',
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface FormErrors {
  receiver_wallet_id?: string
  montant?: string
  motif?: string
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {}

  if (!form.receiver_wallet_id.trim()) {
    errors.receiver_wallet_id = 'Identifiant du wallet destinataire obligatoire.'
  } else {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(form.receiver_wallet_id.trim())) {
      errors.receiver_wallet_id = 'Format invalide. Exemple : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    }
  }

  if (!form.montant.trim()) {
    errors.montant = 'Montant obligatoire.'
  } else {
    const n = Number(form.montant)
    if (isNaN(n) || n <= 0) {
      errors.montant = 'Le montant doit être supérieur à zéro.'
    }
    if (form.montant.includes('e') || form.montant.includes('E')) {
      errors.montant = 'Format de montant invalide.'
    }
  }

  if (form.motif.length > 250) {
    errors.motif = 'Le motif ne peut pas dépasser 250 caractères.'
  }

  return errors
}

// ─── Beneficiary quick-pick ───────────────────────────────────────────────────

function BeneficiaryQuickPick({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (walletId: string) => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['beneficiaries'],
    queryFn: () => beneficiariesApi.list().then((r) => r.data),
  })
  const [open, setOpen] = useState(false)

  if (isLoading || !data || data.total === 0) return null

  return (
    <div className="mb-4">
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-between"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>
          <i className="bi bi-people me-2" aria-hidden="true" />
          Choisir un bénéficiaire enregistré
        </span>
        <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="border rounded mt-2 overflow-auto" style={{ maxHeight: 220 }}>
          {data.items.map((b: Beneficiary) => (
            <button
              key={b.id}
              type="button"
              className={`w-100 text-start px-3 py-2 border-0 d-flex align-items-center gap-2 ${
                selected === b.wallet_id
                  ? 'bg-primary bg-opacity-10'
                  : 'bg-white'
              }`}
              onClick={() => {
                onSelect(b.wallet_id)
                setOpen(false)
              }}
            >
              <i className="bi bi-person-circle text-primary flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="fw-semibold small text-truncate">{b.name}</div>
                {b.nickname && (
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>{b.nickname}</div>
                )}
                <div className="font-monospace text-muted text-truncate" style={{ fontSize: '0.65rem' }}>
                  {b.wallet_id}
                </div>
              </div>
              {selected === b.wallet_id && (
                <i className="bi bi-check-lg text-primary ms-auto flex-shrink-0" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Step 1 : Form ────────────────────────────────────────────────────────────

function SendForm({
  form,
  onChange,
  onNext,
}: {
  form: FormState
  onChange: (f: FormState) => void
  onNext: (f: FormState) => void
}) {
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      onChange({ ...form, [field]: e.target.value })
      if (touched[field]) {
        const fresh = { ...form, [field]: e.target.value }
        setErrors(validateForm(fresh))
      }
    }

  const blur = (field: keyof FormState) => () => {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors(validateForm(form))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const allTouched: Partial<Record<keyof FormState, boolean>> = {
      receiver_wallet_id: true,
      montant: true,
      motif: true,
    }
    setTouched(allTouched)
    const errs = validateForm(form)
    setErrors(errs)
    if (Object.keys(errs).length === 0) {
      onNext(form)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Formulaire de transfert">
      {/* Destinataire */}
      <div className="mb-4">
        <label htmlFor="receiver_wallet_id" className="form-label fw-semibold">
          Wallet destinataire
          <span className="text-danger ms-1" aria-hidden="true">*</span>
        </label>
        <input
          id="receiver_wallet_id"
          type="text"
          className={`form-control form-control-lg font-monospace ${
            touched.receiver_wallet_id && errors.receiver_wallet_id ? 'is-invalid' : ''
          }`}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={form.receiver_wallet_id}
          onChange={set('receiver_wallet_id')}
          onBlur={blur('receiver_wallet_id')}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="receiver-help"
        />
        {touched.receiver_wallet_id && errors.receiver_wallet_id ? (
          <div id="receiver-error" className="invalid-feedback" role="alert">
            {errors.receiver_wallet_id}
          </div>
        ) : (
          <div id="receiver-help" className="form-text">
            Identifiant unique du portefeuille du destinataire.
          </div>
        )}
      </div>

      {/* Montant + Devise */}
      <div className="mb-4">
        <label htmlFor="montant" className="form-label fw-semibold">
          Montant
          <span className="text-danger ms-1" aria-hidden="true">*</span>
        </label>
        <div className="input-group input-group-lg">
          <input
            id="montant"
            type="text"
            inputMode="decimal"
            className={`form-control ${
              touched.montant && errors.montant ? 'is-invalid' : ''
            }`}
            placeholder="0"
            value={form.montant}
            onChange={set('montant')}
            onBlur={blur('montant')}
            aria-describedby="montant-help"
          />
          <select
            className="input-group-text form-select"
            style={{ maxWidth: 100 }}
            value={form.devise}
            onChange={set('devise')}
            aria-label="Devise"
          >
            <option value="GNF">GNF</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
          {touched.montant && errors.montant && (
            <div className="invalid-feedback" role="alert">
              {errors.montant}
            </div>
          )}
        </div>
        <div id="montant-help" className="form-text">
          Le montant exact sera validé par le serveur. La validation frontend ne garantit pas le transfert.
        </div>
      </div>

      {/* Motif */}
      <div className="mb-4">
        <label htmlFor="motif" className="form-label fw-semibold">
          Motif <span className="text-muted fw-normal">(optionnel)</span>
        </label>
        <textarea
          id="motif"
          className={`form-control ${
            touched.motif && errors.motif ? 'is-invalid' : ''
          }`}
          placeholder="Aide familiale, loyer…"
          rows={2}
          maxLength={250}
          value={form.motif}
          onChange={set('motif')}
          onBlur={blur('motif')}
          aria-describedby="motif-counter"
        />
        {touched.motif && errors.motif ? (
          <div className="invalid-feedback" role="alert">
            {errors.motif}
          </div>
        ) : (
          <div id="motif-counter" className="form-text text-end">
            {form.motif.length} / 250
          </div>
        )}
      </div>

      <button type="submit" className="btn btn-primary btn-lg w-100">
        <i className="bi bi-arrow-right me-2" aria-hidden="true" />
        Continuer
      </button>
    </form>
  )
}

// ─── Step 2 : Confirm ─────────────────────────────────────────────────────────

function ConfirmTransfer({
  form,
  onConfirm,
  onBack,
  isLoading,
  error,
}: {
  form: FormState
  onConfirm: () => void
  onBack: () => void
  isLoading: boolean
  error: unknown
}) {
  return (
    <div>
      <h2 className="h5 fw-bold mb-4">
        <i className="bi bi-check2-circle text-primary me-2" aria-hidden="true" />
        Vérifier le transfert
      </h2>

      <div className="card border-0 shadow-sm mb-4">
        <ul className="list-group list-group-flush rounded-3">
          <li className="list-group-item d-flex justify-content-between py-3">
            <span className="text-muted">Destinataire</span>
            <span className="font-monospace small text-end ms-3 text-break">
              {form.receiver_wallet_id}
            </span>
          </li>
          <li className="list-group-item d-flex justify-content-between py-3">
            <span className="text-muted">Montant</span>
            <span className="fw-bold text-primary">
              {formatAmount(form.montant, form.devise)}
            </span>
          </li>
          <li className="list-group-item d-flex justify-content-between py-3">
            <span className="text-muted">Frais</span>
            <span className="text-muted">0 {form.devise}</span>
          </li>
          <li className="list-group-item d-flex justify-content-between py-3">
            <span className="text-muted fw-semibold">Total débité</span>
            <span className="fw-bold fs-6">
              {formatAmount(form.montant, form.devise)}
            </span>
          </li>
          {form.motif && (
            <li className="list-group-item d-flex justify-content-between py-3">
              <span className="text-muted">Motif</span>
              <span className="ms-3 text-end">{form.motif}</span>
            </li>
          )}
        </ul>
      </div>

      {error !== null && <ErrorMessage error={error} className="mb-3" />}

      <div className="d-grid gap-2">
        <button
          className="btn btn-primary btn-lg"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
              Envoi en cours…
            </>
          ) : (
            <>
              <i className="bi bi-send me-2" aria-hidden="true" />
              Confirmer l'envoi
            </>
          )}
        </button>
        <button
          className="btn btn-outline-secondary btn-lg"
          onClick={onBack}
          disabled={isLoading}
        >
          Modifier
        </button>
      </div>
    </div>
  )
}

// ─── Step 3 : Result ──────────────────────────────────────────────────────────

function TransferResult({
  tx,
  onDone,
  onNew,
}: {
  tx: Transaction
  onDone: () => void
  onNew: () => void
}) {
  const succeeded = tx.statut === 'COMPLETED' || tx.statut === 'PENDING' || tx.statut === 'PROCESSING'

  return (
    <div className="text-center">
      <div className="mb-4">
        {succeeded ? (
          <i
            className="bi bi-check-circle-fill text-success"
            style={{ fontSize: '4rem' }}
            aria-hidden="true"
          />
        ) : (
          <i
            className="bi bi-x-circle-fill text-danger"
            style={{ fontSize: '4rem' }}
            aria-hidden="true"
          />
        )}
      </div>

      <h2 className="h4 fw-bold mb-1">
        {succeeded ? 'Transfert initié' : 'Transfert échoué'}
      </h2>
      <div className="mb-4">
        <TransactionStatusBadge status={tx.statut} />
      </div>

      <div className="card border-0 shadow-sm mb-4 text-start">
        <ul className="list-group list-group-flush rounded-3">
          <li className="list-group-item d-flex justify-content-between py-3">
            <span className="text-muted">Référence</span>
            <span className="font-monospace small">{truncateHash(tx.reference, 8)}</span>
          </li>
          <li className="list-group-item d-flex justify-content-between py-3">
            <span className="text-muted">Montant</span>
            <span className="fw-bold text-primary">
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
            <span className="text-muted">Date</span>
            <span className="small">{formatDate(tx.confirmed_at ?? tx.created_at)}</span>
          </li>
          {tx.motif && (
            <li className="list-group-item d-flex justify-content-between py-3">
              <span className="text-muted">Motif</span>
              <span className="ms-3 text-end">{tx.motif}</span>
            </li>
          )}
        </ul>
      </div>

      <div className="d-grid gap-2">
        {succeeded && (
          <Link
            to={`/transactions/${tx.id}`}
            className="btn btn-outline-primary btn-lg"
          >
            <i className="bi bi-receipt me-2" aria-hidden="true" />
            Voir le détail
          </Link>
        )}
        <button className="btn btn-primary btn-lg" onClick={onDone}>
          <i className="bi bi-house me-2" aria-hidden="true" />
          Retour au tableau de bord
        </button>
        <button className="btn btn-outline-secondary" onClick={onNew}>
          <i className="bi bi-send me-2" aria-hidden="true" />
          Nouveau transfert
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Send() {
  const location = useLocation()
  const prefill = (location.state as { receiver_wallet_id?: string } | null)
    ?.receiver_wallet_id ?? ''

  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM, receiver_wallet_id: prefill })
  const [result, setResult] = useState<Transaction | null>(null)
  // Idempotency key is generated once when entering 'confirm' step
  const idempotencyKeyRef = useRef<string | null>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => {
      const key = idempotencyKeyRef.current!
      return transactionsApi
        .transfer(
          {
            receiver_wallet_id: form.receiver_wallet_id.trim(),
            montant: form.montant.trim(),
            devise: form.devise,
            motif: form.motif.trim() || undefined,
          },
          key,
        )
        .then((r) => r.data)
    },
    onSuccess: (tx) => {
      setResult(tx)
      setStep('result')
      setSubmitError(null)
      // Invalidate wallet + transactions so server data is refreshed
      void queryClient.invalidateQueries({ queryKey: ['wallet'] })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (err) => {
      setSubmitError(err)
    },
  })

  const handleGoToConfirm = (data: FormState) => {
    setForm(data)
    // Generate a fresh key for each NEW logical transfer
    idempotencyKeyRef.current = crypto.randomUUID()
    setSubmitError(null)
    mutation.reset()
    setStep('confirm')
  }

  const handleConfirm = () => {
    mutation.mutate()
  }

  const handleBackToForm = () => {
    mutation.reset()
    setSubmitError(null)
    setStep('form')
  }

  const handleNewTransfer = () => {
    setForm(INITIAL_FORM)
    idempotencyKeyRef.current = null
    setResult(null)
    setSubmitError(null)
    mutation.reset()
    setStep('form')
  }

  return (
    <div>
      {/* Breadcrumb progress */}
      {step !== 'result' && (
        <div className="d-flex align-items-center mb-4 gap-2">
          <button
            className="btn btn-link p-0 text-muted text-decoration-none"
            onClick={() => (step === 'confirm' ? handleBackToForm() : navigate(-1))}
            aria-label="Retour"
          >
            <i className="bi bi-arrow-left me-1" aria-hidden="true" />
            Retour
          </button>
          <h1 className="h5 fw-bold mb-0 ms-2">
            {step === 'form' ? "Envoyer de l'argent" : 'Confirmation'}
          </h1>
        </div>
      )}

      {step === 'form' && (
        <>
          <BeneficiaryQuickPick
            selected={form.receiver_wallet_id}
            onSelect={(walletId) =>
              setForm((f) => ({ ...f, receiver_wallet_id: walletId }))
            }
          />
          <SendForm form={form} onChange={setForm} onNext={handleGoToConfirm} />
        </>
      )}

      {step === 'confirm' && (
        <ConfirmTransfer
          form={form}
          onConfirm={handleConfirm}
          onBack={handleBackToForm}
          isLoading={mutation.isPending}
          error={submitError}
        />
      )}

      {step === 'result' && result !== null && (
        <TransferResult
          tx={result}
          onDone={() => navigate('/dashboard')}
          onNew={handleNewTransfer}
        />
      )}
    </div>
  )
}
