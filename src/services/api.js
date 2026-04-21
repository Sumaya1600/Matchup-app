import axios from 'axios';
import { API_URL } from '../constants';
import { auth } from '../config/firebase';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

// Automatically attach a fresh Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken(false);
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn('Could not attach token:', e.message);
  }
  return config;
});

// Log API errors clearly so you can debug
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url    = error.config?.url ?? 'unknown';
    const status = error.response?.status ?? 'no response';
    const msg    = error.response?.data?.error ?? error.message;
    console.error(`API Error [${status}] ${url}: ${msg}`);
    return Promise.reject(error);
  }
);

export const registerUser      = (data)                         => api.post('/auth/register', data);
export const getProfile        = (id)                           => api.get(`/users/${id}`);
export const updateProfile     = (id, data)                     => api.put(`/users/${id}`, data);
export const getSuggestions    = (userId)                       => api.get(`/matches/suggestions/${userId}`);
export const sendMatchRequest  = (data)                         => api.post('/matches/request', data);
export const getPendingMatches = (userId)                       => api.get(`/matches/pending/${userId}`);
export const respondToMatch    = (matchId, response)            => api.put(`/matches/${matchId}/respond`, { response });
export const scheduleMatch     = (matchId, data)                => api.put(`/matches/${matchId}/schedule`, data);
export const rateMatch         = (matchId, ratedUserId, rating) => api.post(`/matches/${matchId}/rate`, { rated_user_id: ratedUserId, rating });