import { Location } from '../types/location';
import apiService from './wixService';

// Backend API URL
const API_BASE_URL = 'https://mapsy-api.nextechspires.com/api';

console.log('[API] Loading... Backend:', API_BASE_URL);

// Initialize API
export const initializeApi = async () => {
  console.log('[API] Initializing...');
  await apiService.initialize();
  console.log('[API] ✅ Ready');
};

// Make API request
async function fetchApi(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('[API] Request:', options?.method || 'GET', url);

  const response = await apiService.fetchWithAuth(url, options);

  if (!response.ok) {
    console.error('[API] ❌ Error:', response.status, response.statusText);
  }

  return response;
}

// Location service
export const locationService = {
  getAll: async (): Promise<Location[]> => {
    console.log('[Locations] Fetching...');

    const response = await fetchApi('/locations', { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Failed to fetch locations: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Locations] ✅ Got', data.length, 'locations');
    return data;
  },
};

// Widget config service
export const widgetConfigService = {
  getConfig: async () => {
    console.log('[Config] Fetching...');

    const response = await fetchApi('/widget-config', { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Config] ✅ Got config');
    return data;
  },
};
