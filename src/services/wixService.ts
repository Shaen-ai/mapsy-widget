import { createClient } from '@wix/sdk';
import { site } from '@wix/site';

// Simple Wix Service following Wix's exact recommended pattern
class WixService {
  private static instance: WixService;
  private wixClient: any = null;
  private applicationId: string = '0d076a26-ce6d-4d16-83c5-126cdf640aa4';

  private constructor() {}

  static getInstance(): WixService {
    if (!WixService.instance) {
      WixService.instance = new WixService();
    }
    return WixService.instance;
  }

  // Initialize Wix client exactly as Wix recommends
  async initialize(appId?: string): Promise<void> {
    try {
      console.log('[WixService] Initializing Wix client...');

      // Use provided appId or default
      if (appId) {
        this.applicationId = appId;
      }

      // Create Wix client exactly as shown in Wix documentation
      this.wixClient = createClient({
        auth: site.auth(),
        host: site.host({ applicationId: this.applicationId }),
      });

      console.log('[WixService] ✅ Wix client created successfully');
    } catch (error) {
      console.error('[WixService] Failed to initialize:', error);
      // Create client without auth as fallback
      this.wixClient = createClient({
        modules: {},
      });
      console.warn('[WixService] Created client without authentication');
    }
  }

  // Make authenticated request to backend - exactly as Wix recommends
  async fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
    if (!this.wixClient) {
      throw new Error('Wix client not initialized. Call initialize() first.');
    }

    console.log('[WixService] Making authenticated request to:', url);

    try {
      // Use Wix's fetchWithAuth - it automatically adds the access token
      const response = await this.wixClient.fetchWithAuth(url, options);
      console.log('[WixService] ✅ Request completed:', response.status);
      return response;
    } catch (error) {
      console.error('[WixService] Request failed:', error);
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
