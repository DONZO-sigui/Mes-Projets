import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api/auth.api'
import { ErrorMessage } from '../../components/ErrorMessage'
import { AuthAnimatedBg } from '../../components/AuthAnimatedBg'

type View = 'form' | 'success' | 'invalid'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [view, setView]           = useState<View>(token ? 'form' : 'invalid')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<unknown>(null)
  const [mismatch, setMismatch]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMismatch(false)

    if (password !== confirm) {
      setMismatch(true)
      return
    }

    setError(null)
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setView('success')
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <AuthAnimatedBg />

      <div className="auth-card" style={{ maxWidth: 440 }}>

        {/* Brand badge */}
        <div className="auth-brand-badge">
          <i
            className={`bi ${view === 'success' ? 'bi-check-circle' : view === 'invalid' ? 'bi-shield-x' : 'bi-shield-lock'}`}
            aria-hidden="true"
          />
        </div>

        {/* ════════ INVALID TOKEN ════════ */}
        {view === 'invalid' && (
          <>
            <h1 className="auth-title">Lien invalide</h1>
            <p className="auth-subtitle">
              Ce lien de réinitialisation est invalide ou a expiré.
            </p>

            <Link to="/login" className="btn btn-primary w-100">
              <i className="bi bi-arrow-left me-2" aria-hidden="true" />
              Retour à la connexion
            </Link>
          </>
        )}

        {/* ════════ RESET FORM ════════ */}
        {view === 'form' && (
          <>
            <h1 className="auth-title">Nouveau mot de passe</h1>
            <p className="auth-subtitle">
              Choisissez un mot de passe fort pour sécuriser votre compte.
            </p>

            {error !== null && <ErrorMessage error={error} />}

            {mismatch && (
              <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                <span>Les mots de passe ne correspondent pas.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="new-password" className="form-label">
                  Nouveau mot de passe
                </label>
                <input
                  id="new-password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  minLength={8}
                />
                <div className="form-text d-flex align-items-center gap-1 mt-2">
                  <i className="bi bi-info-circle text-muted" aria-hidden="true" />
                  <span>Min. 8 caractères, 1 majuscule, 1 chiffre.</span>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="confirm-password" className="form-label">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setMismatch(false) }}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading || !password || !confirm}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Réinitialisation…
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle me-2" aria-hidden="true" />
                    <span>Réinitialiser mon mot de passe</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* ════════ SUCCESS ════════ */}
        {view === 'success' && (
          <>
            <div
              style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'var(--gnf-success-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <i className="bi bi-check-circle-fill fs-3" style={{ color: 'var(--gnf-success)' }} aria-hidden="true" />
            </div>

            <h1 className="auth-title">Mot de passe modifié !</h1>
            <p className="auth-subtitle">
              Votre mot de passe a été réinitialisé avec succès.
              Toutes vos sessions précédentes ont été révoquées.
            </p>

            <Link to="/login" className="btn btn-primary w-100">
              <i className="bi bi-box-arrow-in-right me-2" aria-hidden="true" />
              Se connecter
            </Link>
          </>
        )}

        {/* Trust footer */}
        <div className="auth-trust-footer">
          <i className="bi bi-shield-check text-success" aria-hidden="true" />
          <span>Données chiffrées & Transactions sécurisées BCRG</span>
        </div>
      </div>
    </div>
  )
}
