import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { authApi } from '../../api/auth.api'
import { ErrorMessage } from '../../components/ErrorMessage'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await authApi.login({ email, password })
      login(data.access_token, data.refresh_token, data.user)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        {/* Brand Icon Header */}
        <div className="auth-brand-badge">
          <i className="bi bi-bank2" aria-hidden="true" />
        </div>

        <h1 className="auth-title">Bienvenue</h1>
        <p className="auth-subtitle">Accédez à votre espace bancaire GNF-Token</p>

        {error !== null && <ErrorMessage error={error} />}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="nom@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="password" className="form-label mb-0">
                Mot de passe
              </label>
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
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? (
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
          <hr className="flex-grow-1 my-0 text-muted" style={{ opacity: 0.15 }} />
          <span className="px-3 text-muted small fw-medium">OU</span>
          <hr className="flex-grow-1 my-0 text-muted" style={{ opacity: 0.15 }} />
        </div>

        <p className="text-center text-muted small mb-0 fw-medium">
          Vous n'avez pas encore de compte ?{' '}
          <Link to="/register" className="text-primary text-decoration-none fw-bold">
            Créer un compte
          </Link>
        </p>

        {/* FinTech Trust Badge */}
        <div className="auth-trust-footer">
          <i className="bi bi-shield-check text-success" aria-hidden="true" />
          <span>Plateforme sécurisée • Conforme BCRG</span>
        </div>
      </div>
    </div>
  )
}
