import { Location } from '../types/location';
import wixService from './wixService';

// Backend API URL
const API_BASE_URL = 'https://mapsy-api.nextechspires.com/api';

// Initialize API and Wix
export const initializeApi = async (appId?: string) => {
  console.log('[API] Initializing with backend:', API_BASE_URL);
  await wixService.initialize(appId);
  console.log('[API] ✅ Wix service initialized');
};

// Make authenticated request using Wix's fetchWithAuth
async function fetchWithAuth(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;

  console.log('[API] Request:', options?.method || 'GET', url);

  try {
    // Use Wix's fetchWithAuth - it automatically sends the access token
    const response = await wixService.fetchWithAuth(url, options);
    console.log('[API] ✅ Response:', response.status);
    return response;
  } catch (error) {
    console.error('[API] ❌ Request failed:', error);
    throw error;
  }
}

// Location service
export const locationService = {
  getAll: async (): Promise<Location[]> => {
    console.log('[LocationService] Fetching all locations...');

    const response = await fetchWithAuth('/locations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch locations: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[LocationService] ✅ Fetched', data.length, 'locations');
    return data;
  },
};

// Widget config service
export const widgetConfigService = {
  getConfig: async () => {
    console.log('[WidgetConfigService] Fetching widget config...');

    const response = await fetchWithAuth('/widget-config', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch widget config: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[WidgetConfigService] ✅ Config fetched');
    return data;
  },
};
