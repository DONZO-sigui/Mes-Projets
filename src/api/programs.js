import apiClient from './apiClient';

/**
 * Récupère les détails d'un programme/filière par son ID
 * Inclut généralement les spécialités et métiers liés
 * @param {number} id - L'identifiant du programme
 */
export const getProgramById = async (id) => {
  const response = await apiClient.get(`/programs/${id}`);
  return response.data;
};
