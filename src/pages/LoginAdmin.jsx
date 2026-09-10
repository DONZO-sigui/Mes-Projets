import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import ErrorAlert from '../components/ErrorAlert';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const LoginAdmin = () => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(email, password);
      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        navigate('/admin/dashboard');
      } else {
        setError('Identifiants invalides.');
      }
    } catch {
      setError('Identifiants incorrects ou serveur inaccessible. Vérifiez que le backend est démarré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-10">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary-50 border border-primary-100 mb-4">
              <ShieldCheck className="h-7 w-7 text-primary-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Espace Admin</h1>
            <p className="mt-1.5 text-sm text-slate-500">Connectez-vous pour gérer le contenu</p>
          </div>

          {error && <div className="mb-5"><ErrorAlert message={error} /></div>}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Adresse e-mail
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@orientguinee.gn"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          {/* Credentials hint */}
          <div className="mt-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[11px] text-slate-400 text-center font-mono">
              admin@orientguinee.gn · Admin2025!
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Accès réservé aux administrateurs OrientGuinée
        </p>
      </div>
    </div>
  );
};

export default LoginAdmin;
