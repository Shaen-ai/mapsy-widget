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
    async (config: InternalAxiosRequestConfig) => {
      console.log('[API Interceptor] Preparing request to:', config.url);

      // Get fresh access token from Wix SDK
      const instanceToken = await wixService.getAccessToken();
      const compId = wixService.getCompId();

      console.log('[API Interceptor] Instance token available:', instanceToken ? 'YES' : 'NO');
      console.log('[API Interceptor] Comp ID available:', compId ? compId : 'NO');

      if (instanceToken) {
        // Add Authorization header with Bearer token
        config.headers.Authorization = `Bearer ${instanceToken}`;
        console.log('[API] ✅ Added Wix access token to request');
        console.log('[API] Token preview:', instanceToken.substring(0, 20) + '...');
      } else {
        console.warn('[API] ⚠️ No access token available - request will be sent without authentication');
      }

      if (compId) {
        // Add compId as a custom header
        config.headers['X-Wix-Comp-Id'] = compId;
        console.log('[API] ✅ Added Comp ID header:', compId);
      } else {
        console.log('[API] No Comp ID to add');
      }

      return config;
    },
    (error) => {
      console.error('[API Interceptor] Error:', error);
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