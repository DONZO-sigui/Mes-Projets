import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getJobById } from '../api/jobs';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import { Briefcase, Star, GraduationCap, ChevronLeft, BookOpen, Tag } from 'lucide-react';

const FicheMetier = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job,     setJob]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        const data = await getJobById(id);
        setJob(data);
      } catch (err) {
        setError("Impossible de charger les détails du métier.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  if (loading) return <Loading />;
  if (error)   return <ErrorAlert message={error} />;
  if (!job)    return <ErrorAlert message="Métier introuvable." />;

  const programs = job.programs || [];
  const tags = job.interest_tags ? job.interest_tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Retour
      </button>

      {/* Hero card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-700 to-primary-500 px-6 py-8 sm:px-10 flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{job.name}</h1>
            {job.sector && (
              <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white/90">
                {job.sector}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {job.description && (
          <div className="px-6 sm:px-10 py-6 border-b border-slate-100">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
              <BookOpen className="h-4 w-4" /> Description
            </h2>
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">{job.description}</p>
          </div>
        )}

        {/* Compétences requises */}
        {job.required_skills && (
          <div className="px-6 sm:px-10 py-6 bg-amber-50/60 border-b border-slate-100">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
              <Star className="h-4 w-4 text-amber-500" /> Compétences requises
            </h2>
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">{job.required_skills}</p>
          </div>
        )}

        {/* Centres d'intérêt */}
        {tags.length > 0 && (
          <div className="px-6 sm:px-10 py-6 border-b border-slate-100">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
              <Tag className="h-4 w-4" /> Centres d&apos;intérêt associés
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <span key={i} className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Formations recommandées */}
        <div className="px-6 sm:px-10 py-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            <GraduationCap className="h-4 w-4 text-indigo-500" /> Formations recommandées
          </h2>
          {programs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {programs.map(prog => (
                <Link
                  key={prog.id}
                  to={`/programs/${prog.id}`}
                  className="group flex flex-col p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-sm transition-all"
                >
                  <span className="font-semibold text-sm text-indigo-700 group-hover:text-indigo-800">{prog.name}</span>
                  <span className="mt-1 text-xs text-slate-500">
                    {prog.level}{prog.duration_years ? ` · ${prog.duration_years} an(s)` : ''}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Aucune formation spécifique associée dans la base de données.</p>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100 rounded-2xl p-6 text-center">
        <p className="text-sm text-slate-600 mb-4">
          Ce métier vous intéresse ? Passez notre test d&apos;orientation pour confirmer votre choix.
        </p>
        <Link
          to="/test"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-sm transition-all hover:-translate-y-0.5"
        >
          Passer le test gratuit <Briefcase className="h-4 w-4" />
        </Link>
      </div>

    </div>
  );
};

export default FicheMetier;
