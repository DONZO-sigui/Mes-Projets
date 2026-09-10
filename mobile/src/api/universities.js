import apiClient from './apiClient';

export const getUniversities = async (params = {}) => {
  const response = await apiClient.get('/universities', { params });
  return response.data;
};

export const getUniversityById = async (id) => {
  const response = await apiClient.get(`/universities/${id}`);
  return response.data;
};
