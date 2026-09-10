import apiClient from './apiClient';

export const submitQuiz = async (answers) => {
  const response = await apiClient.post('/quiz/submit', { answers });
  return response.data;
};
