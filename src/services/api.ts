import { Location } from '../types/location';
import wixService from './wixService';

// HARDCODED PRODUCTION API URL - DO NOT CHANGE
const PRODUCTION_API_URL = 'https://mapsy-api.nextechspires.com/api';

let apiBaseUrl = PRODUCTION_API_URL;

export const initializeApi = async (apiUrl?: string) => {
  // Always use production URL unless explicitly overridden
  apiBaseUrl = apiUrl || PRODUCTION_API_URL;
  console.log('[API] Initialized with base URL:', apiBaseUrl);

  // Initialize Wix service and wait for it to complete
  console.log('[API] Initializing Wix service...');
  await wixService.initialize();
  console.log('[API] ✅ Wix service initialized');
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
  const wixClient = wixService.getWixClient();

  // Get decoded instance data (instanceId, appDefId, vendorProductId)
  const instanceId = wixService.getInstanceId();
  const appDefId = wixService.getAppDefId();
  const vendorProductId = wixService.getVendorProductId();

  console.log('[API] Instance token available:', instanceToken ? 'YES' : 'NO');
  console.log('[API] Comp ID available:', compId || 'NO');
  console.log('[API] Instance ID:', instanceId || 'NO');
  console.log('[API] App Def ID:', appDefId || 'NO');
  console.log('[API] Vendor Product ID (Plan):', vendorProductId || 'NO');
  console.log('[API] Wix client available:', wixClient ? 'YES' : 'NO');

  // Try to use Wix SDK's fetchWithAuth if available and has instance token
  if (wixClient && typeof wixClient.fetchWithAuth === 'function' && instanceToken) {
    console.log('[API] ========================================');
    console.log('[API] Using Wix SDK fetchWithAuth');
    console.log('[API] ========================================');
    console.log('[API] URL:', url);
    console.log('[API] Method:', options?.method || 'GET');

    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');

    if (compId) {
      headers.set('X-Wix-Comp-Id', compId);
      console.log('[API] ✅ Added X-Wix-Comp-Id header:', compId);
    }

    // Add decoded instance data as headers for easier backend access
    if (instanceId) {
      headers.set('X-Wix-Instance-Id', instanceId);
      console.log('[API] ✅ Added X-Wix-Instance-Id header:', instanceId);
    }
    if (appDefId) {
      headers.set('X-Wix-App-Def-Id', appDefId);
      console.log('[API] ✅ Added X-Wix-App-Def-Id header:', appDefId);
    }
    if (vendorProductId) {
      headers.set('X-Wix-Vendor-Product-Id', vendorProductId);
      console.log('[API] ✅ Added X-Wix-Vendor-Product-Id header:', vendorProductId);
    }

    console.log('[API] Making authenticated request...');

    try {
      const response = await wixClient.fetchWithAuth(url, {
        ...options,
        headers,
      });

      console.log('[API] ========================================');
      console.log('[API] ✅ Request completed');
      console.log('[API] Status:', response.status, response.statusText);
      console.log('[API] ========================================');
      return response;
    } catch (error) {
      console.error('[API] ========================================');
      console.error('[API] ❌ Wix fetchWithAuth failed:', error);
      console.error('[API] Error message:', error instanceof Error ? error.message : String(error));
      console.error('[API] Falling back to manual token injection');
      console.error('[API] ========================================');
      // Fall through to manual token injection below
    }
  }

  // Fallback to manual token injection or unauthenticated request
  console.log('[API] ========================================');
  console.log('[API] Using regular fetch', instanceToken ? 'with manual token' : 'without authentication');
  console.log('[API] ========================================');
  console.log('[API] URL:', url);
  console.log('[API] Method:', options?.method || 'GET');

  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  if (instanceToken) {
    headers.set('Authorization', `Bearer ${instanceToken}`);
    console.log('[API] ✅ Added Authorization header with instance token');
    console.log('[API] Token preview:', instanceToken.substring(0, 20) + '...');
  } else {
    console.warn('[API] ⚠️ No instance token - request will be unauthenticated');
    console.warn('[API] This is normal if not running on a published Wix site');
  }

  if (compId) {
    headers.set('X-Wix-Comp-Id', compId);
    console.log('[API] ✅ Added X-Wix-Comp-Id header:', compId);
  }

  // Add decoded instance data as headers for easier backend access
  if (instanceId) {
    headers.set('X-Wix-Instance-Id', instanceId);
    console.log('[API] ✅ Added X-Wix-Instance-Id header:', instanceId);
  }
  if (appDefId) {
    headers.set('X-Wix-App-Def-Id', appDefId);
    console.log('[API] ✅ Added X-Wix-App-Def-Id header:', appDefId);
  }
  if (vendorProductId) {
    headers.set('X-Wix-Vendor-Product-Id', vendorProductId);
    console.log('[API] ✅ Added X-Wix-Vendor-Product-Id header:', vendorProductId);
  }

  console.log('[API] Making request...');

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('[API] ========================================');
    console.log('[API] ✅ Request completed');
    console.log('[API] Status:', response.status, response.statusText);
    console.log('[API] ========================================');
    return response;
  } catch (error) {
    console.error('[API] ========================================');
    console.error('[API] ❌ Request failed');
    console.error('[API] Error:', error);
    console.error('[API] ========================================');
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
