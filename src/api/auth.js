import apiClient from './apiClient';

/**
 * Connecte un administrateur et retourne un token JWT
 * @param {string} email 
 * @param {string} password 
 */
export const login = async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
};
