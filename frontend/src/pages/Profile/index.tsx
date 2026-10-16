import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/useAuth'
import { useLogout } from '../../hooks/useLogout'
import { usersApi } from '../../api/users.api'
import { ErrorMessage } from '../../components/ErrorMessage'
import { formatDate } from '../../utils/formatters'
import type { Session } from '../../types'

// ─── Helpers ──────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string): string {
  return (firstName[0] ?? '') + (lastName[0] ?? '')
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-success',
    SUSPENDED: 'bg-warning text-dark',
    DISABLED: 'bg-danger',
  }
  return (
    <span className={`badge ${map[status] ?? 'bg-secondary'}`}>
      {status}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    USER: 'bg-primary bg-opacity-10 text-primary',
    ADMIN: 'bg-warning text-dark',
    SUPERADMIN: 'bg-danger',
  }
  return (
    <span className={`badge ${map[role] ?? 'bg-secondary'}`}>
      {role}
    </span>
  )
}

// ─── Validation mot de passe ──────────────────────────────────

interface PwdErrors {
  current_password?: string
  new_password?: string
  confirm?: string
}

function validatePwd(
  current: string,
  next: string,
  confirm: string,
): PwdErrors {
  const errs: PwdErrors = {}
  if (!current) errs.current_password = 'Mot de passe actuel obligatoire.'
  if (next.length < 8) errs.new_password = 'Minimum 8 caractères.'
  else if (!/[A-Z]/.test(next)) errs.new_password = 'Au moins une majuscule requise.'
  else if (!/[0-9]/.test(next)) errs.new_password = 'Au moins un chiffre requis.'
  if (next !== confirm) errs.confirm = 'Les mots de passe ne correspondent pas.'
  return errs
}

// ─── Section 1 : Informations personnelles ────────────────────

function PersonalInfoSection() {
  const { user, setUser } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
  })
  const [success, setSuccess] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.update({
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
      }).then((r) => r.data),
    onSuccess: (updated) => {
      setUser(updated)
      void queryClient.invalidateQueries({ queryKey: ['user'] })
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
  })

  const initials = getInitials(user?.first_name ?? '?', user?.last_name ?? '?')

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <h2 className="h6 fw-bold text-muted text-uppercase small mb-3 letter-spacing-1">
          <i className="bi bi-person me-2" aria-hidden="true" />
          Informations personnelles
        </h2>

        {/* Avatar + nom */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white fw-bold fs-5 flex-shrink-0"
            style={{ width: 56, height: 56 }}
            aria-hidden="true"
          >
            {initials.toUpperCase()}
          </div>
          <div>
            <div className="fw-semibold fs-6">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-muted small">{user?.email}</div>
          </div>
        </div>

        {success && (
          <div className="alert alert-success py-2 small mb-3" role="status">
            <i className="bi bi-check-circle me-2" aria-hidden="true" />
            Profil mis à jour.
          </div>
        )}
        {mutation.error && <ErrorMessage error={mutation.error} className="mb-3" />}

        {editing ? (
          <form
            onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
            noValidate
          >
            <div className="mb-3">
              <label htmlFor="first_name" className="form-label fw-semibold">Prénom</label>
              <input
                id="first_name"
                type="text"
                className="form-control"
                value={form.first_name}
                onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                required
                maxLength={100}
                disabled={mutation.isPending}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="last_name" className="form-label fw-semibold">Nom</label>
              <input
                id="last_name"
                type="text"
                className="form-control"
                value={form.last_name}
                onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                required
                maxLength={100}
                disabled={mutation.isPending}
              />
            </div>
            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                    Sauvegarde…
                  </>
                ) : 'Enregistrer'}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => { setEditing(false); mutation.reset() }}
                disabled={mutation.isPending}
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <>
            <dl className="row mb-4 small">
              <dt className="col-5 text-muted">Prénom</dt>
              <dd className="col-7">{user?.first_name}</dd>

              <dt className="col-5 text-muted">Nom</dt>
              <dd className="col-7">{user?.last_name}</dd>

              <dt className="col-5 text-muted">E-mail</dt>
              <dd className="col-7 text-truncate">{user?.email}</dd>

              <dt className="col-5 text-muted">Rôle</dt>
              <dd className="col-7"><RoleBadge role={user?.role ?? ''} /></dd>

              <dt className="col-5 text-muted">Statut</dt>
              <dd className="col-7"><StatusBadge status={user?.status ?? ''} /></dd>

              <dt className="col-5 text-muted">E-mail vérifié</dt>
              <dd className="col-7">
                {user?.is_email_verified
                  ? <i className="bi bi-check-circle-fill text-success" aria-label="Vérifié" />
                  : <i className="bi bi-x-circle-fill text-danger" aria-label="Non vérifié" />}
              </dd>

              <dt className="col-5 text-muted">Membre depuis</dt>
              <dd className="col-7">{formatDate(user?.created_at)}</dd>

              <dt className="col-5 text-muted">Dernière connexion</dt>
              <dd className="col-7 mb-0">{formatDate(user?.last_login_at)}</dd>
            </dl>

            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => {
                setForm({
                  first_name: user?.first_name ?? '',
                  last_name: user?.last_name ?? '',
                })
                setEditing(true)
              }}
            >
              <i className="bi bi-pencil me-1" aria-hidden="true" />
              Modifier
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Section 2 : Sécurité — changement de mot de passe ────────

function SecuritySection() {
  const logout = useLogout()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm: '',
  })
  const [show, setShow] = useState({ current: false, next: false })
  const [errors, setErrors] = useState<PwdErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof typeof form, boolean>>>({})
  const [success, setSuccess] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      }),
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => {
        logout()
        navigate('/login', { replace: true })
      }, 2000)
    },
  })

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...form, [field]: e.target.value }
    setForm(updated)
    if (touched[field]) {
      setErrors(validatePwd(updated.current_password, updated.new_password, updated.confirm))
    }
  }

  const blur = (field: keyof typeof form) => () => {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors(validatePwd(form.current_password, form.new_password, form.confirm))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ current_password: true, new_password: true, confirm: true })
    const errs = validatePwd(form.current_password, form.new_password, form.confirm)
    setErrors(errs)
    if (Object.keys(errs).length === 0) {
      mutation.mutate()
    }
  }

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <h2 className="h6 fw-bold text-muted text-uppercase small mb-3">
          <i className="bi bi-shield-lock me-2" aria-hidden="true" />
          Changer le mot de passe
        </h2>

        {success && (
          <div className="alert alert-success py-2 small mb-3" role="status">
            <i className="bi bi-check-circle me-2" aria-hidden="true" />
            Mot de passe modifié. Redirection vers la connexion…
          </div>
        )}
        {mutation.error && !success && (
          <ErrorMessage error={mutation.error} className="mb-3" />
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Mot de passe actuel */}
          <div className="mb-3">
            <label htmlFor="current_password" className="form-label fw-semibold">
              Mot de passe actuel
            </label>
            <div className="input-group">
              <input
                id="current_password"
                type={show.current ? 'text' : 'password'}
                className={`form-control ${touched.current_password && errors.current_password ? 'is-invalid' : ''}`}
                value={form.current_password}
                onChange={set('current_password')}
                onBlur={blur('current_password')}
                autoComplete="current-password"
                disabled={mutation.isPending || success}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
                aria-label={show.current ? 'Masquer' : 'Afficher'}
              >
                <i className={`bi bi-eye${show.current ? '-slash' : ''}`} aria-hidden="true" />
              </button>
              {touched.current_password && errors.current_password && (
                <div className="invalid-feedback">{errors.current_password}</div>
              )}
            </div>
          </div>

          {/* Nouveau mot de passe */}
          <div className="mb-3">
            <label htmlFor="new_password" className="form-label fw-semibold">
              Nouveau mot de passe
            </label>
            <div className="input-group">
              <input
                id="new_password"
                type={show.next ? 'text' : 'password'}
                className={`form-control ${touched.new_password && errors.new_password ? 'is-invalid' : ''}`}
                value={form.new_password}
                onChange={set('new_password')}
                onBlur={blur('new_password')}
                autoComplete="new-password"
                disabled={mutation.isPending || success}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
                aria-label={show.next ? 'Masquer' : 'Afficher'}
              >
                <i className={`bi bi-eye${show.next ? '-slash' : ''}`} aria-hidden="true" />
              </button>
              {touched.new_password && errors.new_password && (
                <div className="invalid-feedback">{errors.new_password}</div>
              )}
            </div>
            <div className="form-text">
              8 caractères minimum, 1 majuscule, 1 chiffre.
            </div>
          </div>

          {/* Confirmation */}
          <div className="mb-4">
            <label htmlFor="confirm" className="form-label fw-semibold">
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirm"
              type={show.next ? 'text' : 'password'}
              className={`form-control ${touched.confirm && errors.confirm ? 'is-invalid' : ''}`}
              value={form.confirm}
              onChange={set('confirm')}
              onBlur={blur('confirm')}
              autoComplete="new-password"
              disabled={mutation.isPending || success}
            />
            {touched.confirm && errors.confirm && (
              <div className="invalid-feedback">{errors.confirm}</div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={mutation.isPending || success}
          >
            {mutation.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                Modification…
              </>
            ) : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Section 3 : Sessions actives ─────────────────────────────

function SessionCard({
  session,
  onRevoke,
  revoking,
}: {
  session: Session
  onRevoke: (id: string) => void
  revoking: boolean
}) {
  const [confirm, setConfirm] = useState(false)

  return (
    <li className="list-group-item px-0 py-3">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div className="d-flex align-items-start gap-2 flex-grow-1 min-w-0">
          <i
            className={`bi ${session.is_current ? 'bi-shield-check text-success' : 'bi-shield text-secondary'} flex-shrink-0 mt-1`}
            aria-hidden="true"
          />
          <div className="small min-w-0">
            {session.is_current && (
              <span className="badge bg-success bg-opacity-10 text-success fw-semibold me-1 mb-1">
                Session courante
              </span>
            )}
            {session.user_agent && (
              <div className="fw-medium text-truncate" title={session.user_agent}>
                {session.user_agent}
              </div>
            )}
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
              Créée le {formatDate(session.created_at)}
            </div>
            {session.last_used_at && (
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                Utilisée le {formatDate(session.last_used_at)}
              </div>
            )}
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
              Expire le {formatDate(session.expires_at)}
            </div>
          </div>
        </div>

        {!session.is_current && (
          <div className="flex-shrink-0">
            {!confirm ? (
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => setConfirm(true)}
                disabled={revoking}
                aria-label="Révoquer cette session"
              >
                Révoquer
              </button>
            ) : (
              <div className="d-flex gap-1 align-items-center">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => { onRevoke(session.id); setConfirm(false) }}
                  disabled={revoking}
                  aria-label="Confirmer la révocation"
                >
                  {revoking ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  ) : 'Oui'}
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setConfirm(false)}
                  disabled={revoking}
                >
                  Non
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function SessionsSection() {
  const logout = useLogout()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => usersApi.getSessions().then((r) => r.data),
  })

  const revokeOneMutation = useMutation({
    mutationFn: (sessionId: string) => usersApi.revokeSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      setRevokingId(null)
    },
    onError: () => setRevokingId(null),
  })

  const revokeAllMutation = useMutation({
    mutationFn: () => usersApi.revokeAllSessions(),
    onSuccess: async () => {
      await logout()
      navigate('/login', { replace: true })
    },
  })

  const handleRevokeOne = (id: string) => {
    setRevokingId(id)
    revokeOneMutation.mutate(id)
  }

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <h2 className="h6 fw-bold text-muted text-uppercase small mb-3">
          <i className="bi bi-laptop me-2" aria-hidden="true" />
          Sessions actives
          {data && (
            <span className="badge bg-secondary ms-2 fw-normal">{data.total}</span>
          )}
        </h2>

        {isLoading ? (
          <div className="text-muted small">
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            Chargement…
          </div>
        ) : !data || data.total === 0 ? (
          <p className="text-muted small mb-3">Aucune session active.</p>
        ) : (
          <ul className="list-group list-group-flush mb-3">
            {data.items.map((s: Session) => (
              <SessionCard
                key={s.id}
                session={s}
                onRevoke={handleRevokeOne}
                revoking={revokingId === s.id && revokeOneMutation.isPending}
              />
            ))}
          </ul>
        )}

        {revokeOneMutation.error && (
          <ErrorMessage error={revokeOneMutation.error} className="mb-2" />
        )}

        {/* Zone de danger — Révoquer toutes les sessions */}
        <div className="border border-danger rounded p-3 mt-2">
          <div className="small fw-semibold text-danger mb-1">
            <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
            Zone de danger
          </div>
          <p className="small text-muted mb-2">
            Révoquer toutes les sessions déconnectera immédiatement tous vos
            appareils. Vous devrez vous reconnecter.
          </p>

          {!confirmRevokeAll ? (
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => setConfirmRevokeAll(true)}
            >
              Révoquer toutes les sessions
            </button>
          ) : (
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <span className="small text-danger fw-semibold">Confirmer ?</span>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => revokeAllMutation.mutate()}
                disabled={revokeAllMutation.isPending}
              >
                {revokeAllMutation.isPending ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                ) : 'Oui, révoquer tout'}
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setConfirmRevokeAll(false)}
                disabled={revokeAllMutation.isPending}
              >
                Annuler
              </button>
            </div>
          )}

          {revokeAllMutation.error && (
            <ErrorMessage error={revokeAllMutation.error} className="mt-2" />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────

export default function Profile() {
  return (
    <div>
      <h1 className="h5 fw-bold mb-4">
        <i className="bi bi-person-circle text-primary me-2" aria-hidden="true" />
        Mon profil
      </h1>

      <div className="row">
        <div className="col-12 col-md-8 col-lg-6">
          <PersonalInfoSection />
          <SecuritySection />
          <SessionsSection />
        </div>
      </div>
    </div>
  )
}
