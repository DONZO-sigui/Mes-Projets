import React from 'react';
// Importation des outils de routage de React Router
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Importation du composant de mise en page principal (qui contient généralement le Header et le Footer)
import Layout from './components/Layout';

// ==========================================
// IMPORTATION DES PAGES PUBLIQUES
// Ces pages sont accessibles par tout le monde
// ==========================================
import Accueil from './pages/Accueil';
import AnnuaireUniversites from './pages/AnnuaireUniversites';
import FicheUniversite from './pages/FicheUniversite';
import FicheFaculte from './pages/FicheFaculte';
import FicheFiliere from './pages/FicheFiliere';
import FicheMetier from './pages/FicheMetier';
import Comparateur from './pages/Comparateur';
import Login from './pages/Login'; 
import Register from './pages/Register'; // <-- Page d'inscription
import TestOrientation from './pages/TestOrientation';
import ResultatsTest from './pages/ResultatsTest';

// ==========================================
// IMPORTATION DES PAGES D'ADMINISTRATION
// Ces pages sont réservées aux administrateurs
// ==========================================
import LoginAdmin from './pages/LoginAdmin';
import DashboardAdmin from './pages/DashboardAdmin';
import CrudAdmin from './pages/CrudAdmin';
import CrudAdminForm from './pages/CrudAdminForm';

// ==========================================
// COMPOSANT DE PROTECTION DE ROUTE
// ==========================================
// Ce composant vérifie si l'utilisateur est connecté en tant qu'admin
// en cherchant un 'adminToken' dans le localStorage de son navigateur.
// S'il n'y a pas de token, il est redirigé vers la page de connexion admin.
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    // Navigate permet de rediriger sans garder l'historique de la tentative d'accès bloquée
    return <Navigate to="/admin/login" replace />;
  }
  // S'il a le token, on affiche le composant enfant (children)
  return children;
};

// ==========================================
// COMPOSANT PRINCIPAL APP
// ==========================================
// C'est le point d'entrée de l'application, il gère toutes les routes (URL)
function App() {
  return (
    // Router englobe toute l'application pour activer le routage
    <Router>
      {/* Routes définit les différentes correspondances entre URL et composants */}
      <Routes>
        
        {/* Route principale avec le Layout.
            Toutes les routes à l'intérieur de celle-ci auront le Header et Footer du Layout. */}
        <Route path="/" element={<Layout />}>
          
          {/* Routes Publiques */}
          {/* 'index' signifie que c'est la page par défaut quand on va sur '/' */}
          <Route index element={<Accueil />} />
          {/* '/universities' mène à l'annuaire */}
          <Route path="universities" element={<AnnuaireUniversites />} />
          {/* Le ':id' est un paramètre dynamique pour identifier une université spécifique */}
          <Route path="universities/:id" element={<FicheUniversite />} />
          <Route path="faculties/:id" element={<FicheFaculte />} />
          <Route path="programs/:id" element={<FicheFiliere />} />
          <Route path="jobs/:id" element={<FicheMetier />} />
          <Route path="compare" element={<Comparateur />} />
          <Route path="test" element={<TestOrientation />} />
          <Route path="results" element={<ResultatsTest />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          
          {/* ==========================================
              ESPACE ADMIN
              ========================================== */}
          {/* Page de connexion admin (publique, pas de protection) */}
          <Route path="admin/login" element={<LoginAdmin />} />
          
          {/* Dashboard protégé par le composant ProtectedRoute défini plus haut */}
          <Route path="admin/dashboard" element={
            <ProtectedRoute>
              <DashboardAdmin />
            </ProtectedRoute>
          } />
          
          {/* Routes du CRUD (Create, Read, Update, Delete) pour gérer la base de données */}
          {/* Le paramètre ':entity' permet de gérer universités, filières, etc. avec le même composant */}
          <Route path="admin/crud/:entity" element={
            <ProtectedRoute>
              <CrudAdmin />
            </ProtectedRoute>
          } />
          
          {/* Route pour AJOUTER un nouvel élément */}
          <Route path="admin/crud/:entity/new" element={
            <ProtectedRoute>
              <CrudAdminForm />
            </ProtectedRoute>
          } />
          
          {/* Route pour MODIFIER un élément existant (grâce à son :id) */}
          <Route path="admin/crud/:entity/:id/edit" element={
            <ProtectedRoute>
              <CrudAdminForm />
            </ProtectedRoute>
          } />
          
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
