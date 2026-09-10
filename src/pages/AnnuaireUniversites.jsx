import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUniversities } from '../api/universities';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import EmptyState from '../components/EmptyState';
import { Search, MapPin, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';

// Sous-composant : gère le logo avec fallback automatique si l'image est cassée
const UniLogo = ({ uni }) => {
  const [imgError, setImgError] = useState(false);

  if (uni.logo_url && !imgError) {
    return (
      <img
        className="h-full w-full object-contain p-2"
        src={uni.logo_url}
        alt={`Logo ${uni.name}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <Building2 className="h-7 w-7 text-slate-300" />
      <span className="text-[11px] font-bold text-slate-400 leading-none tracking-wide">
        {uni.acronym || uni.name.substring(0, 3).toUpperCase()}
      </span>
    </div>
  );
};

const AnnuaireUniversites = () => {
  const [universities, setUniversities] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter,   setCityFilter]   = useState('');
  const [page,         setPage]         = useState(1);

  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        setLoading(true);
        const params = {
          page, limit: 10,
          ...(searchTerm   && { search: searchTerm }),
          ...(statusFilter && { status: statusFilter }),
          ...(cityFilter   && { city: cityFilter }),
        };
        const data = await getUniversities(params);
        setUniversities(data.data || data.items || data);
      } catch (err) {
        setError("Erreur lors de la récupération des universités.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchUniversities, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, cityFilter, page]);

  return (
    <div className="space-y-6">

      {/* ===== PAGE HEADER ===== */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Annuaire des Universités</h1>
        <p className="mt-1 text-sm text-slate-500">
          Explorez toutes les institutions d&apos;enseignement supérieur disponibles en Guinée.
        </p>
      </div>

      {/* ===== FILTERS ===== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition bg-slate-50"
              placeholder="Rechercher une université..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>

          {/* Status filter */}
          <div className="w-full md:w-44">
            <select
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition bg-slate-50 text-slate-700"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tous les statuts</option>
              <option value="publique">Publique</option>
              <option value="privee">Privée</option>
            </select>
          </div>

          {/* City filter */}
          <div className="w-full md:w-44 relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition bg-slate-50"
              placeholder="Ville (ex : Conakry)"
              value={cityFilter}
              onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* ===== RESULTS ===== */}
      {error ? (
        <ErrorAlert message={error} />
      ) : loading ? (
        <Loading />
      ) : universities.length === 0 ? (
        <EmptyState message="Aucune université ne correspond à vos critères." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {universities.map((uni) => (
              <Link
                key={uni.id}
                to={`/universities/${uni.id}`}
                className="group flex flex-col items-center bg-white border border-slate-100 rounded-2xl p-4 text-center hover:border-primary-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
              >
                {/* Logo / Avatar */}
                <div className="h-20 w-20 mb-3 rounded-xl bg-slate-50 border-2 border-slate-100 group-hover:border-primary-100 flex items-center justify-center overflow-hidden transition-colors shadow-sm">
                  <UniLogo uni={uni} />
                </div>

                {/* Name */}
                <h3 className="text-xs font-semibold text-slate-800 line-clamp-2 group-hover:text-primary-600 transition-colors leading-snug">
                  {uni.name}
                </h3>

                {/* Status badge */}
                {uni.status && (
                  <span className={`mt-2.5 px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full ${
                    uni.status === 'publique'
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    {uni.status === 'publique' ? 'Publique' : 'Privée'}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">Page {page}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  page === 1
                    ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed'
                    : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                }`}
              >
                <ChevronLeft className="h-4 w-4" /> Précédent
              </button>
              <button
                onClick={() => setPage(page + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnuaireUniversites;
