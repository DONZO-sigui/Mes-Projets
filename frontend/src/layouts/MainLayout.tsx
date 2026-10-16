import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { notificationsApi } from '../api/notifications.api'

const DESKTOP_NAV = [
  { to: '/dashboard', label: 'Tableau de bord', icon: 'bi-speedometer2' },
  { to: '/send', label: 'Envoyer', icon: 'bi-send' },
  { to: '/beneficiaries', label: 'Bénéficiaires', icon: 'bi-people' },
  { to: '/wallet', label: 'Portefeuille', icon: 'bi-wallet2' },
  { to: '/transactions', label: 'Historique', icon: 'bi-clock-history' },
  { to: '/profile', label: 'Profil', icon: 'bi-person-circle' },
]

export default function MainLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data),
    refetchInterval: 60_000,
  })
  const unreadCount = unreadData?.count ?? 0

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* ── Desktop/tablet top navbar ────────────────────────────── */}
      <nav className="navbar navbar-expand-md navbar-dark bg-primary">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold">
            <i className="bi bi-bank2 me-2" aria-hidden="true" />
            GNF-Token
          </span>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNav"
            aria-controls="mainNav"
            aria-expanded="false"
            aria-label="Ouvrir le menu"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="mainNav">
            <ul className="navbar-nav me-auto mb-2 mb-md-0">
              {DESKTOP_NAV.map(({ to, label, icon }) => (
                <li key={to} className="nav-item">
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      'nav-link' + (isActive ? ' active fw-semibold' : '')
                    }
                  >
                    <i className={`bi ${icon} me-1`} aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="d-flex align-items-center gap-3">
              <span className="text-white-50 small d-none d-lg-inline">
                {user?.first_name} {user?.last_name}
              </span>
              <Link
                to="/notifications"
                className="btn btn-outline-light btn-sm position-relative"
                aria-label="Notifications"
              >
                <i className="bi bi-bell" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{ fontSize: '0.6rem' }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <button
                className="btn btn-outline-light btn-sm"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
                <span className="d-none d-md-inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Page content ─────────────────────────────────────────── */}
      {/* pb-5 on mobile to leave room for bottom nav */}
      <main className="flex-grow-1 container-fluid py-3 py-md-4 pb-5 pb-md-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-9 col-xl-8">
            <Outlet />
          </div>
        </div>
      </main>

      {/* ── Footer (desktop only) ─────────────────────────────────── */}
      <footer className="bg-light text-center text-muted py-2 small d-none d-md-block">
        GNF-Token Dashboard v0.2 — usage interne uniquement
      </footer>

      {/* ── Mobile bottom navigation ──────────────────────────────── */}
      <MobileBottomNav />
    </div>
  )
}
