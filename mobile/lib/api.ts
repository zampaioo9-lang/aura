import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://backend-one-neon-96.vercel.app';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('token');
    }
    return Promise.reject(error);
  }
);

export default api;
