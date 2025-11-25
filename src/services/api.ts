import { Location } from '../types/location';
import wixService from './wixService';

// Backend API URL
const API_BASE_URL = 'https://mapsy-api.nextechspires.com/api';

console.log('[API Module] Loading... API_BASE_URL:', API_BASE_URL);

// Initialize API and Wix
export const initializeApi = async (appId?: string) => {
  console.log('[API] ========== initializeApi START ==========');
  console.log('[API] Initializing with backend:', API_BASE_URL);
  console.log('[API] appId:', appId);

  try {
    console.log('[API] Calling wixService.initialize()...');
    await wixService.initialize(appId);
    console.log('[API] ✅ Wix service initialized');
  } catch (error) {
    console.error('[API] ❌ Failed to initialize wixService:', error);
    throw error;
  }

  console.log('[API] ========== initializeApi END ==========');
};

// Make authenticated request using Wix's fetchWithAuth
async function fetchWithAuth(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;

  console.log('[API] ========== fetchWithAuth START ==========');
  console.log('[API] Endpoint:', endpoint);
  console.log('[API] Full URL:', url);
  console.log('[API] Method:', options?.method || 'GET');
  console.log('[API] Options:', JSON.stringify(options, null, 2));
  console.log('[API] wixService.isInitialized():', wixService.isInitialized());

  try {
    console.log('[API] Calling wixService.fetchWithAuth()...');
    // Use Wix's fetchWithAuth - it automatically sends the access token
    const response = await wixService.fetchWithAuth(url, options);
    console.log('[API] ✅ Response received');
    console.log('[API] Response status:', response.status);
    console.log('[API] Response ok:', response.ok);
    console.log('[API] ========== fetchWithAuth END ==========');
    return response;
  } catch (error) {
    console.error('[API] ❌ Request failed:', error);
    console.error('[API] Error name:', (error as Error)?.name);
    console.error('[API] Error message:', (error as Error)?.message);
    console.log('[API] ========== fetchWithAuth END (ERROR) ==========');
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
