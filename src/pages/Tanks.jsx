import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Droplets, AlertTriangle } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const Tanks = () => {
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchTanks();
  }, []);

  const fetchTanks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/tanks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTanks(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des réservoirs', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (niveau, capacite) => {
    const percentage = (niveau / capacite) * 100;
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Droplets className="text-primary-600" />
              État des Réservoirs
            </h1>
            {user?.role === 'Admin' && (
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 transition">
                + Nouveau Réservoir
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-10">Chargement...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tanks.map((tank) => {
                const percentage = (tank.niveau / tank.capacite) * 100;
                const isLow = percentage <= 20;

                return (
                  <div key={tank.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${isLow ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{tank.nom}</h3>
                        <p className="text-gray-500 text-sm">Prix : {tank.prix_vente} GNF / L</p>
                      </div>
                      {isLow && (
                        <div className="flex items-center text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                          <AlertTriangle size={16} className="mr-1" />
                          Niveau Critique
                        </div>
                      )}
                    </div>
                    
                    <div className="mb-2 flex justify-between text-sm font-medium text-gray-700">
                      <span>{tank.niveau.toFixed(2)} L restants</span>
                      <span>{tank.capacite} L (Max)</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-4 rounded-full transition-all duration-1000 ${getLevelColor(tank.niveau, tank.capacite)}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {tanks.length === 0 && <p className="text-gray-500">Aucun réservoir configuré.</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Tanks;
