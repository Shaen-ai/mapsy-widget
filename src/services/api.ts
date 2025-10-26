import { Location } from '../types/location';
import wixService from './wixService';

// HARDCODED PRODUCTION API URL - DO NOT CHANGE
const PRODUCTION_API_URL = 'https://mapsy-api.nextechspires.com/api';

let apiBaseUrl = PRODUCTION_API_URL;

export const initializeApi = (apiUrl?: string) => {
  // Always use production URL unless explicitly overridden
  apiBaseUrl = apiUrl || PRODUCTION_API_URL;
  console.log('[API] Initialized with base URL:', apiBaseUrl);
};

// Initialize with production URL
initializeApi();

// Helper function to make authenticated requests
async function fetchWithAuth(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = `${apiBaseUrl}${endpoint}`;

  console.log('[API] Preparing request to:', endpoint);
  console.log('[API] Full URL:', url);

  const instanceToken = wixService.getInstanceToken();
  const compId = wixService.getCompId();

  console.log('[API] Instance token available:', instanceToken ? 'YES' : 'NO');
  console.log('[API] Comp ID available:', compId || 'NO');

  // Build headers
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  // Add instance token if available
  if (instanceToken) {
    headers.set('Authorization', `Bearer ${instanceToken}`);
    console.log('[API] ✅ Added Authorization header with instance token');
    console.log('[API] Token preview:', instanceToken.substring(0, 20) + '...');
  } else {
    console.warn('[API] ⚠️ No instance token - request will be unauthenticated');
  }

  // Add compId if available
  if (compId) {
    headers.set('X-Wix-Comp-Id', compId);
    console.log('[API] ✅ Added X-Wix-Comp-Id header:', compId);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('[API] ✅ Request completed with status:', response.status);
    return response;
  } catch (error) {
    console.error('[API] ❌ Request failed:', error);
    throw error;
  }
}

export const locationService = {
  getAll: async (): Promise<Location[]> => {
    console.log('[LocationService] Fetching all locations...');

    const response = await fetchWithAuth('/locations', {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('[LocationService] Failed to fetch locations:', response.status, response.statusText);
      throw new Error(`Failed to fetch locations: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[LocationService] ✅ Fetched', data.length, 'locations');
    return data;
  },
};

export const widgetConfigService = {
  getConfig: async () => {
    console.log('[WidgetConfigService] Fetching widget config...');

    const response = await fetchWithAuth('/widget-config', {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('[WidgetConfigService] Failed to fetch config:', response.status, response.statusText);
      throw new Error(`Failed to fetch widget config: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[WidgetConfigService] ✅ Config fetched successfully');
    return data;
  },
};
