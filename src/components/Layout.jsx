import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Compass, Menu, X, ChevronRight } from 'lucide-react';
import Chatbot from './Chatbot';

const NAV_LINKS = [
  { to: '/',           label: 'Accueil' },
  { to: '/test',       label: "Test d'orientation" },
  { to: '/universities', label: 'Universités' },
  { to: '/compare',   label: 'Comparateur' },
];

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans relative">

      {/* ===== HEADER ===== */}
      <header
        className={`bg-white sticky top-0 z-40 transition-all duration-200 ${
          scrolled ? 'shadow-md' : 'shadow-sm border-b border-slate-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm group-hover:bg-primary-700 transition-colors">
                <Compass className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                Orient<span className="text-primary-600">Guinée</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-0.5">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(to)
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden sm:block text-sm font-medium text-slate-500 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Se connecter
              </Link>
              <Link
                to="/test"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
              >
                Commencer <ChevronRight className="h-4 w-4" />
              </Link>

              {/* Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="sm:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="Menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-slate-100 bg-white px-4 pb-4 pt-2 space-y-1 shadow-lg">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <Link
                to="/login"
                className="text-center px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Se connecter
              </Link>
              <Link
                to="/test"
                className="text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Commencer
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-900 text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">

            {/* Brand */}
            <div className="sm:col-span-2">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary-500 flex items-center justify-center">
                  <Compass className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">
                  Orient<span className="text-primary-400">Guinée</span>
                </span>
              </Link>
              <p className="mt-4 text-sm text-slate-400 max-w-xs leading-relaxed">
                La plateforme d'orientation académique et professionnelle pour les nouveaux bacheliers guinéens. Trouvez votre voie avec l'aide de l'IA.
              </p>
              <p className="mt-4 text-xs text-slate-600">🇬🇳 Conçu pour la Guinée</p>
            </div>

            {/* Explorer */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Explorer</h4>
              <ul className="space-y-2.5">
                {[
                  { to: '/universities', label: 'Universités' },
                  { to: '/test',         label: "Test d'orientation" },
                  { to: '/compare',     label: 'Comparateur' },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Compte */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Compte</h4>
              <ul className="space-y-2.5">
                {[
                  { to: '/login',    label: 'Se connecter' },
                  { to: '/register', label: "S'inscrire" },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-slate-600">© 2026 OrientGuinée. Tous droits réservés.</p>
            <p className="text-xs text-slate-600">Aide aux bacheliers guinéens depuis 2025</p>
          </div>
        </div>
      </footer>

      <Chatbot />
    </div>
  );
};

export default Layout;
