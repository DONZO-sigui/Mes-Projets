import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center text-center">
      <div>
        <i className="bi bi-exclamation-circle text-muted" style={{ fontSize: '4rem' }} aria-hidden="true" />
        <h1 className="h2 mt-3">Page introuvable</h1>
        <p className="text-muted mb-4">Cette page n'existe pas ou a été déplacée.</p>
        <Link to="/dashboard" className="btn btn-primary">
          <i className="bi bi-house me-2" aria-hidden="true" />
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
