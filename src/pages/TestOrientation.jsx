import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitQuiz } from '../api/quiz';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import { CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

const QUESTIONS = [
  {
    id: 1,
    text: "Quelles matières vous passionnent le plus au lycée ?",
    options: [
      { id: 'maths',   label: "Mathématiques et Physique" },
      { id: 'bio',     label: "Biologie et Chimie" },
      { id: 'lettres', label: "Littérature et Philosophie" },
      { id: 'eco',     label: "Économie et Gestion" },
    ],
  },
  {
    id: 2,
    text: "Dans quel type d'environnement préférez-vous travailler ?",
    options: [
      { id: 'bureau',  label: "Dans un bureau, sur ordinateur" },
      { id: 'terrain', label: "Sur le terrain, en extérieur" },
      { id: 'labo',    label: "En laboratoire, pour la recherche" },
      { id: 'public',  label: "En contact constant avec le public" },
    ],
  },
  {
    id: 3,
    text: "Quelle est votre principale qualité ?",
    options: [
      { id: 'logique',    label: "Logique et rigueur" },
      { id: 'creativite', label: "Créativité et imagination" },
      { id: 'empathie',   label: "Écoute et empathie" },
      { id: 'leadership', label: "Leadership et organisation" },
    ],
  },
];

const TestOrientation = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers,     setAnswers]     = useState({});
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  const question = QUESTIONS[currentStep];
  const progress  = ((currentStep + 1) / QUESTIONS.length) * 100;
  const isLast    = currentStep === QUESTIONS.length - 1;

  const handleSelect = (qId, optId) => setAnswers({ ...answers, [qId]: optId });

  const handleNext = () => {
    if (!isLast) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const results = await submitQuiz(answers);
      navigate('/results', { state: { results } });
    } catch (err) {
      setError("Erreur lors de la soumission du test.");
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-2xl mx-auto py-10">

      {/* ===== HEADER ===== */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Test d&apos;orientation</h1>
        <p className="mt-2 text-sm text-slate-500">
          Répondez à {QUESTIONS.length} questions pour découvrir votre profil idéal.
        </p>
      </div>

      {/* ===== CARD ===== */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">

        {/* Step indicator */}
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-primary-600 uppercase tracking-widest">
              Question {currentStep + 1} / {QUESTIONS.length}
            </span>
            <div className="flex gap-1.5">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i < currentStep
                      ? 'w-6 bg-primary-500'
                      : i === currentStep
                        ? 'w-6 bg-primary-600'
                        : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question body */}
        <div className="px-6 py-8">
          {error && <ErrorAlert message={error} />}

          <h2 className="text-xl font-bold text-slate-900 mb-6 leading-snug">
            {question.text}
          </h2>

          <div className="space-y-3">
            {question.options.map((option) => {
              const selected = answers[question.id] === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(question.id, option.id)}
                  className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all duration-150 flex justify-between items-center gap-3 ${
                    selected
                      ? 'border-primary-500 bg-primary-50 text-primary-800 shadow-sm'
                      : 'border-slate-200 hover:border-primary-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-medium text-sm sm:text-base">{option.label}</span>
                  {selected
                    ? <CheckCircle2 className="h-5 w-5 text-primary-500 flex-shrink-0" />
                    : <div className="h-5 w-5 rounded-full border-2 border-slate-200 flex-shrink-0" />
                  }
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentStep === 0
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ChevronLeft className="h-4 w-4" /> Précédent
          </button>

          <button
            onClick={handleNext}
            disabled={!answers[question.id]}
            className={`inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
              !answers[question.id]
                ? 'bg-primary-200 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 shadow-sm hover:shadow-md'
            }`}
          >
            {isLast ? 'Terminer le test' : 'Question suivante'}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestOrientation;
