import apiClient from './apiClient';

/**
 * Récupère les détails d'un métier par son ID
 * Inclut généralement les filières qui y préparent
 * @param {number} id - L'identifiant du métier
 */
export const getJobById = async (id) => {
  const response = await apiClient.get(`/jobs/${id}`);
  return response.data;
};
