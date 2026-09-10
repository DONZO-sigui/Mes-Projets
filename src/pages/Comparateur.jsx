import React, { useState, useEffect } from 'react';
import { getUniversityById } from '../api/universities';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import { Scale, Plus, X } from 'lucide-react';

// Pour simplifier l'exemple, on utilise des IDs en dur, mais en vrai on aurait un modal de sélection
const MOCK_IDS = [1, 2];

const Comparateur = () => {
  const [selectedIds, setSelectedIds] = useState(MOCK_IDS);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchComparisons = async () => {
      if (selectedIds.length === 0) {
        setUniversities([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Appels multiples en parallèle via Promise.all
        const results = await Promise.all(
          selectedIds.map(id => getUniversityById(id).catch(e => null))
        );
        // On filtre les null au cas où un ID n'existe pas
        setUniversities(results.filter(Boolean));
      } catch (err) {
        setError("Erreur lors de la récupération des données pour la comparaison.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchComparisons();
  }, [selectedIds]);

  const removeUniversity = (idToRemove) => {
    setSelectedIds(selectedIds.filter(id => id !== idToRemove));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center">
          <Scale className="w-6 h-6 mr-2 text-primary-600" /> Comparateur d'Universités
        </h2>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
          <Plus className="w-4 h-4 mr-2" /> Ajouter
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <Loading />
      ) : universities.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500">Ajoutez des universités pour les comparer.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/4">Critère</th>
                {universities.map(uni => (
                  <th key={uni.id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-900 uppercase tracking-wider">
                    <div className="flex justify-between items-center">
                      <span>{uni.acronym || uni.name}</span>
                      <button onClick={() => removeUniversity(uni.id)} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 bg-slate-50">Nom complet</td>
                {universities.map(uni => (
                  <td key={uni.id} className="px-6 py-4 text-sm text-slate-500">{uni.name}</td>
                ))}
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 bg-slate-50">Statut</td>
                {universities.map(uni => (
                  <td key={uni.id} className="px-6 py-4 text-sm text-slate-500">
                    {uni.status === 'publique' ? 'Publique' : 'Privée'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 bg-slate-50">Ville</td>
                {universities.map(uni => (
                  <td key={uni.id} className="px-6 py-4 text-sm text-slate-500">{uni.city}</td>
                ))}
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 bg-slate-50">Nombre de facultés</td>
                {universities.map(uni => (
                  <td key={uni.id} className="px-6 py-4 text-sm text-slate-500">
                    {uni.faculties?.length || 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Comparateur;
