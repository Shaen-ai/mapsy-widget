import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Location } from '../types/location';
import wixService from './wixService';

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

  // Add request interceptor to include Wix instance token
  apiInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const instanceToken = wixService.getInstanceToken();
      const compId = wixService.getCompId();

      if (instanceToken) {
        // Add Authorization header with Bearer token
        config.headers.Authorization = `Bearer ${instanceToken}`;
        console.log('[API] Added Wix instance token to request');
      }

      if (compId) {
        // Add compId as a custom header
        config.headers['X-Wix-Comp-Id'] = compId;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
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