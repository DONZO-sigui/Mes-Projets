import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUniversities } from '../api/universities';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import {
  GraduationCap, ArrowRight, BookOpen, Briefcase,
  MessageCircle, Search, BarChart2,
} from 'lucide-react';

const STATS = (count) => [
  { icon: GraduationCap, label: 'Universités partenaires', value: `${count}+`, iconCls: 'text-primary-600 bg-primary-50', borderCls: 'border-primary-100' },
  { icon: BookOpen,      label: "Filières d'études",       value: '120+',      iconCls: 'text-indigo-600 bg-indigo-50',   borderCls: 'border-indigo-100' },
  { icon: Briefcase,     label: 'Métiers répertoriés',     value: '300+',      iconCls: 'text-emerald-600 bg-emerald-50', borderCls: 'border-emerald-100' },
];

const HOW_STEPS = [
  {
    step: '01', icon: Search, title: 'Explorez',
    desc: 'Parcourez notre annuaire complet des universités et filières disponibles en Guinée.',
    cls: 'text-primary-600 bg-primary-50',
  },
  {
    step: '02', icon: BarChart2, title: 'Testez-vous',
    desc: "Répondez au test d'orientation personnalisé pour découvrir les métiers qui vous correspondent.",
    cls: 'text-indigo-600 bg-indigo-50',
  },
  {
    step: '03', icon: MessageCircle, title: 'Conseillez-vous',
    desc: 'Discutez avec notre Conseiller IA disponible 24h/24 pour affiner votre projet d\'avenir.',
    cls: 'text-emerald-600 bg-emerald-50',
  },
];

const Accueil = () => {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getUniversities({ limit: 4 });
        setStats({ universitiesCount: data.total || 15 });
      } catch (err) {
        setError("Impossible de charger les données d'accueil.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Loading />;
  if (error)   return <ErrorAlert message={error} />;

  return (
    <div>

      {/* ===================================================
          HERO — fond clair pour laisser apparaître le logo MESRSI
          =================================================== */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
        <section className="relative bg-white overflow-hidden border-b border-slate-100">

          {/* Dégradé subtil en haut à gauche */}
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary-50 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          {/* Dégradé subtil en bas à droite */}
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-sky-50 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />

          {/* ★ Logo MESRSI — bien visible au centre */}
          <img
            src="/mesrsi.svg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 m-auto h-72 sm:h-[420px] w-auto object-contain opacity-[0.13] select-none pointer-events-none"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">

            {/* Badge */}
            <span className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100 mb-7">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Plateforme d&apos;orientation #1 en Guinée
            </span>

            {/* Headline */}
            <h1 className="animate-fade-in-up-d1 text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
              Trouvez votre voie avec
              <br />
              <span className="text-primary-600">OrientGuinée</span>
            </h1>

            {/* Sub-headline */}
            <p className="animate-fade-in-up-d2 mt-6 max-w-2xl mx-auto text-base sm:text-lg text-slate-500 leading-relaxed">
              Plateforme d&apos;orientation pour les nouveaux bacheliers guinéens. Découvrez
              les universités, les filières et discutez avec notre Conseiller IA pour trouver
              le métier qui vous correspond.
            </p>

            {/* CTAs */}
            <div className="animate-fade-in-up-d3 mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.dispatchEvent(new Event('open-chatbot'))}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                <MessageCircle className="h-5 w-5" />
                Parler à notre Conseiller IA
              </button>
              <Link
                to="/universities"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-primary-600 border-2 border-primary-200 hover:border-primary-400 hover:bg-primary-50 transition-all"
              >
                Voir les universités
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* ===================================================
          STATS — floating cards below hero
          =================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-10">
        {STATS(stats?.universitiesCount).map(({ icon: Icon, label, value, iconCls, borderCls }) => (
          <div
            key={label}
            className={`bg-white rounded-2xl shadow-sm border ${borderCls} p-6 flex items-center gap-4 hover:shadow-md transition-shadow`}
          >
            <div className={`h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 ${iconCls}`}>
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900">{value}</div>
              <div className="text-sm text-slate-500 font-medium mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ===================================================
          HOW IT WORKS
          =================================================== */}
      <section className="mt-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Comment ça fonctionne ?</h2>
        <p className="mt-3 text-base text-slate-500 max-w-xl mx-auto">
          Trois étapes simples pour trouver votre orientation idéale.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px bg-slate-200 -z-0" />

          {HOW_STEPS.map(({ step, icon: Icon, title, desc, cls }) => (
            <div key={step} className="relative flex flex-col items-center text-center px-4">
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-5 ${cls} shadow-sm z-10`}>
                <Icon className="h-8 w-8" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Étape {step}</span>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================================================
          CTA BANNER
          =================================================== */}
      <section className="mt-20 mb-4">
        <div className="relative bg-gradient-to-r from-primary-700 to-primary-500 rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden">
          {/* Decorative dots */}
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />
          <GraduationCap className="relative mx-auto h-12 w-12 text-primary-200 mb-5" />
          <h2 className="relative text-2xl sm:text-3xl font-bold">Prêt à trouver votre voie ?</h2>
          <p className="relative mt-3 text-primary-100 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
            Passez notre test d&apos;orientation gratuit et recevez des recommandations personnalisées en moins de 5 minutes.
          </p>
          <Link
            to="/test"
            className="relative mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold bg-white text-primary-700 hover:bg-primary-50 shadow-lg transition-all hover:-translate-y-0.5"
          >
            Passer le test gratuitement
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

    </div>
  );
};

export default Accueil;
