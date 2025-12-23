import { Location } from '../types/location';
import apiService, {
  getInstanceToken,
  getCompId,
  setCompId,
  setInstanceToken,
  getWixClient,
  getAccessTokenListener,
  getViewMode
} from './wixService';

// Backend API URL
const API_BASE_URL = 'https://mapsy-api.nextechspires.com/api';

// Re-export Wix helpers that are used by MapsyWidgetElement and wix-widget
export {
  getInstanceToken,
  getCompId,
  setCompId,
  setInstanceToken,
  getWixClient,
  getAccessTokenListener,
  getViewMode
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

// Combined widget data service - fetches config and locations in a single request
export const widgetDataService = {
  getData: async (): Promise<{ config: any; locations: Location[] }> => {
    const response = await fetchApi('/widget-data', { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to fetch widget data: ${response.statusText}`);
    }
    return response.json();
  },
};
