import { useLocation, Link, Navigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { Briefcase, BookOpen, Building2, Trophy, ArrowRight, RotateCcw } from 'lucide-react';

const SECTIONS = [
  {
    key:   'recommended_jobs',
    icon:  Briefcase,
    title: 'Métiers Recommandés',
    color: { header: 'from-primary-600 to-primary-500', icon: 'bg-primary-100 text-primary-600', link: 'text-primary-600 hover:text-primary-800' },
    getPath: (item) => `/jobs/${item.id}`,
    getMeta: () => null,
  },
  {
    key:   'recommended_programs',
    icon:  BookOpen,
    title: 'Filières Recommandées',
    color: { header: 'from-indigo-600 to-indigo-500', icon: 'bg-indigo-100 text-indigo-600', link: 'text-indigo-600 hover:text-indigo-800' },
    getPath: (item) => `/programs/${item.id}`,
    getMeta: (item) => item.level ? `${item.level}${item.duration_years ? ` · ${item.duration_years} ans` : ''}` : null,
  },
  {
    key:   'recommended_universities',
    icon:  Building2,
    title: 'Où étudier ?',
    color: { header: 'from-emerald-600 to-emerald-500', icon: 'bg-emerald-100 text-emerald-600', link: 'text-emerald-600 hover:text-emerald-800' },
    getPath: (item) => `/universities/${item.id}`,
    getMeta: (item) => item.city ? `${item.city}${item.status ? ` · ${item.status === 'publique' ? 'Publique' : 'Privée'}` : ''}` : null,
  },
];

const ResultatsTest = () => {
  const location = useLocation();
  const results  = location.state?.results;

  if (!results) return <Navigate to="/test" replace />;

  const { recommended_jobs = [], recommended_programs = [], recommended_universities = [] } = results;
  const data = { recommended_jobs, recommended_programs, recommended_universities };

  if (recommended_jobs.length === 0 && recommended_programs.length === 0) {
    return (
      <EmptyState message="Nous n'avons pas pu déterminer de profil précis. Essayez de repasser le test." />
    );
  }

  return (
    <div className="space-y-10 py-6">

      {/* ===== HEADER ===== */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-50 border border-amber-100 mb-4">
          <Trophy className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Vos Résultats</h1>
        <p className="mt-3 max-w-xl mx-auto text-base text-slate-500">
          Basé sur vos réponses, voici les parcours qui vous correspondent le mieux.
        </p>
      </div>

      {/* ===== RESULT CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SECTIONS.map(({ key, icon: Icon, title, color, getPath, getMeta }) => {
          const items = data[key] || [];
          return (
            <div key={key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

              {/* Card header with gradient */}
              <div className={`bg-gradient-to-r ${color.header} px-5 py-4 flex items-center gap-3`}>
                <div className={`h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-base font-bold text-white">{title}</h2>
              </div>

              {/* Items list */}
              <ul className="divide-y divide-slate-100 flex-1">
                {items.length === 0 ? (
                  <li className="px-5 py-8 text-center text-sm text-slate-400">
                    Aucune recommandation disponible.
                  </li>
                ) : (
                  items.map((item) => {
                    const meta = getMeta(item);
                    return (
                      <li key={item.id} className="px-5 py-4 hover:bg-slate-50 transition-colors group">
                        <h3 className="font-semibold text-slate-900 text-sm">{item.name}</h3>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        {meta && (
                          <p className="text-xs text-slate-400 mt-0.5">{meta}</p>
                        )}
                        <Link
                          to={getPath(item)}
                          className={`inline-flex items-center gap-1 text-xs font-semibold mt-2 ${color.link} transition-colors`}
                        >
                          Voir les détails <ArrowRight className="h-3 w-3" />
                        </Link>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ===== FOOTER ACTION ===== */}
      <div className="text-center pt-2">
        <Link
          to="/test"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Repasser le test
        </Link>
      </div>
    </div>
  );
};

export default ResultatsTest;
