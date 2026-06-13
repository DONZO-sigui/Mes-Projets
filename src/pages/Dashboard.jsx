import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Droplets, CreditCard, Users, LogOut, Fuel } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ ca_jour: 0, litres_jour: 0 });
  const [settings, setSettings] = useState({ nom_entreprise: 'Station Pro', devise: 'GNF' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch settings and stats in parallel
    Promise.all([
      fetch('http://localhost:5000/api/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => res.json()),
      fetch('http://localhost:5000/api/settings').then(res => res.json())
    ])
    .then(([statsData, settingsData]) => {
      setStats({
        ca_jour: statsData.ca_jour || 0,
        litres_jour: statsData.litres_jour || 0
      });
      if (!settingsData.message) {
        setSettings({
          nom_entreprise: settingsData.nom_entreprise || 'Station Pro',
          devise: settingsData.devise || 'GNF'
        });
      }
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-100 p-6 flex justify-between items-center md:hidden">
          <div className="flex items-center gap-2 text-primary-600 font-bold text-lg">
            <Fuel size={20} /> {settings.nom_entreprise}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-8">Tableau de bord</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 text-gray-500 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                    <Droplets size={20} />
                  </div>
                  Volume Vendu (Aujourd'hui)
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {loading ? '...' : parseFloat(stats.litres_jour).toFixed(2)} L
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 text-gray-500 mb-2">
                  <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  Chiffre d'affaires
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {loading ? '...' : `${parseFloat(stats.ca_jour).toFixed(2)} ${settings.devise}`}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 text-gray-500 mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  Session Active
                </div>
                <div className="text-xl font-semibold text-gray-800">{user?.nom || 'Utilisateur'}</div>
                <div className="text-sm text-gray-500">{user?.role}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center h-64 text-center">
              <Fuel className="text-gray-300 w-16 h-16 mb-4" />
              <h2 className="text-xl font-bold text-gray-700">Prêt pour une nouvelle journée</h2>
              <p className="text-gray-500 max-w-md mt-2">Utilisez le menu de gauche pour accéder à la caisse ou vérifier l'état de vos réservoirs.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
