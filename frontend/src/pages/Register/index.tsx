import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { authApi } from '../../api/auth.api'
import { ErrorMessage } from '../../components/ErrorMessage'
import { AuthAnimatedBg } from '../../components/AuthAnimatedBg'
import type { Devise } from '../../types'

// ─── Country / dial code data ────────────────────────────────────────────────

interface Country {
  dial: string
  name: string
  flag: string
  devise: Devise
  tz?: string   // timezone hint pour la détection automatique
}

const COUNTRIES: Country[] = [
  { dial: '+224', name: 'Guinée',          flag: '🇬🇳', devise: 'GNF', tz: 'Africa/Conakry' },
  { dial: '+225', name: 'Côte d\'Ivoire',  flag: '🇨🇮', devise: 'XOF', tz: 'Africa/Abidjan' },
  { dial: '+221', name: 'Sénégal',         flag: '🇸🇳', devise: 'XOF', tz: 'Africa/Dakar' },
  { dial: '+223', name: 'Mali',            flag: '🇲🇱', devise: 'XOF', tz: 'Africa/Bamako' },
  { dial: '+226', name: 'Burkina Faso',    flag: '🇧🇫', devise: 'XOF', tz: 'Africa/Ouagadougou' },
  { dial: '+227', name: 'Niger',           flag: '🇳🇪', devise: 'XOF', tz: 'Africa/Niamey' },
  { dial: '+229', name: 'Bénin',           flag: '🇧🇯', devise: 'XOF', tz: 'Africa/Cotonou' },
  { dial: '+228', name: 'Togo',            flag: '🇹🇬', devise: 'XOF', tz: 'Africa/Lome' },
  { dial: '+245', name: 'Guinée-Bissau',   flag: '🇬🇼', devise: 'XOF' },
  { dial: '+240', name: 'Guinée éq.',      flag: '🇬🇶', devise: 'XOF' },
  { dial: '+33',  name: 'France',          flag: '🇫🇷', devise: 'EUR', tz: 'Europe/Paris' },
  { dial: '+32',  name: 'Belgique',        flag: '🇧🇪', devise: 'EUR', tz: 'Europe/Brussels' },
  { dial: '+41',  name: 'Suisse',          flag: '🇨🇭', devise: 'EUR', tz: 'Europe/Zurich' },
  { dial: '+352', name: 'Luxembourg',      flag: '🇱🇺', devise: 'EUR' },
  { dial: '+44',  name: 'Royaume-Uni',     flag: '🇬🇧', devise: 'GBP', tz: 'Europe/London' },
  { dial: '+1',   name: 'États-Unis',      flag: '🇺🇸', devise: 'USD', tz: 'America/New_York' },
  { dial: '+1',   name: 'Canada',          flag: '🇨🇦', devise: 'USD', tz: 'America/Toronto' },
]

// Map timezone → country index
const TZ_TO_IDX: Record<string, number> = {}
COUNTRIES.forEach((c, i) => { if (c.tz) TZ_TO_IDX[c.tz] = i })

function detectInitial(): { dialCode: string; devise: Devise } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const idx = TZ_TO_IDX[tz]
    if (idx !== undefined) return { dialCode: COUNTRIES[idx].dial, devise: COUNTRIES[idx].devise }
  } catch { /* ignore */ }
  return { dialCode: '+224', devise: 'GNF' }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Register() {
  const initial = detectInitial()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    dialCode: initial.dialCode,
    phoneLocal: '',
    devise: initial.devise,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // When country dial code changes → also sync devise automatically
  const handleDialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dial = e.target.value
    // Find the first country matching the dial code
    const country = COUNTRIES.find((c) => c.dial === dial)
    setForm((prev) => ({
      ...prev,
      dialCode: dial,
      ...(country ? { devise: country.devise } : {}),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const phone_number = form.dialCode + form.phoneLocal.replace(/\s|-/g, '')
      const { data } = await authApi.register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        devise: form.devise,
        phone_number,
      })
      login(data.access_token, data.refresh_token, data.user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  // Find selected country for the flag preview
  const selectedCountry = COUNTRIES.find((c) => c.dial === form.dialCode)

  return (
    <div className="auth-wrapper">
      <AuthAnimatedBg />
      <div className="auth-card">
        <div className="auth-brand-badge">
          <i className="bi bi-shield-check" aria-hidden="true" />
        </div>

        <h1 className="auth-title">Créer un compte</h1>
        <p className="auth-subtitle">Rejoignez la plateforme GNF-Token Guinée ↔ Diaspora</p>

        {error !== null && <ErrorMessage error={error} />}

        <form onSubmit={handleSubmit} noValidate>

          {/* Prénom + Nom */}
          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label htmlFor="first_name" className="form-label">Prénom</label>
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
              <label htmlFor="last_name" className="form-label">Nom</label>
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

          {/* Téléphone : indicatif + numéro local */}
          <div className="mb-3">
            <label className="form-label">
              Numéro de téléphone
              <span className="text-danger ms-1" aria-hidden="true">*</span>
            </label>
            <div className="input-group">
              <select
                className="form-select flex-shrink-1"
                style={{ maxWidth: 190 }}
                value={form.dialCode}
                onChange={handleDialChange}
                disabled={loading}
                aria-label="Indicatif pays"
              >
                {COUNTRIES.map((c, i) => (
                  <option key={i} value={c.dial}>
                    {c.flag} {c.name} ({c.dial})
                  </option>
                ))}
              </select>
              <input
                id="phone"
                type="tel"
                className="form-control"
                placeholder="6X XX XX XX XX"
                value={form.phoneLocal}
                onChange={set('phoneLocal')}
                required
                disabled={loading}
                autoComplete="tel-national"
                inputMode="tel"
              />
            </div>
            <div className="form-text d-flex align-items-center gap-1 mt-1">
              <span className="me-1">{selectedCountry?.flag}</span>
              <span>
                {selectedCountry?.name} · Devise détectée :&nbsp;
                <strong>{selectedCountry?.devise ?? form.devise}</strong>
              </span>
            </div>
          </div>

          {/* Devise (peut être modifiée manuellement) */}
          <div className="mb-3">
            <label htmlFor="devise" className="form-label">
              Devise du wallet
            </label>
            <select
              id="devise"
              className="form-select"
              value={form.devise}
              onChange={set('devise')}
              disabled={loading}
            >
              <option value="GNF">🇬🇳 GNF — Franc guinéen</option>
              <option value="XOF">🌍 XOF — Franc CFA (BCEAO)</option>
              <option value="EUR">🇪🇺 EUR — Euro</option>
              <option value="USD">🇺🇸 USD — Dollar américain</option>
              <option value="GBP">🇬🇧 GBP — Livre sterling</option>
            </select>
            <div className="form-text">
              Mise à jour automatique selon votre pays. Modifiable si besoin.
            </div>
          </div>

          {/* Email */}
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Adresse e-mail</label>
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

          {/* Mot de passe */}
          <div className="mb-4">
            <label htmlFor="password" className="form-label">Mot de passe sécurisé</label>
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

        <div className="auth-trust-footer">
          <i className="bi bi-lock-fill text-success" aria-hidden="true" />
          <span>Données chiffrées & Transactions sécurisées BCRG</span>
        </div>
      </div>
    </div>
  )
}
