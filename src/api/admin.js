import apiClient from './apiClient';

/**
 * Fonction générique pour récupérer la liste d'une entité (Admin)
 * @param {string} entity - Nom de l'entité (ex: 'universities', 'jobs')
 */
export const getEntities = async (entity) => {
  const response = await apiClient.get(`/admin/${entity}`);
  return response.data;
};

/**
 * Fonction générique pour créer une entité (Admin)
 * @param {string} entity 
 * @param {Object} data 
 */
export const createEntity = async (entity, data) => {
  const response = await apiClient.post(`/admin/${entity}`, data);
  return response.data;
};

/**
 * Fonction générique pour mettre à jour une entité (Admin)
 * @param {string} entity 
 * @param {number} id 
 * @param {Object} data 
 */
export const updateEntity = async (entity, id, data) => {
  const response = await apiClient.put(`/admin/${entity}/${id}`, data);
  return response.data;
};

/**
 * Fonction générique pour supprimer une entité (Admin)
 * @param {string} entity 
 * @param {number} id 
 */
export const deleteEntity = async (entity, id) => {
  const response = await apiClient.delete(`/admin/${entity}/${id}`);
  return response.data;
};
