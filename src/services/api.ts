import { Location } from '../types/location';
import apiService, {
  getInstanceToken,
  getCompId,
  setCompId,
  setInstanceToken,
  getWixClient,
  getAccessToken,
  getAccessTokenListener,
  isInWixEnvironment
} from './wixService';

// Backend API URL
const API_BASE_URL = 'https://mapsy-api.nextechspires.com/api';

// Re-export Wix helpers for use in other modules
export {
  getInstanceToken,
  getCompId,
  setCompId,
  setInstanceToken,
  getWixClient,
  getAccessToken,
  getAccessTokenListener,
  isInWixEnvironment
};

// Initialize API
export const initializeApi = async () => {
  await apiService.initialize();
};

// Make API request
async function fetchApi(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  return apiService.fetchWithAuth(url, options);
}

// Location service
export const locationService = {
  getAll: async (): Promise<Location[]> => {
    const response = await fetchApi('/locations', { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to fetch locations: ${response.statusText}`);
    }
    return response.json();
  },
};

// Widget config service
export const widgetConfigService = {
  getConfig: async () => {
    const response = await fetchApi('/widget-config', { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.statusText}`);
    }
    return response.json();
  },
};
