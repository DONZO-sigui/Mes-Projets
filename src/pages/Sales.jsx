import React, { useState, useEffect } from 'react';
import { CreditCard, Fuel, ArrowRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const Sales = () => {
  const [tanks, setTanks] = useState([]);
  const [selectedTank, setSelectedTank] = useState('');
  const [montant, setMontant] = useState('');
  const [litres, setLitres] = useState('');
  const [modePaiement, setModePaiement] = useState('Carte');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Récupérer les réservoirs pour la sélection
    fetch('http://localhost:5000/api/tanks', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      setTanks(data);
      if(data.length > 0) setSelectedTank(String(data[0].id));
    })
    .catch(err => console.error(err));
  }, []);

  const handleSale = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch('http://localhost:5000/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reservoir_id: selectedTank,
          montant_total: parseFloat(montant),
          mode_paiement: modePaiement
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: `Vente validée ! ${data.quantite_litres.toFixed(2)} Litres servis.`, type: 'success' });
        setMontant('');
      } else {
        setMessage({ text: data.message || 'Erreur lors de la vente', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Erreur réseau', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMontantChange = (e) => {
    const value = e.target.value;
    setMontant(value);
    const activeTank = tanks.find(t => String(t.id) === String(selectedTank));
    if (activeTank && value) {
      setLitres((parseFloat(value) / activeTank.prix_vente).toFixed(2));
    } else {
      setLitres('');
    }
  };

  const handleLitresChange = (e) => {
    const value = e.target.value;
    setLitres(value);
    const activeTank = tanks.find(t => String(t.id) === String(selectedTank));
    if (activeTank && value) {
      setMontant(Math.round(parseFloat(value) * activeTank.prix_vente));
    } else {
      setMontant('');
    }
  };

  const handleTankChange = (e) => {
    setSelectedTank(e.target.value);
    setMontant('');
    setLitres('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-8 flex items-center justify-center">
        <div className="w-full max-w-lg bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Caisse Enregistreuse</h1>
            <p className="text-gray-500">Nouvelle vente de carburant</p>
          </div>

          {message.text && (
            <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSale} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de Carburant</label>
              <select 
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-50"
                value={String(selectedTank)}
                onChange={handleTankChange}
                required
              >
                {tanks.length === 0 && <option value="">Aucun réservoir disponible</option>}
                {tanks.map(tank => (
                  <option key={tank.id} value={String(tank.id)}>{tank.nom} - {tank.prix_vente} GNF/L</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Volume (Litres)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">L</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.1"
                    className="w-full pl-10 p-4 text-2xl font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-50"
                    placeholder="0.00"
                    value={litres}
                    onChange={handleLitresChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Montant Payé (GNF)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">GNF</span>
                  <input 
                    type="number" 
                    step="1"
                    min="100"
                    className="w-full pl-16 p-4 text-2xl font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-50"
                    placeholder="0"
                    value={montant}
                    onChange={handleMontantChange}
                    required
                  />
                </div>
              </div>
            