import { createClient } from '@wix/sdk';
import { site } from '@wix/site';

class WixService {
  private static instance: WixService;
  private wixClient: any = null;
  private instanceToken: string | null = null;
  private compId: string | null = null;
  private accessTokenInjector: any = null;

  private constructor() {}

  static getInstance(): WixService {
    if (!WixService.instance) {
      WixService.instance = new WixService();
    }
    return WixService.instance;
  }

  async initialize(compId?: string): Promise<void> {
    try {
      console.log('[WixService] Initializing with Wix Site SDK...');
      console.log('[WixService] Environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');

      // Store compId if provided
      if (compId) {
        this.compId = compId;
        console.log('[WixService] Component ID stored:', compId);
      }

      // Create Wix Client using site.auth() and site.host()
      // This is the official Wix pattern for self-hosted custom elements
      this.wixClient = createClient({
        auth: site.auth(),
        host: site.host(),
      });

      console.log('[WixService] ✅ Wix client created with site authentication');

      // Get access token injector
      // This provides the authentication token for API calls
      try {
        this.accessTokenInjector = this.wixClient.auth.getAccessTokenFunction?.();

        // Try to get the token immediately
        if (this.accessTokenInjector && typeof this.accessTokenInjector === 'function') {
          this.instanceToken = await this.accessTokenInjector();
          console.log('[WixService] ✅ Access token retrieved via injector');
          console.log('[WixService] Token preview:', this.instanceToken ? this.instanceToken.substring(0, 20) + '...' : 'null');
        } else {
          console.log('[WixService] Access token injector not available as function');
        }
      } catch (tokenError) {
        console.error('[WixService] Error getting access token:', tokenError);
      }

      // Alternative: Try to get logged in member's token
      try {
        if (this.wixClient.auth.loggedIn) {
          const memberTokens = await this.wixClient.auth.loggedIn();
          if (memberTokens && memberTokens.accessToken) {
            this.instanceToken = memberTokens.accessToken;
            console.log('[WixService] ✅ Got access token from logged in member');
          }
        }
      } catch (err) {
        console.log('[WixService] Not a logged in member context');
      }

    } catch (error) {
      console.error('[WixService] Failed to initialize Wix client:', error);
      console.error('[WixService] Error details:', error instanceof Error ? error.message : String(error));
      console.error('[WixService] Stack:', error instanceof Error ? error.stack : 'No stack');
    }
  }

  getInstanceToken(): string | null {
    return this.instanceToken;
  }

  async getAccessToken(): Promise<string | null> {
    // Try to get fresh token from injector
    if (this.accessTokenInjector && typeof this.accessTokenInjector === 'function') {
      try {
        const token = await this.accessTokenInjector();
        if (token) {
          this.instanceToken = token;
          return token;
        }
      } catch (err) {
        console.error('[WixService] Error calling access token injector:', err);
      }
    }
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
    return this.wixClient !== null;
  }

  getWixClient(): any {
    return this.wixClient;
  }

  // Wix's recommended way to call backend with authentication
  async fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
    if (!this.wixClient) {
      console.warn('[WixService] Wix client not initialized, making unauthenticated request');
      return fetch(url, options);
    }

    try {
      // Use Wix's fetchWithAuth method
      return await this.wixClient.fetchWithAuth(url, options);
    } catch (error) {
      console.error('[WixService] Error in fetchWithAuth:', error);
      throw error;
    }
  }
}

export default WixService.getInstance();
