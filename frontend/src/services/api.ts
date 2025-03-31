import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY } from '../constants/storage';
import { mockAuthAPI, mockUserAPI, mockTasksAPI, mockNlpAPI, shouldUseMock } from './mockApi';

// API base URL - should be environment specific
const API_URL = 'http://10.51.7.19:3000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    } catch (error) {
      return config;
    }
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized errors - token expired or invalid
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // If token has expired or is invalid, sign out user
      await AsyncStorage.removeItem(TOKEN_KEY);
      
      // Redirect to login would happen in the component
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

// Check if we should use mock services
const useMock = shouldUseMock();

// Auth API
export const authAPI = useMock 
  ? mockAuthAPI 
  : {
    login: (credentials: { email: string, password: string }) => 
      api.post('/auth/login', credentials),
    
    register: (userData: { name: string, email: string, password: string }) => 
      api.post('/auth/register', userData),
    
    verifyToken: (token: string) => 
      api.post('/auth/verify', { token }),
  };

// User API
export const userAPI = useMock
  ? mockUserAPI
  : {
    getProfile: () => 
      api.get('/user/profile'),
    
    updateProfile: (data: { name?: string, email?: string }) => 
      api.put('/user/profile', data),
    
    changePassword: (data: { currentPassword: string, newPassword: string }) => 
      api.put('/user/password', data),
  };

// Workspaces API
export const workspacesAPI = {
  getAll: () => 
    api.get('/workspaces'),
  
  getById: (id: string) => 
    api.get(`/workspaces/${id}`),
  
  create: (data: { name: string; description?: string }) => 
    api.post('/workspaces', data),
  
  update: (id: string, data: { name?: string; description?: string }) => 
    api.put(`/workspaces/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/workspaces/${id}`),
};

// Tasks API
export const tasksAPI = useMock
  ? mockTasksAPI
  : {
    getTasks: () => 
      api.get('/tasks'),
    
    getById: (id: string) => 
      api.get(`/tasks/${id}`),
    
    createTask: (task: any) => 
      api.post('/tasks', task),
    
    updateTask: (id: string, updates: any) => 
      api.put(`/tasks/${id}`, updates),
    
    deleteTask: (id: string) => 
      api.delete(`/tasks/${id}`),
    
    getSummary: () => 
      api.get('/tasks/summary'),
    
    getRecentActivity: () => 
      api.get('/tasks/activity'),
  };

// NLP API
export const nlpAPI = useMock
  ? mockNlpAPI
  : {
    processMessage: (data: { message: string, context: Array<{ role: string, content: string }> }) => 
      api.post('/nlp/process', data),
    
    parseText: (data: { text: string, workspaceId: string, timezone?: string }) => 
      api.post('/nlp/parse', data),
  };

// Transcription API
export const transcriptionAPI = {
  transcribe: (formData: FormData) => 
    api.post('/transcription', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

// Context API
export const contextAPI = {
  search: (query: string) => 
    api.get('/context/search', { params: { query } }),
  
  getRelevantContext: (taskId: string) => 
    api.get(`/context/task/${taskId}`),
};

export default api; 