import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { beneficiariesApi } from '../../api/beneficiaries.api'
import { EmptyState } from '../../components/EmptyState'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import type { Beneficiary, BeneficiaryCreate, BeneficiaryUpdate } from '../../types'

// ─── UUID regex ───────────────────────────────────────────────
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── BeneficiaryForm (create / edit) ─────────────────────────

interface FormState {
  wallet_id: string
  name: string
  nickname: string
}

interface FormErrors {
  wallet_id?: string
  name?: string
  nickname?: string
}

function validateForm(
  form: FormState,
  isEdit: boolean,
): FormErrors {
  const errors: FormErrors = {}
  if (!isEdit) {
    if (!form.wallet_id.trim()) {
      errors.wallet_id = 'Identifiant du wallet obligatoire.'
    } else if (!UUID_RE.test(form.wallet_id.trim())) {
      errors.wallet_id =
        'Format invalide. Exemple : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    }
  }
  if (!form.name.trim()) {
    errors.name = 'Le nom est obligatoire.'
  } else if (form.name.trim().length > 100) {
    errors.name = 'Le nom ne peut pas dépasser 100 caractères.'
  }
  if (form.nickname.length > 50) {
    errors.nickname = 'Le surnom ne peut pas dépasser 50 caractères.'
  }
  return errors
}

function BeneficiaryForm({
  initial,
  isEdit,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: {
  initial: FormState
  isEdit: boolean
  onSubmit: (f: FormState) => void
  onCancel: () => void
  isLoading: boolean
  error: unknown
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      if (touched[field]) {
        const fresh = { ...form, [field]: e.target.value }
        setErrors(validateForm(fresh, isEdit))
      }
    }

  const blur = (field: keyof FormState) => () => {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors(validateForm(form, isEdit))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ wallet_id: true, name: true, nickname: true })
    const errs = validateForm(form, isEdit)
    setErrors(errs)
    if (Object.keys(errs).length === 0) {
      onSubmit(form)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {!isEdit && (
        <div className="mb-3">
          <label htmlFor="bf-wallet" className="form-label fw-semibold">
            Wallet du destinataire
            <span className="text-danger ms-1" aria-hidden="true">*</span>
          </label>
          <input
            id="bf-wallet"
            type="text"
            className={`form-control font-monospace ${
              touched.wallet_id && errors.wallet_id ? 'is-invalid' : ''
            }`}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={form.wallet_id}
            onChange={set('wallet_id')}
            onBlur={blur('wallet_id')}
            autoComplete="off"
            spellCheck={false}
          />
          {touched.wallet_id && errors.wallet_id ? (
            <div className="invalid-feedback">{errors.wallet_id}</div>
          ) : (
            <div className="form-text">
              Identifiant unique du portefeuille du destinataire.
            </div>
          )}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="bf-name" className="form-label fw-semibold">
          Nom
          <span className="text-danger ms-1" aria-hidden="true">*</span>
        </label>
        <input
          id="bf-name"
          type="text"
          className={`form-control ${
            touched.name && errors.name ? 'is-invalid' : ''
          }`}
          placeholder="Mamadou Diallo"
          value={form.name}
          onChange={set('name')}
          onBlur={blur('name')}
          maxLength={100}
        />
        {touched.name && errors.name && (
          <div className="invalid-feedback">{errors.name}</div>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="bf-nickname" className="form-label fw-semibold">
          Surnom{' '}
          <span className="text-muted fw-normal">(optionnel)</span>
        </label>
        <input
          id="bf-nickname"
          type="text"
          className={`form-control ${
            touched.nickname && errors.nickname ? 'is-invalid' : ''
          }`}
          placeholder="Frère, Maman…"
          value={form.nickname}
          onChange={set('nickname')}
          onBlur={blur('nickname')}
          maxLength={50}
        />
        {touched.nickname && errors.nickname && (
          <div className="invalid-feedback">{errors.nickname}</div>
        )}
      </div>

      {error != null && <ErrorMessage error={error} className="mb-3" />}

      <div className="d-grid gap-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
              Enregistrement…
            </>
          ) : isEdit ? (
            'Enregistrer les modifications'
          ) : (
            'Ajouter le bénéficiaire'
          )}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Annuler
        </button>
      </div>
    </form>
  )
}

// ─── DeleteConfirm modal (inline) ────────────────────────────

function DeleteConfirm({
  beneficiary,
  onConfirm,
  onCancel,
  isLoading,
}: {
  beneficiary: Beneficiary
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}) {
  return (
    <div className="card border-danger shadow-sm">
      <div className="card-body">
        <h6 className="card-title text-danger fw-bold">
          <i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />
          Supprimer ce bénéficiaire ?
        </h6>
        <p className="card-text small text-muted mb-1">
          <strong>{beneficiary.name}</strong>
          {beneficiary.nickname ? ` — ${beneficiary.nickname}` : ''}
        </p>
        <p className="card-text small text-muted mb-3">
          Cette action supprimera uniquement le bénéficiaire enregistré.
          Elle ne supprimera aucune transaction.
        </p>
        <div className="d-flex gap-2">
          <button
            className="btn btn-danger btn-sm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            ) : (
              'Supprimer'
            )}
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── BeneficiaryCard ─────────────────────────────────────────

function BeneficiaryCard({
  beneficiary,
  onEdit,
  onDelete,
  onSend,
}: {
  beneficiary: Beneficiary
  onEdit: (b: Beneficiary) => void
  onDelete: (b: Beneficiary) => void
  onSend: (b: Beneficiary) => void
}) {
  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body d-flex align-items-center gap-3 py-3">
        <div
          className="d-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary flex-shrink-0"
          style={{ width: 44, height: 44 }}
          aria-hidden="true"
        >
          <i className="bi bi-person fs-5" />
        </div>
        <div className="flex-grow-1 min-w-0">
          <div className="fw-semibold text-truncate">{beneficiary.name}</div>
          {beneficiary.nickname && (
            <div className="small text-muted text-truncate">
              {beneficiary.nickname}
            </div>
          )}
          <div className="font-monospace text-muted small text-truncate">
            {beneficiary.wallet_id}
          </div>
        </div>
        <div className="d-flex flex-column gap-1 flex-shrink-0">
          <button
            className="btn btn-sm btn-primary"
            onClick={() => onSend(beneficiary)}
            aria-label={`Envoyer à ${beneficiary.name}`}
          >
            <i className="bi bi-send me-1" aria-hidden="true" />
            <span className="d-none d-sm-inline">Envoyer</span>
          </button>
          <div className="d-flex gap-1">
            <button
              className="btn btn-sm btn-outline-secondary flex-fill"
              onClick={() => onEdit(beneficiary)}
              aria-label={`Modifier ${beneficiary.name}`}
            >
              <i className="bi bi-pencil" aria-hidden="true" />
            </button>
            <button
              className="btn btn-sm btn-outline-danger flex-fill"
              onClick={() => onDelete(beneficiary)}
              aria-label={`Supprimer ${beneficiary.name}`}
            >
              <i className="bi bi-trash" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────

type View =
  | { kind: 'list' }
  | { kind: 'add' }
  | { kind: 'edit'; beneficiary: Beneficiary }
  | { kind: 'delete'; beneficiary: Beneficiary }

export default function Beneficiaries() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>({ kind: 'list' })
  const [mutationError, setMutationError] = useState<unknown>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['beneficiaries'],
    queryFn: () => beneficiariesApi.list().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (payload: BeneficiaryCreate) =>
      beneficiariesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['beneficiaries'] })
      setView({ kind: 'list' })
      setMutationError(null)
    },
    onError: (err) => setMutationError(err),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: BeneficiaryUpdate
    }) => beneficiariesApi.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['beneficiaries'] })
      setView({ kind: 'list' })
      setMutationError(null)
    },
    onError: (err) => setMutationError(err),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => beneficiariesApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['beneficiaries'] })
      setView({ kind: 'list' })
      setMutationError(null)
    },
    onError: (err) => setMutationError(err),
  })

  const handleAdd = (form: FormState) => {
    setMutationError(null)
    createMutation.mutate({
      wallet_id: form.wallet_id.trim(),
      name: form.name.trim(),
      nickname: form.nickname.trim() || undefined,
    })
  }

  const handleEdit = (form: FormState) => {
    if (view.kind !== 'edit') return
    setMutationError(null)
    updateMutation.mutate({
      id: view.beneficiary.id,
      data: {
        name: form.name.trim(),
        nickname: form.nickname.trim() || null,
      },
    })
  }

  const handleDelete = () => {
    if (view.kind !== 'delete') return
    setMutationError(null)
    deleteMutation.mutate(view.beneficiary.id)
  }

  const startEdit = (b: Beneficiary) => {
    setMutationError(null)
    setView({ kind: 'edit', beneficiary: b })
  }

  const startDelete = (b: Beneficiary) => {
    setMutationError(null)
    setView({ kind: 'delete', beneficiary: b })
  }

  const sendTo = (b: Beneficiary) => {
    navigate('/send', { state: { receiver_wallet_id: b.wallet_id } })
  }

  const cancelView = () => {
    setMutationError(null)
    setView({ kind: 'list' })
  }

  // ── Header ──────────────────────────────────────────────────
  const title =
    view.kind === 'add'
      ? 'Ajouter un bénéficiaire'
      : view.kind === 'edit'
        ? 'Modifier le bénéficiaire'
        : 'Mes bénéficiaires'

  return (
    <div>
      {/* Title + back */}
      <div className="d-flex align-items-center mb-4 gap-2">
        {view.kind !== 'list' && (
          <button
            className="btn btn-link p-0 text-muted text-decoration-none"
            onClick={cancelView}
            aria-label="Retour"
          >
            <i className="bi bi-arrow-left me-1" aria-hidden="true" />
            Retour
          </button>
        )}
        <h1 className="h5 fw-bold mb-0 ms-1">{title}</h1>
        {view.kind === 'list' && (
          <button
            className="btn btn-primary btn-sm ms-auto"
            onClick={() => {
              setMutationError(null)
              setView({ kind: 'add' })
            }}
          >
            <i className="bi bi-plus me-1" aria-hidden="true" />
            Ajouter
          </button>
        )}
      </div>

      {/* ── Vue : liste ──────────────────────────────────────── */}
      {view.kind === 'list' && (
        <>
          {isLoading && (
            <LoadingSpinner label="Chargement des bénéficiaires…" />
          )}
          {error != null && !isLoading ? (
            <ErrorMessage error={error} />
          ) : null}

          {data && data.total === 0 && !isLoading ? (
            <EmptyState
              icon="bi-people"
              title="Aucun bénéficiaire"
              description="Ajoutez un bénéficiaire pour effectuer plus rapidement vos prochains transferts."
            />
          ) : null}

          {data && data.items.map((b) => (
            <BeneficiaryCard
              key={b.id}
              beneficiary={b}
              onEdit={startEdit}
              onDelete={startDelete}
              onSend={sendTo}
            />
          ))}
        </>
      )}

      {/* ── Vue : ajout ──────────────────────────────────────── */}
      {view.kind === 'add' && (
        <BeneficiaryForm
          initial={{ wallet_id: '', name: '', nickname: '' }}
          isEdit={false}
          onSubmit={handleAdd}
          onCancel={cancelView}
          isLoading={createMutation.isPending}
          error={mutationError}
        />
      )}

      {/* ── Vue : modification ───────────────────────────────── */}
      {view.kind === 'edit' && (
        <BeneficiaryForm
          initial={{
            wallet_id: view.beneficiary.wallet_id,
            name: view.beneficiary.name,
            nickname: view.beneficiary.nickname ?? '',
          }}
          isEdit={true}
          onSubmit={handleEdit}
          onCancel={cancelView}
          isLoading={updateMutation.isPending}
          error={mutationError}
        />
      )}

      {/* ── Vue : confirmation suppression ───────────────────── */}
      {view.kind === 'delete' && (
        <DeleteConfirm
          beneficiary={view.beneficiary}
          onConfirm={handleDelete}
          onCancel={cancelView}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
