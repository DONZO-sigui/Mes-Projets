import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ErrorAlert from '../components/ErrorAlert';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle, GraduationCap } from 'lucide-react';

const InputField = ({ label, id, type = 'text', icon: Icon, value, onChange, placeholder, required, autoComplete }) => {
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPwd ? 'text' : 'password') : type;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icon className="h-4 w-4 text-slate-400" />
          </div>
        )}
        <input
          id={id}
          name={id}
          type={inputType}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} ${isPassword ? 'pr-10' : 'pr-4'} py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setSuccessMessage("Compte créé avec succès ! Redirection vers la connexion…");
      setTimeout(() => navigate('/login'), 2000);
    }, 1500);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-10">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary-50 border border-primary-100 mb-4">
              <GraduationCap className="h-7 w-7 text-primary-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Créer un compte</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Rejoignez OrientGuinée pour sauvegarder vos résultats
            </p>
          </div>

          {/* Alerts */}
          {error && <div className="mb-5"><ErrorAlert message={error} /></div>}
          {successMessage && (
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 px-4 py-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Prénom"
                id="firstName"
                icon={User}
                placeholder="Mamadou"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              <InputField
                label="Nom"
                id="lastName"
                placeholder="Diallo"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <InputField
              label="Adresse e-mail"
              id="email"
              type="email"
              icon={Mail}
              placeholder="vous@exemple.gn"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <InputField
              label="Mot de passe"
              id="password"
              type="password"
              icon={Lock}
              placeholder="8 caractères minimum"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <InputField
              label="Confirmer le mot de passe"
              id="confirmPassword"
              type="password"
              icon={Lock}
              placeholder="Répétez le mot de passe"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition-colors shadow-sm hover:shadow-md"
            >
              {loading ? 'Création en cours…' : "S'inscrire gratuitement"}
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Se connecter
            </Link>
          </p>
        </div>

        {/* MESRSI note */}
        <p className="mt-5 text-center text-xs text-slate-400">
          Plateforme officielle — Ministère de l&apos;Enseignement Supérieur de Guinée
        </p>
      </div>
    </div>
  );
};

export default Register;
