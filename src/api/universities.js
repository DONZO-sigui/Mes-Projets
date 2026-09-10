import apiClient from './apiClient';

/**
 * Récupère la liste des universités
 * @param {Object} params - Filtres optionnels (city, status, domain, limit)
 */
export const getUniversities = async (params = {}) => {
  const response = await apiClient.get('/universities', { params });
  return response.data;
};

/**
 * Récupère les détails d'une université spécifique par son ID
 * Inclut généralement les facultés rattachées
 * @param {number} id - L'identifiant de l'université
 */
export const getUniversityById = async (id) => {
  const response = await apiClient.get(`/universities/${id}`);
  return response.data;
};
