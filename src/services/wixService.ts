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

      // Store compId if provided
      if (compId) {
        this.compId = compId;
        console.log('[WixService] Component ID:', compId);
      }

      // Initialize Wix Client for self-hosted extension
      this.wixClient = createClient({
        auth: { anonymous: true },
      });

      // Get encoded instance token (JWT)
      this.instanceToken = this.wixClient.auth.getInstanceToken();
      console.log('[WixService] Instance token retrieved');

    } catch (error) {
      console.error('[WixService] Failed to initialize Wix client:', error);
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
