import axios, { AxiosInstance } from 'axios';
import { Location } from '../types/location';

let apiInstance: AxiosInstance;

export const initializeApi = (apiUrl?: string) => {
  const baseURL = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  apiInstance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Initialize with default
initializeApi();

export const locationService = {
  getAll: async (): Promise<Location[]> => {
    const response = await apiInstance.get('/locations');
    return response.data;
  },
};

export const widgetConfigService = {
  getConfig: async () => {
    const response = await apiInstance.get('/widget-config');
    return response.data;
  },
};