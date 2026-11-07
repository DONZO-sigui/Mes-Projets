import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { authApi } from '../../api/auth.api'
import { ErrorMessage } from '../../components/ErrorMessage'
import { AuthAnimatedBg } from '../../components/AuthAnimatedBg'

type View = 'login' | 'forgot' | 'forgot-sent'

export default function Login() {
  const [view, setView] = useState<View>('login')

  // Login
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError]     = useState<unknown>(null)

  // Forgot password
  const [forgotEmail, setForgotEmail]     = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError]     = useState<unknown>(null)

  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)
    try {
      const { data } = await authApi.login({ email, password })
      login(data.access_token, data.refresh_token, data.user)
      navigate(from, { replace: true })
    } catch (err) {
      setLoginError(err)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError(null)
    setForgotLoading(true)
    try {
      await authApi.forgotPassword(forgotEmail)
      setView('forgot-sent')
    } catch (err) {
      setForgotError(err)
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <AuthAnimatedBg />

      <div className="auth-card" style={{ maxWidth: 440 }}>

        {/* ── Brand badge ── */}
        <div className="auth-brand-badge">
          <i className="bi bi-bank2" aria-hidden="true" />
        </div>

        {/* ════════ LOGIN VIEW ════════ */}
        {view === 'login' && (
          <>
            <h1 className="auth-title">Bienvenue</h1>
            <p className="auth-subtitle">Accédez à votre espace bancaire GNF-Token</p>

            {loginError !== null && <ErrorMessage error={loginError} />}

            <form onSubmit={handleLogin} noValidate>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Adresse e-mail</label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loginLoading}
                />
              </div>

              <div className="mb-1">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="password" className="form-label mb-0">Mot de passe</label>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    style={{ fontSize: '0.8125rem', color: 'var(--gnf-blue)' }}
                    onClick={() => { setView('forgot'); setForgotEmail(email) }}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loginLoading}
                />
              </div>

              <button type="submit" className="btn btn-primary w-100 mt-4" disabled={loginLoading}>
                {loginLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Connexion en cours…
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <i className="bi bi-box-arrow-in-right ms-2" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className="d-flex align-items-center my-4">
              <hr className="flex-grow-1 my-0" style={{ opacity: 0.12 }} />
              <span className="px-3 text-muted small fw-medium">OU</span>
              <hr className="flex-grow-1 my-0" style={{ opacity: 0.12 }} />
            </div>

            <p className="text-center text-muted small mb-0 fw-medium">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-primary text-decoration-none fw-bold">
                Créer un compte
              </Link>
            </p>
          </>
        )}

        {/* ════════ FORGOT PASSWORD VIEW ════════ */}
        {view === 'forgot' && (
          <>
            <h1 className="auth-title">Mot de passe oublié</h1>
            <p className="auth-subtitle">
              Entrez votre adresse e-mail et nous vous enverrons un lien de réinitialisation.
            </p>

            {forgotError !== null && <ErrorMessage error={forgotError} />}

            <form onSubmit={handleForgot} noValidate>
              <div className="mb-4">
                <label htmlFor="forgot-email" className="form-label">Adresse e-mail</label>
                <input
                  id="forgot-email"
                  type="email"
                  className="form-control"
                  placeholder="nom@exemple.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={forgotLoading}
                />
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={forgotLoading || !forgotEmail}>
                {forgotLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Envoi en cours…
                  </>
                ) : (
                  <>
                    <i className="bi bi-envelope me-2" aria-hidden="true" />
                    <span>Envoyer le lien</span>
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              className="btn btn-link w-100 mt-3 text-muted small text-decoration-none"
              onClick={() => { setView('login'); setForgotError(null) }}
            >
              <i className="bi bi-arrow-left me-1" aria-hidden="true" />
              Retour à la connexion
            </button>
          </>
        )}

        {/* ════════ FORGOT SENT VIEW ════════ */}
        {view === 'forgot-sent' && (
          <>
            <div
              className="text-center mb-4"
              style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'var(--gnf-success-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <i className="bi bi-envelope-check-fill fs-3" style={{ color: 'var(--gnf-success)' }} aria-hidden="true" />
            </div>

            <h1 className="auth-title">E-mail envoyé !</h1>
            <p className="auth-subtitle">
              Si un compte est associé à{' '}
              <strong style={{ color: 'var(--gnf-text)' }}>{forgotEmail}</strong>
              , vous recevrez un lien de réinitialisation dans quelques minutes.
            </p>

            <div
              className="d-flex align-items-start gap-2 p-3 mb-4"
              style={{ background: 'var(--gnf-warning-bg)', borderRadius: '0.875rem', border: '1px solid rgba(232,144,12,0.15)' }}
            >
              <i className="bi bi-info-circle-fill mt-1" style={{ color: 'var(--gnf-warning)', flexShrink: 0 }} aria-hidden="true" />
              <p className="mb-0 small" style={{ color: '#78350F' }}>
                Le lien est valable <strong>1 heure</strong>. Vérifiez également vos spams.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary w-100"
              onClick={() => { setView('login'); setForgotEmail(''); setForgotError(null) }}
            >
              <i className="bi bi-box-arrow-in-right me-2" aria-hidden="true" />
              Retour à la connexion
            </button>
          </>
        )}

        {/* ── Trust footer ── */}
        <div className="auth-trust-footer">
          <i className="bi bi-shield-check text-success" aria-hidden="true" />
          <span>Plateforme sécurisée • Conforme BCRG</span>
        </div>
      </div>
    </div>
  )
}
