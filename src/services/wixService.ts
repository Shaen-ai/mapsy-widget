import { createClient } from '@wix/sdk';
import { site } from '@wix/site';

// Simple Wix Service following Wix's exact recommended pattern
class WixService {
  private static instance: WixService;
  private wixClient: any = null;
  private applicationId: string = '0d076a26-ce6d-4d16-83c5-126cdf640aa4';

  private constructor() {
    console.log('[WixService] Constructor called');
  }

  static getInstance(): WixService {
    console.log('[WixService] getInstance called, instance exists:', !!WixService.instance);
    if (!WixService.instance) {
      WixService.instance = new WixService();
    }
    return WixService.instance;
  }

  // Initialize Wix client exactly as Wix recommends
  async initialize(appId?: string): Promise<void> {
    console.log('[WixService] ========== INITIALIZE START ==========');
    console.log('[WixService] appId param:', appId);
    console.log('[WixService] Current applicationId:', this.applicationId);
    console.log('[WixService] Already initialized:', this.wixClient !== null);

    try {
      console.log('[WixService] Initializing Wix client...');

      // Use provided appId or default
      if (appId) {
        this.applicationId = appId;
        console.log('[WixService] Updated applicationId to:', this.applicationId);
      }

      console.log('[WixService] About to call site.auth()...');
      const auth = site.auth();
      console.log('[WixService] site.auth() returned:', auth);
      console.log('[WixService] site.auth() type:', typeof auth);

      console.log('[WixService] About to call site.host()...');
      const host = site.host({ applicationId: this.applicationId });
      console.log('[WixService] site.host() returned:', host);
      console.log('[WixService] site.host() type:', typeof host);

      console.log('[WixService] About to call createClient()...');
      // Create Wix client exactly as shown in Wix documentation
      this.wixClient = createClient({
        auth: auth,
        host: host,
      });

      console.log('[WixService] ✅ Wix client created successfully');
      console.log('[WixService] wixClient:', this.wixClient);
      console.log('[WixService] wixClient keys:', Object.keys(this.wixClient || {}));
      console.log('[WixService] Has fetchWithAuth:', typeof this.wixClient?.fetchWithAuth);
    } catch (error) {
      console.error('[WixService] ❌ Failed to initialize:', error);
      console.error('[WixService] Error name:', (error as Error)?.name);
      console.error('[WixService] Error message:', (error as Error)?.message);
      console.error('[WixService] Error stack:', (error as Error)?.stack);

      // Create client without auth as fallback
      console.log('[WixService] Creating fallback client without auth...');
      this.wixClient = createClient({
        modules: {},
      });
      console.warn('[WixService] Created client without authentication');
      console.log('[WixService] Fallback wixClient:', this.wixClient);
    }

    console.log('[WixService] ========== INITIALIZE END ==========');
  }

  // Make authenticated request to backend - exactly as Wix recommends
  async fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
    console.log('[WixService] ========== FETCH START ==========');
    console.log('[WixService] URL:', url);
    console.log('[WixService] Options:', JSON.stringify(options, null, 2));
    console.log('[WixService] wixClient exists:', !!this.wixClient);
    console.log('[WixService] wixClient.fetchWithAuth exists:', typeof this.wixClient?.fetchWithAuth);

    if (!this.wixClient) {
      console.error('[WixService] ❌ No wixClient - not initialized!');
      throw new Error('Wix client not initialized. Call initialize() first.');
    }

    console.log('[WixService] Making authenticated request to:', url);

    try {
      console.log('[WixService] Calling wixClient.fetchWithAuth()...');
      // Use Wix's fetchWithAuth - it automatically adds the access token
      const response = await this.wixClient.fetchWithAuth(url, options);
      console.log('[WixService] ✅ Request completed');
      console.log('[WixService] Response status:', response.status);
      console.log('[WixService] Response ok:', response.ok);
      console.log('[WixService] Response headers:', [...response.headers.entries()]);
      console.log('[WixService] ========== FETCH END ==========');
      return response;
    } catch (error) {
      console.error('[WixService] ❌ Request failed:', error);
      console.error('[WixService] Error name:', (error as Error)?.name);
      console.error('[WixService] Error message:', (error as Error)?.message);
      console.error('[WixService] Error stack:', (error as Error)?.stack);
      console.log('[WixService] ========== FETCH END (ERROR) ==========');
      throw error;
    }
  }

  getWixClient(): any {
    return this.wixClient;
  }

  isInitialized(): boolean {
    return this.wixClient !== null;
  }
}

export default WixService.getInstance();
