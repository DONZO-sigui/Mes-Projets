import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Fuel, Lock, Mail, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.token);
        navigate('/dashboard');
      } else {
        setError(data.message || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-gray-50">
      {/* Left side: Image */}
      <div className="hidden lg:flex relative flex-col justify-end p-12">
        {/* We use a professional gas station / mechanic image from Unsplash */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1573075184285-b0625a76e737?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary-900/95 via-primary-800/60 to-primary-900/10 mix-blend-multiply"></div>
        
        <div className="relative z-10 text-white mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg">
              <Fuel size={28} className="text-white" />
            </div>
            <span className="text-2xl font-bold tracking-wider">Station Manager Pro</span>
          </div>
          <h2 className="text-4xl font-bold mb-4 leading-tight">L'excellence au service de vos clients</h2>
          <p className="text-primary-100 text-lg max-w-md leading-relaxed">Une solution complète et intuitive pour gérer les opérations de votre station-service avec efficacité et élégance.</p>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="flex items-center justify-center p-8 bg-white lg:rounded-l-[2rem] lg:-ml-6 shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.1)] relative z-20">
        <div className="w-full max-w-md">
          {/* Mobile Header (Hidden on large screens) */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4 shadow-sm text-primary-600">
              <Fuel size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Station Manager Pro</h1>
          </div>
          
          <div className="mb-8 hidden lg:block">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Bienvenue 👋</h2>
            <p className="text-gray-500">Connectez-vous pour accéder à votre tableau de bord.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 flex items-center">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email professionnel</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 sm:text-sm transition-all bg-gray-50 hover:bg-white focus:bg-white"
                  placeholder="admin@station.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 sm:text-sm transition-all bg-gray-50 hover:bg-white focus:bg-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 mt-2"
            >
              Se connecter
              <ArrowRight size={18} className="ml-2" />
            </button>
            
            <div className="flex flex-col space-y-3 mt-6 pt-6 border-t border-gray-100 text-center">
              <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline transition-colors">
                Mot de passe oublié ?
              </Link>
              <div className="text-sm text-gray-500">
                Pas encore de compte ?{' '}
                <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors">
                  S'inscrire
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
