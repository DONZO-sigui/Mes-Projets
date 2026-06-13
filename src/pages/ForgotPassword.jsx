import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Fuel, Mail, ArrowRight, CheckCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // We display the token for testing purposes since there is no real email sent
        setToken(data.token);
      } else {
        setError(data.message || 'Erreur lors de la demande');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-600 to-primary-500">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542340916-d3d63b4f91d9?auto=format&fit=crop&q=80')] mix-blend-overlay opacity-10 bg-cover bg-center"></div>
      
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10 mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg text-primary-600">
            <Fuel size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Mot de passe oublié</h1>
          <p className="text-gray-500 text-sm mt-1 text-center">Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200 text-center">
            <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
            <p className="font-medium mb-2">Demande envoyée !</p>
            <p className="text-sm mb-4">Pour tester, voici votre lien de réinitialisation :</p>
            <Link 
              to={`/reset-password?token=${token}`}
              className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Aller réinitialiser
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors bg-white/50 focus:bg-white"
                  placeholder="admin@station.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all hover:shadow-lg active:scale-95"
            >
              Envoyer la demande
              <ArrowRight size={18} className="ml-2" />
            </button>
            
            <div className="text-center mt-4">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary-600 hover:underline">
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
