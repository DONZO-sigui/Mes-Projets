import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFacultyById } from '../api/faculties';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import { BookOpen, GraduationCap, ChevronLeft, ArrowRight, Clock } from 'lucide-react';

const LEVEL_COLORS = {
  Licence: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Master:  'bg-purple-50 text-purple-700 border-purple-100',
  Doctorat:'bg-rose-50 text-rose-700 border-rose-100',
};

const FicheFaculte = () => {
  const { id } = useParams();
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        setLoading(true);
        const data = await getFacultyById(id);
        setFaculty(data);
      } catch (err) {
        setError("Impossible de charger les détails de la faculté.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFaculty();
  }, [id]);

  if (loading) return <Loading />;
  if (error)   return <ErrorAlert message={error} />;
  if (!faculty) return <ErrorAlert message="Faculté introuvable." />;

  const programs = faculty.programs || [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Back */}
      {faculty.university_id && (
        <Link
          to={`/universities/${faculty.university_id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Retour à l&apos;université
        </Link>
      )}

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

        {/* Banner */}
        <div className="bg-gradient-to-r from-primary-800 to-primary-600 px-6 py-8 sm:px-10 flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">{faculty.name}</h1>
            {faculty.university && (
              <p className="mt-1 text-sm text-white/70">{faculty.university.name}</p>
            )}
          </div>
        </div>

        {/* Description */}
        {faculty.description && (
          <div className="px-6 sm:px-10 py-6 border-b border-slate-100">
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">{faculty.description}</p>
          </div>
        )}

        {/* Programs list */}
        <div className="px-6 sm:px-10 py-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-5">
            <GraduationCap className="h-4 w-4" /> Programmes et Filières ({programs.length})
          </h2>

          {programs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {programs.map((program) => {
                const levelCls = LEVEL_COLORS[program.level] || 'bg-slate-100 text-slate-700 border-slate-200';
                return (
                  <Link
                    key={program.id}
                    to={`/programs/${program.id}`}
                    className="group flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-primary-200 hover:bg-primary-50 hover:shadow-sm transition-all"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <h3 className="font-semibold text-sm text-slate-800 group-hover:text-primary-700 transition-colors leading-snug">
                        {program.name}
                      </h3>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {program.level && (
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${levelCls}`}>
                            {program.level}
                          </span>
                        )}
                        {program.duration_years && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="h-3 w-3" /> {program.duration_years} an(s)
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary-500 flex-shrink-0 mt-0.5 transition-colors" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Aucun programme répertorié pour cette faculté.</p>
          )}
        </div>
      </div>

    </div>
  );
};

export default FicheFaculte;
