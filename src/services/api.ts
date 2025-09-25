import axios, { AxiosInstance } from 'axios';
import { Location } from '../types/location';

let apiInstance: AxiosInstance;

// HARDCODED PRODUCTION API URL - DO NOT CHANGE
const PRODUCTION_API_URL = 'https://mapsy-api.nextechspires.com/api';

export const initializeApi = (apiUrl?: string) => {
  // Always use production URL unless explicitly overridden
  const baseURL = apiUrl || PRODUCTION_API_URL;

  apiInstance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Initialize with production URL
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