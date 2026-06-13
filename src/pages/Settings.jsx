import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Save, Building2, MapPin, Phone, Mail, DollarSign, Loader2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const Settings = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    nom_entreprise: '',
    adresse: '',
    telephone: '',
    email: '',
    devise: 'GNF'
  });

  const devisesList = [
    { label: 'Euro (€)', value: '€' },
    { label: 'Franc CFA (FCFA)', value: 'FCFA' },
    { label: 'Dollar US ($)', value: '$' },
    { label: 'Dirham Marocain (MAD)', value: 'MAD' },
    { label: 'Dinar Algérien (DZD)', value: 'DZD' },
    { label: 'Franc Guinéen (GNF)', value: 'GNF' }
  ];

  useEffect(() => {
    fetch('http://localhost:5000/api/settings')
      .then(res => res.json())
      .then(data => {
        if (!data.message) {
          setFormData({
            nom_entreprise: data.nom_entreprise || '',
            adresse: data.adresse || '',
            telephone: data.telephone || '',
            email: data.email || '',
            devise: data.devise || 'GNF'
          });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Erreur lors du chargement des paramètres.');
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Auth header if needed
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(data.message || 'Erreur lors de la sauvegarde.');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setSaving(false);
    }
  };

  // Restrict to Admin
  if (user?.role !== 'Admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-red-500 mb-2">Accès Refusé</h2>
            <p className="text-gray-600">Vous n'avez pas les droits d'administration pour accéder à cette page.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Paramètres Généraux</h1>
                <p className="text-gray-500 text-sm mt-1">Gérez les informations de la station et les préférences d'affichage.</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8">
                  {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 font-medium">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm mb-6 border border-green-200 font-medium">
                      Les paramètres ont été mis à jour avec succès.
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Infos entreprise */}
                    <div className="border-b border-gray-100 pb-6 mb-6">
                      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Building2 size={20} className="text-primary-500" />
                        Identité de la station
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'entreprise</label>
                          <input
                            type="text"
                            name="nom_entreprise"
                            value={formData.nom_entreprise}
                            onChange={handleChange}
                            className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 sm:text-sm bg-gray-50 hover:bg-white focus:bg-white transition-colors"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                            <MapPin size={16} className="text-gray-400"/> Adresse
                          </label>
                          <input
                            type="text"
                            name="adresse"
                            value={formData.adresse}
                            onChange={handleChange}
                            className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 sm:text-sm bg-gray-50 hover:bg-white focus:bg-white transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                            <Phone size={16} className="text-gray-400"/> Téléphone
                          </label>
                          <input
                            type="text"
                            name="telephone"
                            value={formData.telephone}
                            onChange={handleChange}
                            className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 sm:text-sm bg-gray-50 hover:bg-white focus:bg-white transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                            <Mail size={16} className="text-gray-400"/> Email de contact
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 sm:text-sm bg-gray-50 hover:bg-white focus:bg-white transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Préférences */}
                    <div className="pb-4">
                      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <DollarSign size={20} className="text-primary-500" />
                        Préférences régionales
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Devise principale</label>
                          <div className="relative">
                            <select
                              name="devise"
                              value={formData.devise}
                              onChange={handleChange}
                              className="block w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 sm:text-sm bg-gray-50 hover:bg-white focus:bg-white transition-colors appearance-none"
                            >
                              {devisesList.map((dev) => (
                                <option key={dev.value} value={dev.value}>{dev.label}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <DollarSign size={16} className="text-gray-400" />
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Cette devise sera utilisée sur tous les affichages financiers du tableau de bord.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500/30 transition-all disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Save size={18} />
                        )}
                        Sauvegarder les paramètres
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
