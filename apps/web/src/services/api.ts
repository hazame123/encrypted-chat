import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Custom interface for retry tracking
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });

        const {
          accessToken,
          refreshToken: newRefreshToken,
          user,
        } = response.data;

        useAuthStore.getState().setAuth(user, accessToken, newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  publicKey: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    publicKey: string;
    createdAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

export const authAPI = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(
      '/api/v1/auth/register',
      data
    );
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/v1/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/v1/auth/logout');
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/v1/auth/me');
    return response.data;
  },
};

// Messages API
export const messagesAPI = {
  getConversation: async (userId: string, limit = 50) => {
    const response = await api.get(`/api/v1/messages/conversation/${userId}`, {
      params: { limit },
    });
    return response.data;
  },

  getConversations: async () => {
    const response = await api.get('/api/v1/messages/conversations');
    return response.data;
  },

  getUnreadCount: async (userId: string) => {
    const response = await api.get(`/api/v1/messages/unread/${userId}`);
    return response.data;
  },

  getUserPublicKey: async (userId: string) => {
    const response = await api.get(`/api/v1/users/${userId}/public-key`);
    return response.data;
  },
};

// Users API
export const usersAPI = {
  searchUsers: async (query: string) => {
    const response = await api.get('/api/v1/users/search', {
      params: { q: query },
    });
    return response.data;
  },
};

export default api;
