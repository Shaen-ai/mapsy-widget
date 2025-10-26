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

  async initialize(compId?: string, explicitInstanceToken?: string): Promise<void> {
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

      // Use explicit instance token if provided (from attributes, URL, postMessage, or globals)
      if (explicitInstanceToken) {
        this.instanceToken = explicitInstanceToken;
        console.log('[WixService] ✅ Using explicit instance token');
        console.log('[WixService] Token preview:', this.instanceToken.substring(0, 20) + '...');

        // Create a minimal Wix client for compatibility
        try {
          this.wixClient = createClient({});
          console.log('[WixService] Wix client created for compatibility');
        } catch (error) {
          console.log('[WixService] Could not create Wix client, will work without it');
        }
      } else {
        console.log('[WixService] ⚠️ No instance token provided');
        console.log('[WixService] For self-hosted widgets, instance token should come from:');
        console.log('[WixService]   - Element attributes (instance, instance-token)');
        console.log('[WixService]   - URL parameters (?instance=...)');
        console.log('[WixService]   - PostMessage from parent window');
        console.log('[WixService]   - Global variables (window.wixData)');
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

  setInstanceToken(token: string): void {
    this.instanceToken = token;
    console.log('[WixService] Instance token updated directly');
  }

  getCompId(): string | null {
    return this.compId;
  }

  setCompId(id: string): void {
    this.compId = id;
    console.log('[WixService] CompId updated directly');
  }

  isInitialized(): boolean {
    // For self-hosted widgets, having an instance token is sufficient
    return this.instanceToken !== null;
  }

  getWixClient(): WixClient | null {
    return this.wixClient;
  }
}

export default WixService.getInstance();
