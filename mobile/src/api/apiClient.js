import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Pour Android Simulator local, on utilise souvent 10.0.2.2 au lieu de localhost
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching token from storage', error);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;
