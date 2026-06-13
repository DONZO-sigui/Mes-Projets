import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Clock, Download, ArrowDownToLine } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/sales/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        setError('Erreur d\'autorisation ou de serveur');
      }
    } catch (error) {
      console.error('Erreur réseau', error);
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-gray-500 bg-white p-8 rounded-xl shadow-sm text-center">
            <h2 className="text-xl font-bold mb-2">Accès Refusé</h2>
            <p>Seul l'administrateur peut consulter l'historique des ventes.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Clock className="text-primary-600" />
              Historique des Ventes
            </h1>
            <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center gap-2 text-sm font-medium">
              <ArrowDownToLine size={16} />
              Exporter (CSV)
            </button>
          </div>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b border-gray-100">Date & Heure</th>
                    <th className="p-4 font-semibold border-b border-gray-100">Carburant</th>
                    <th className="p-4 font-semibold border-b border-gray-100">Litres</th>
                    <th className="p-4 font-semibold border-b border-gray-100">Montant (GNF)</th>
                    <th className="p-4 font-semibold border-b border-gray-100">Paiement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-500">Chargement...</td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-500">Aucune vente enregistrée.</td>
                    </tr>
                  ) : (
                    history.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-gray-800 text-sm font-medium">
                          {formatDate(sale.created_at)}
                        </td>
                        <td className="p-4 text-gray-600 text-sm">
                          {sale.reservoir_nom}
                        </td>
                        <td className="p-4 text-gray-600 text-sm">
                          {parseFloat(sale.quantite).toFixed(2)} L
                        </td>
                        <td className="p-4 text-gray-800 font-bold">
                          {parseFloat(sale.montant_total).toLocaleString('fr-FR')} GNF
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            sale.mode_paiement === 'Espèces' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {sale.mode_paiement}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
};

export default History;
