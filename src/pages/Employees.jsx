import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Users, UserPlus, Trash2, Shield, User } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nom: '', email: '', password: '', role: 'Caissier' });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Erreur', error);
      setError('Erreur lors du chargement des employés.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        setEmployees([...employees, data.user]);
        setShowForm(false);
        setFormData({ nom: '', email: '', password: '', role: 'Caissier' });
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Erreur de création');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet employé ?')) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (response.ok) {
        setEmployees(employees.filter(emp => emp.id !== id));
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  if (user?.role !== 'Admin') {
    return <div className="p-8 text-center">Accès Refusé.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-primary-600" />
              Équipe & Employés
            </h1>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition flex items-center gap-2 font-medium"
            >
              <UserPlus size={18} />
              {showForm ? 'Annuler' : 'Ajouter un employé'}
            </button>
          </div>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          {showForm && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
              <h2 className="text-lg font-bold mb-4">Nouvel Employé</h2>
              <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nom complet</label>
                  <input type="text" required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Mot de passe provisoire</label>
                  <input type="text" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Rôle</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 outline-none bg-white">
                    <option value="Caissier">Caissier</option>
                    <option value="Admin">Administrateur</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end mt-2">
                  <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition">Valider l'ajout</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? <p>Chargement...</p> : employees.map(emp => (
              <div key={emp.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition">
                <div className="flex gap-4 items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${emp.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {emp.nom.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{emp.nom}</h3>
                    <p className="text-sm text-gray-500">{emp.email}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs font-semibold">
                      {emp.role === 'Admin' ? <Shield size={14} className="text-purple-600"/> : <User size={14} className="text-blue-600"/>}
                      <span className={emp.role === 'Admin' ? 'text-purple-600' : 'text-blue-600'}>{emp.role}</span>
                    </div>
                  </div>
                </div>
                {user.id !== emp.id && (
                  <button onClick={() => handleDelete(emp.id)} className="text-gray-400 hover:text-red-500 transition p-2 rounded-lg hover:bg-red-50">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Employees;
