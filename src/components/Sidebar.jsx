import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Fuel, Users, Droplets, CreditCard, LayoutDashboard, Clock, Settings } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navClass = ({ isActive }) => 
    `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
      isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-100 flex flex-col hidden md:flex h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 text-primary-600 font-bold text-xl border-b border-gray-100">
        <Fuel size={24} />
        Station Pro
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/dashboard" className={navClass}>
          <LayoutDashboard size={20} /> Vue d'ensemble
        </NavLink>
        <NavLink to="/sales" className={navClass}>
          <CreditCard size={20} /> Caisse / Ventes
        </NavLink>
        <NavLink to="/tanks" className={navClass}>
          <Droplets size={20} /> Réservoirs
        </NavLink>
        {user?.role === 'Admin' && (
          <>
            <NavLink to="/history" className={navClass}>
              <Clock size={20} /> Historique
            </NavLink>
            <NavLink to="/employees" className={navClass}>
              <Users size={20} /> Employés
            </NavLink>
            <NavLink to="/settings" className={navClass}>
              <Settings size={20} /> Paramètres
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 font-medium">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
              {user?.nom?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 truncate">
              <div className="truncate">{user?.nom || 'Utilisateur'}</div>
              <div className="text-xs text-gray-500 font-normal">{user?.role}</div>
            </div>
        </div>
        <button 
          onClick={handleLogout}
          className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm"
        >
          <LogOut size={16} /> Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
