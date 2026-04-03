import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const registerUser = (data) => api.post('/auth/register', data);
export const getProfile = (id) => api.get(`/users/${id}`);
export const updateProfile = (id, data) => api.put(`/users/${id}`, data);
export const getSuggestions = (userId) => api.get(`/matches/suggestions/${userId}`);
export const sendMatchRequest = (data) => api.post('/matches/request', data);
export const getPendingMatches = (userId) => api.get(`/matches/pending/${userId}`);
export const respondToMatch = (matchId, response) => api.put(`/matches/${matchId}/respond`, { response });
export const scheduleMatch = (matchId, data) => api.put(`/matches/${matchId}/schedule`, data);
export const rateMatch = (matchId, ratedUserId, rating) =>
  api.post(`/matches/${matchId}/rate`, { rated_user_id: ratedUserId, rating });