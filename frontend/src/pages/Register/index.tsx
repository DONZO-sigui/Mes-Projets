import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { authApi } from '../../api/auth.api'
import { ErrorMessage } from '../../components/ErrorMessage'

export default function Register() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await authApi.register(form)
      login(data.access_token, data.refresh_token, data.user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Brand Icon Header */}
        <div className="auth-brand-badge">
          <i className="bi bi-shield-check" aria-hidden="true" />
        </div>

        <h1 className="auth-title">Créer un compte</h1>
        <p className="auth-subtitle">Rejoignez la plateforme GNF-Token Guinée ↔ Diaspora</p>

        {error !== null && <ErrorMessage error={error} />}

        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label htmlFor="first_name" className="form-label">
                Prénom
              </label>
              <input
                id="first_name"
                type="text"
                className="form-control"
                placeholder="Ex. Mamadou"
                value={form.first_name}
                onChange={set('first_name')}
                required
                disabled={loading}
              />
            </div>
            <div className="col-sm-6">
              <label htmlFor="last_name" className="form-label">
                Nom
              </label>
              <input
                id="last_name"
                type="text"
                className="form-control"
                placeholder="Ex. Diallo"
                value={form.last_name}
                onChange={set('last_name')}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Adresse e-mail professionnelle ou personnelle
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="nom@exemple.com"
              value={form.email}
              onChange={set('email')}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label">
              Mot de passe sécurisé
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              required
              autoComplete="new-password"
              disabled={loading}
              minLength={8}
            />
            <div className="form-text d-flex align-items-center gap-1 mt-2">
              <i className="bi bi-info-circle text-muted" aria-hidden="true" />
              <span>Min. 8 caractères, 1 majuscule, 1 chiffre, 1 symbole.</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Création en cours…
              </>
            ) : (
              <>
                <span>Créer mon compte</span>
                <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
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
          Vous possédez déjà un compte ?{' '}
          <Link to="/login" className="text-primary text-decoration-none fw-bold">
            Se connecter
          </Link>
        </p>

        {/* FinTech Trust Badge */}
        <div className="auth-trust-footer">
          <i className="bi bi-lock-fill text-success" aria-hidden="true" />
          <span>Données chiffrées & Transactions sécurisées BCRG</span>
        </div>
      </div>
    </div>
  )
}
