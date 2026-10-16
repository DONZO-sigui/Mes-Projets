import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Accueil', icon: 'bi-house' },
  { to: '/send', label: 'Envoyer', icon: 'bi-send', highlight: true },
  { to: '/beneficiaries', label: 'Bénéfs', icon: 'bi-people' },
  { to: '/transactions', label: 'Historique', icon: 'bi-clock-history' },
  { to: '/profile', label: 'Profil', icon: 'bi-person-circle' },
]

export function MobileBottomNav() {
  return (
    <nav
      className="d-md-none fixed-bottom bg-white border-top safe-area-bottom"
      aria-label="Navigation principale"
      style={{ zIndex: 1030 }}
    >
      <div className="d-flex">
        {NAV_ITEMS.map(({ to, label, icon, highlight }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-fill d-flex flex-column align-items-center justify-content-center py-2 text-decoration-none small border-0 bg-transparent ${
                highlight
                  ? isActive
                    ? 'text-primary fw-semibold'
                    : 'text-primary'
                  : isActive
                    ? 'text-primary fw-semibold'
                    : 'text-muted'
              }`
            }
            style={{ minHeight: 56 }}
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                {highlight ? (
                  <span
                    className={`d-flex align-items-center justify-content-center rounded-circle mb-1 ${
                      isActive ? 'bg-primary text-white' : 'bg-primary bg-opacity-10 text-primary'
                    }`}
                    style={{ width: 36, height: 36 }}
                  >
                    <i className={`bi ${icon}`} aria-hidden="true" />
                  </span>
                ) : (
                  <i
                    className={`bi ${isActive ? icon.replace('bi-', 'bi-') + '-fill' : icon} fs-5 mb-1`}
                    aria-hidden="true"
                  />
                )}
                <span style={{ fontSize: '0.65rem' }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
