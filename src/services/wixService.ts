import { createClient, WixClient } from '@wix/sdk';

class WixService {
  private static instance: WixService;
  private wixClient: WixClient | null = null;
  private instanceToken: string | null = null;
  private compId: string | null = null;

  private constructor() {}

  static getInstance(): WixService {
    if (!WixService.instance) {
      WixService.instance = new WixService();
    }
    return WixService.instance;
  }

  async initialize(compId?: string): Promise<void> {
    try {
      console.log('[WixService] Initializing Wix client...');
      console.log('[WixService] Environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');
      console.log('[WixService] User agent:', typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) : 'N/A');

      // Store compId if provided
      if (compId) {
        this.compId = compId;
        console.log('[WixService] Component ID stored:', compId);
      } else {
        console.log('[WixService] No component ID provided');
      }

      // Initialize Wix Client for self-hosted extension
      console.log('[WixService] Creating Wix client...');
      this.wixClient = createClient({
        auth: { anonymous: true },
      });
      console.log('[WixService] Wix client created:', this.wixClient ? 'Success' : 'Failed');

      // Get encoded instance token (JWT)
      if (this.wixClient && this.wixClient.auth) {
        console.log('[WixService] Attempting to get instance token...');
        try {
          this.instanceToken = this.wixClient.auth.getInstanceToken();
          if (this.instanceToken) {
            console.log('[WixService] ✅ Instance token retrieved successfully');
            console.log('[WixService] Token preview:', this.instanceToken.substring(0, 20) + '...');
          } else {
            console.warn('[WixService] ⚠️ Instance token is null/undefined');
          }
        } catch (tokenError) {
          console.error('[WixService] Error getting instance token:', tokenError);
        }
      } else {
        console.error('[WixService] Wix client or auth is not available');
      }

    } catch (error) {
      console.error('[WixService] Failed to initialize Wix client:', error);
      console.error('[WixService] Error details:', error instanceof Error ? error.message : String(error));
      // Don't throw - allow widget to work without Wix in development
    }
  }

  getInstanceToken(): string | null {
    return this.instanceToken;
  }

  getCompId(): string | null {
    return this.compId;
  }

  isInitialized(): boolean {
    return this.wixClient !== null && this.instanceToken !== null;
  }

  getWixClient(): WixClient | null {
    return this.wixClient;
  }
}

export default WixService.getInstance();
