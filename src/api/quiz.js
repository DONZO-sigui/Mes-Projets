import apiClient from './apiClient';

/**
 * Soumet les réponses du test d'orientation
 * Retourne les métiers, filières et universités recommandés
 * @param {Object} answers - Les réponses au quiz formatées selon les attentes du backend
 */
export const submitQuiz = async (answers) => {
  const response = await apiClient.post('/quiz/submit', answers);
  return response.data;
};
