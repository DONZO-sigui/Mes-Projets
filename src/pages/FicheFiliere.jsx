import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProgramById } from '../api/programs';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import { Clock, Info, Briefcase, ChevronLeft, GraduationCap, List } from 'lucide-react';

const LEVEL_COLORS = {
  Licence: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Master:  'bg-purple-50 text-purple-700 border-purple-100',
  Doctorat:'bg-rose-50 text-rose-700 border-rose-100',
};

const FicheFiliere = () => {
  const { id } = useParams();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        setLoading(true);
        const data = await getProgramById(id);
        setProgram(data);
      } catch (err) {
        setError("Impossible de charger les détails de la filière.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgram();
  }, [id]);

  if (loading) return <Loading />;
  if (error)   return <ErrorAlert message={error} />;
  if (!program) return <ErrorAlert message="Filière introuvable." />;

  const specialties = program.specialties || [];
  const jobs        = program.jobs        || [];
  const levelCls    = LEVEL_COLORS[program.level] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Back */}
      {program.faculty_id && (
        <Link
          to={`/faculties/${program.faculty_id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Retour à la faculté
        </Link>
      )}

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-6 py-8 sm:px-10">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${levelCls}`}>
              {program.level}
            </span>
            {program.duration_years && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                <Clock className="h-3.5 w-3.5" /> {program.duration_years} an(s)
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">{program.name}</h1>
        </div>

        {/* Conditions d'admission */}
        <div className="px-6 sm:px-10 py-6 border-b border-slate-100">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
            <Info className="h-4 w-4" /> Conditions d&apos;admission
          </h2>
          <p className="text-slate-700 leading-relaxed whitespace-pre-line">
            {program.admission_conditions || "Non spécifiées."}
          </p>
        </div>

        {/* Spécialités */}
        <div className="px-6 sm:px-10 py-6 bg-slate-50 border-b border-slate-100">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            <List className="h-4 w-4" /> Spécialités
          </h2>
          {specialties.length > 0 ? (
            <div className="space-y-3">
              {specialties.map(spec => (
                <div key={spec.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <h3 className="font-semibold text-slate-800">{spec.name}</h3>
                  {spec.description && <p className="mt-1 text-sm text-slate-600">{spec.description}</p>}
                  {spec.key_subjects && (
                    <p className="mt-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">Matières clés :</span> {spec.key_subjects}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Formation généraliste (pas de spécialités distinctes).</p>
          )}
        </div>

        {/* Débouchés */}
        <div className="px-6 sm:px-10 py-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            <Briefcase className="h-4 w-4 text-emerald-500" /> Débouchés professionnels
          </h2>
          {jobs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {jobs.map(job => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="px-3.5 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                >
                  {job.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Aucun métier spécifique associé.</p>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-indigo-50 to-primary-50 border border-indigo-100 rounded-2xl p-6 text-center">
        <p className="text-sm text-slate-600 mb-4">
          Cette filière vous attire ? Confirmez votre orientation avec notre test personnalisé.
        </p>
        <Link
          to="/test"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all hover:-translate-y-0.5"
        >
          Passer le test gratuit <GraduationCap className="h-4 w-4" />
        </Link>
      </div>

    </div>
  );
};

export default FicheFiliere;
