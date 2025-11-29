import { site } from '@wix/site';
import { createClient } from '@wix/sdk';

// App ID from Wix Dev Center
const APP_ID = '0d076a26-ce6d-4d16-83c5-126cdf640aa4';

// Store instance token and compId
let instanceToken: string | null = null;
let compId: string | null = null;
let wixClient: ReturnType<typeof createClient> | null = null;
let isWixEnvironment = false;

// Create Wix client with site authentication (as per Wix docs)
console.log('[Wix] Creating client...');

try {
  wixClient = createClient({
    auth: site.auth(),
    host: site.host({ applicationId: APP_ID }),
  });
  isWixEnvironment = true;
  console.log('[Wix] ✅ Client created');
} catch (error) {
  console.log('[Wix] Running outside Wix environment, using standalone mode');
  isWixEnvironment = false;
}

/**
 * Extract compId from URL query parameters
 */
const extractCompIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('compId') || urlParams.get('comp-id') || urlParams.get('comp_id') || null;
};

/**
 * Extract instance token from URL query parameters (for iframe scenarios)
 */
const extractInstanceFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('instance') || null;
};

/**
 * Initialize and retrieve Wix instance token and compId
 */
const initializeWixData = async (): Promise<void> => {
  // Try to get compId from URL first
  const urlCompId = extractCompIdFromUrl();
  if (urlCompId) {
    compId = urlCompId;
    console.log('[Wix] CompId from URL:', compId);
  }

  // Try to get instance from URL (for iframe scenarios)
  const urlInstance = extractInstanceFromUrl();
  if (urlInstance) {
    instanceToken = urlInstance;
    console.log('[Wix] Instance from URL:', instanceToken ? 'Available' : 'Not available');
  }

  // If in Wix environment, try to get from SDK
  if (isWixEnvironment && wixClient) {
    try {
      // Get instance token from Wix client auth
      if (wixClient.auth && typeof (wixClient.auth as any).getAccessToken === 'function') {
        const tokenData = await (wixClient.auth as any).getAccessToken();
        if (tokenData?.accessToken) {
          instanceToken = tokenData.accessToken;
          console.log('[Wix] Instance token from SDK:', instanceToken ? 'Available' : 'Not available');
        }
      }
    } catch (error) {
      console.log('[Wix] Could not get instance token from SDK:', (error as Error).message);
    }

    // Try to get compId from Wix widget context if available
    try {
      // Check if we're in a widget context
      if (typeof (window as any).Wix !== 'undefined') {
        const wixContext = (window as any).Wix;
        if (wixContext.Utils && wixContext.Utils.getCompId) {
          const wixCompId = await wixContext.Utils.getCompId();
          if (wixCompId && !compId) {
            compId = wixCompId;
            console.log('[Wix] CompId from Wix.Utils:', compId);
          }
        }
      }
    } catch (error) {
      console.log('[Wix] Could not get compId from Wix.Utils:', (error as Error).message);
    }
  }

  console.log('[Wix] Final state - Instance:', instanceToken ? 'Available' : 'Not available');
  console.log('[Wix] Final state - CompId:', compId || 'Not available');
};

/**
 * Get the current instance token
 */
export const getInstanceToken = (): string | null => {
  return instanceToken;
};

/**
 * Get the current component ID
 */
export const getCompId = (): string | null => {
  return compId;
};

/**
 * Set the component ID (can be set externally via widget attributes)
 */
export const setCompId = (id: string): void => {
  compId = id;
  console.log('[Wix] CompId set:', compId);
};

/**
 * Set the instance token (can be set externally)
 */
export const setInstanceToken = (token: string): void => {
  instanceToken = token;
  console.log('[Wix] Instance token set:', instanceToken ? 'Available' : 'Not available');
};

/**
 * Check if running in Wix environment
 */
export const isInWixEnvironment = (): boolean => {
  return isWixEnvironment;
};

// Fetch with Wix auth, fallback to direct fetch if auth fails (e.g., in editor preview)
export const fetchWithAuth = async (url: string, options?: RequestInit): Promise<Response> => {
  // Add compId header if available
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (compId) {
    headers['X-Wix-Comp-Id'] = compId;
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  // If in Wix environment and client available, use authenticated fetch
  if (isWixEnvironment && wixClient) {
    try {
      // Try Wix authenticated fetch
      const response = await wixClient.fetchWithAuth(url, fetchOptions);
      console.log('[Wix] Auth fetch:', response.status, response.ok ? '✅' : '❌');
      return response;
    } catch (error) {
      // Fallback to direct fetch (for editor preview or when auth fails)
      console.log('[Wix] Auth failed, using direct fetch');
    }
  }

  // Direct fetch (non-Wix or fallback)
  const response = await fetch(url, fetchOptions);
  console.log('[Wix] Direct fetch:', response.status, response.ok ? '✅' : '❌');
  return response;
};

// Simple API service wrapper
class ApiService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await initializeWixData();
    this.initialized = true;
    console.log('[API] ✅ Ready');
  }

  async fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
    return fetchWithAuth(url, options);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getInstanceToken(): string | null {
    return getInstanceToken();
  }

  getCompId(): string | null {
    return getCompId();
  }

  setCompId(id: string): void {
    setCompId(id);
  }

  setInstanceToken(token: string): void {
    setInstanceToken(token);
  }
}

export default new ApiService();
