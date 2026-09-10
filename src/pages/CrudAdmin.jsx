import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getEntities, deleteEntity } from '../api/admin';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import { Plus, Edit, Trash2, ChevronLeft } from 'lucide-react';

const CrudAdmin = () => {
  const { entity } = useParams(); // 'universities', 'faculties', 'programs', 'jobs'
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getEntities(entity);
        setData(result.items || result.data || result);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/admin/login');
        } else {
          setError(`Erreur lors du chargement des ${entity}.`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [entity, navigate]);

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
      try {
        await deleteEntity(entity, id);
        setData(data.filter(item => item.id !== id));
      } catch (err) {
        alert("Erreur lors de la suppression.");
      }
    }
  };

  const getEntityName = () => {
    switch(entity) {
      case 'universities': return 'Universités';
      case 'faculties': return 'Facultés';
      case 'programs': return 'Filières';
      case 'jobs': return 'Métiers';
      default: return entity;
    }
  };

  if (loading) return <Loading />;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center text-sm">
        <Link to="/admin/dashboard" className="text-slate-500 hover:text-slate-700 flex items-center">
          <ChevronLeft className="w-4 h-4 mr-1" /> Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center pb-5 border-b border-slate-200">
        <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:text-3xl sm:truncate">
          Gestion des {getEntityName()}
        </h2>
        {/* On suppose l'existence d'une page de création : /admin/crud/{entity}/new */}
        <Link to={`/admin/crud/${entity}/new`} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </Link>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {data.length > 0 ? (
          <ul className="divide-y divide-slate-200">
            {data.map((item) => (
              <li key={item.id}>
                <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-600 truncate">{item.name}</p>
                    <p className="mt-2 flex items-center text-sm text-slate-500">
                      ID: {item.id} {item.city && `• ${item.city}`} {item.level && `• ${item.level}`}
                    </p>
                  </div>
                  <div className="ml-5 flex-shrink-0 flex items-center space-x-2">
                    <Link to={`/admin/crud/${entity}/${item.id}/edit`} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                      <Edit className="w-5 h-5" />
                    </Link>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10 text-slate-500">
            Aucune donnée trouvée.
          </div>
        )}
      </div>
    </div>
  );
};

export default CrudAdmin;
