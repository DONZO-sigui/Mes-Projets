import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import ErrorAlert from '../components/ErrorAlert';
import { Mail, Lock, Eye, EyeOff, CheckCircle, Compass, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [showPwd,        setShowPwd]        = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const data = await login(email, password);
      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        navigate('/admin/dashboard');
      } else {
        setError("Identifiants invalides.");
      }
    } catch {
      setError("Identifiants incorrects. Vérifiez votre email et mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email) {
      setError("Saisissez votre email d'abord pour recevoir votre mot de passe.");
      return;
    }

    setLoading(true);
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage(data.message || `Un email a été envoyé à ${email}.`);
      } else {
        setError(data.error || "Erreur lors de l'envoi de l'email.");
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de joindre le serveur. Vérifiez que le backend est démarré.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">

        {/* Logo + heading */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <Compass className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">
              Orient<span className="text-primary-600">Guinée</span>
            </span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Connexion Étudiant</h1>
          <p className="mt-2 text-sm text-slate-500">
            Accédez à vos résultats sauvegardés et vos favoris.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">

          {error          && <ErrorAlert message={error} />}
          {successMessage && (
            <div className="rounded-xl bg-green-50 border border-green-100 p-4 flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="vous@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition bg-slate-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-0 inset-y-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed transition-colors shadow-sm mt-2"
            >
              {loading ? "Connexion en cours..." : (
                <> Se connecter <ArrowRight className="h-4 w-4" /> </>
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm text-slate-500">
            Pas encore de compte ?{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
              S&apos;inscrire gratuitement
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
