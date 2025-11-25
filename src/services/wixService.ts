import { site } from '@wix/site';
import { createClient } from '@wix/sdk';

// Application ID for the Wix App
const APPLICATION_ID = '0d076a26-ce6d-4d16-83c5-126cdf640aa4';

console.log('[WixService] Module loading...');
console.log('[WixService] APPLICATION_ID:', APPLICATION_ID);

// Create the Wix client at module level (as per Wix documentation)
let wixClient: ReturnType<typeof createClient> | null = null;
let accessTokenListener: (() => void) | null = null;

try {
  console.log('[WixService] Creating Wix client with site.auth() and site.host()...');

  wixClient = createClient({
    auth: site.auth(),
    host: site.host({ applicationId: APPLICATION_ID }),
  });

  console.log('[WixService] ✅ Wix client created successfully');
  console.log('[WixService] wixClient keys:', Object.keys(wixClient || {}));

  // Get the access token injector (as per Wix documentation)
  if (wixClient.auth && typeof wixClient.auth.getAccessTokenInjector === 'function') {
    accessTokenListener = wixClient.auth.getAccessTokenInjector();
    console.log('[WixService] ✅ Access token injector obtained');
  } else {
    console.warn('[WixService] getAccessTokenInjector not available');
  }
} catch (error) {
  console.error('[WixService] ❌ Failed to create Wix client:', error);
  console.error('[WixService] Error message:', (error as Error)?.message);
  wixClient = null;
}

class WixService {
  private static instance: WixService;
  private initialized: boolean = false;

  private constructor() {
    console.log('[WixService] Constructor called');
  }

  static getInstance(): WixService {
    if (!WixService.instance) {
      WixService.instance = new WixService();
    }
    return WixService.instance;
  }

  // Initialize the service
  async initialize(_appId?: string): Promise<void> {
    console.log('[WixService] ========== INITIALIZE START ==========');
    console.log('[WixService] wixClient exists:', !!wixClient);
    console.log('[WixService] accessTokenListener exists:', !!accessTokenListener);

    this.initialized = true;
    console.log('[WixService] ✅ Service initialized');
    console.log('[WixService] ========== INITIALIZE END ==========');
  }

  // Make authenticated request using Wix client's fetchWithAuth
  async fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
    console.log('[WixService] ========== FETCH START ==========');
    console.log('[WixService] URL:', url);
    console.log('[WixService] Method:', options?.method || 'GET');
    console.log('[WixService] wixClient exists:', !!wixClient);

    // Try Wix authenticated fetch first
    if (wixClient && typeof wixClient.fetchWithAuth === 'function') {
      try {
        console.log('[WixService] Using wixClient.fetchWithAuth()...');
        const response = await wixClient.fetchWithAuth(url, options);
        console.log('[WixService] ✅ Wix fetchWithAuth succeeded');
        console.log('[WixService] Response status:', response.status);
        console.log('[WixService] ========== FETCH END ==========');
        return response;
      } catch (error) {
        console.error('[WixService] ❌ Wix fetchWithAuth failed:', (error as Error)?.message);
        console.log('[WixService] Falling back to direct fetch...');
      }
    } else {
      console.log('[WixService] wixClient.fetchWithAuth not available, using direct fetch');
    }

    // Fallback to direct fetch
    try {
      console.log('[WixService] Making direct fetch request...');
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      console.log('[WixService] ✅ Direct fetch completed');
      console.log('[WixService] Response status:', response.status);
      console.log('[WixService] ========== FETCH END ==========');
      return response;
    } catch (error) {
      console.error('[WixService] ❌ Direct fetch failed:', error);
      console.log('[WixService] ========== FETCH END (ERROR) ==========');
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getWixClient() {
    return wixClient;
  }

  getAccessTokenListener() {
    return accessTokenListener;
  }
}

export default WixService.getInstance();
