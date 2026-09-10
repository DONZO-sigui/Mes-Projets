import apiClient from './apiClient';

/**
 * Récupère les détails d'une faculté par son ID
 * Inclut généralement les programmes rattachés
 * @param {number} id - L'identifiant de la faculté
 */
export const getFacultyById = async (id) => {
  const response = await apiClient.get(`/faculties/${id}`);
  return response.data;
};
