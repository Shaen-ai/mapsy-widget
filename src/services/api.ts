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

// Helper function to make authenticated requests using Wix SDK
async function fetchWithAuth(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = `${apiBaseUrl}${endpoint}`;

  console.log('[API] Preparing request to:', endpoint);
  console.log('[API] Full URL:', url);

  const wixClient = wixService.getWixClient();
  const compId = wixService.getCompId();

  // If we have a Wix client, use fetchWithAuth (official Wix method)
  if (wixClient && wixClient.fetchWithAuth) {
    console.log('[API] Using Wix fetchWithAuth (authenticated)');
    console.log('[API] Comp ID:', compId || 'Not set');

    try {
      // Add compId as custom header if available
      const headers = new Headers(options?.headers);
      if (compId) {
        headers.set('X-Wix-Comp-Id', compId);
        console.log('[API] ✅ Added Comp ID header:', compId);
      }

      const response = await wixClient.fetchWithAuth(url, {
        ...options,
        headers,
      });

      console.log('[API] ✅ Request completed with status:', response.status);
      return response;
    } catch (error) {
      console.error('[API] Error in fetchWithAuth:', error);
      throw error;
    }
  } else {
    // Fallback to regular fetch for development/standalone mode
    console.log('[API] ⚠️ Wix client not available, using regular fetch (unauthenticated)');

    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');

    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('[API] Request completed with status:', response.status);
    return response;
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
