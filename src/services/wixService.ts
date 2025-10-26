class WixService {
  private static instance: WixService;
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
      console.log('[WixService] Initializing for script-embedded custom element...');
      console.log('[WixService] Environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');

      // Store compId if provided
      if (compId) {
        this.compId = compId;
        console.log('[WixService] Component ID stored:', compId);
      }

      // For script-embedded custom elements, instance token comes from URL or window context
      await this.retrieveInstanceToken();

    } catch (error) {
      console.error('[WixService] Failed to initialize:', error);
      console.error('[WixService] Error details:', error instanceof Error ? error.message : String(error));
    }
  }

  private async retrieveInstanceToken(): Promise<void> {
    console.log('[WixService] Attempting to retrieve instance token...');

    // Method 1: Check URL parameters (current window)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('instance') || urlParams.get('instanceToken');
      if (urlToken) {
        this.instanceToken = urlToken;
        console.log('[WixService] ✅ Instance token found in URL parameters');
        console.log('[WixService] Token preview:', this.instanceToken.substring(0, 20) + '...');
        return;
      }
    }

    // Method 2: Check parent/top window URL (iframe scenario)
    if (typeof window !== 'undefined' && window.location !== window.parent.location) {
      try {
        const parentUrl = new URL(window.parent.location.href);
        const parentParams = new URLSearchParams(parentUrl.search);
        const parentToken = parentParams.get('instance') || parentParams.get('instanceToken');
        if (parentToken) {
          this.instanceToken = parentToken;
          console.log('[WixService] ✅ Instance token found in parent window URL');
          console.log('[WixService] Token preview:', this.instanceToken.substring(0, 20) + '...');
          return;
        }
      } catch (e) {
        console.log('[WixService] Cannot access parent URL (cross-origin)');
      }
    }

    // Method 3: Check Wix global variables
    if (typeof window !== 'undefined') {
      const wixData = (window as any).wixData || (window as any).__WIXDATA__ || (window as any).Wix;
      if (wixData) {
        console.log('[WixService] Found Wix global object:', Object.keys(wixData));

        if (wixData.instance) {
          this.instanceToken = wixData.instance;
          console.log('[WixService] ✅ Instance token found in window.wixData');
          console.log('[WixService] Token preview:', this.instanceToken.substring(0, 20) + '...');
          return;
        }

        if (wixData.Utils && wixData.Utils.getInstanceValue) {
          try {
            this.instanceToken = await wixData.Utils.getInstanceValue('instance');
            if (this.instanceToken) {
              console.log('[WixService] ✅ Instance token retrieved via Wix.Utils');
              console.log('[WixService] Token preview:', this.instanceToken.substring(0, 20) + '...');
              return;
            }
          } catch (err) {
            console.log('[WixService] Failed to get instance via Wix.Utils:', err);
          }
        }
      }
    }

    // Method 4: Setup postMessage listener for Wix to send token
    if (typeof window !== 'undefined') {
      console.log('[WixService] Setting up postMessage listener for instance token...');

      window.addEventListener('message', (event) => {
        // Accept messages from Wix domains
        const wixOrigins = ['wix.com', 'wixsite.com', 'editorx.com'];
        const isTrusted = wixOrigins.some(origin => event.origin.includes(origin));

        if (isTrusted && event.data) {
          if (event.data.instance || event.data.instanceToken) {
            const token = event.data.instance || event.data.instanceToken;
            this.instanceToken = token;
            console.log('[WixService] ✅ Instance token received via postMessage');
            console.log('[WixService] Token preview:', this.instanceToken.substring(0, 20) + '...');
          }

          if (event.data.compId) {
            this.compId = event.data.compId;
            console.log('[WixService] ✅ CompId received via postMessage:', this.compId);
          }
        }
      });

      // Request instance token from parent
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'request-instance', source: 'mapsy-widget' }, '*');
        console.log('[WixService] Sent request for instance token to parent window');
      }
    }

    if (!this.instanceToken) {
      console.warn('[WixService] ⚠️ No instance token found');
      console.warn('[WixService] Widget will run in standalone mode without multi-tenancy');
    }
  }

  getInstanceToken(): string | null {
    return this.instanceToken;
  }

  setInstanceToken(token: string): void {
    this.instanceToken = token;
    console.log('[WixService] Instance token updated directly');
    console.log('[WixService] Token preview:', token.substring(0, 20) + '...');
  }

  getCompId(): string | null {
    return this.compId;
  }

  setCompId(id: string): void {
    this.compId = id;
    console.log('[WixService] CompId updated directly');
  }

  isInitialized(): boolean {
    return this.instanceToken !== null;
  }

  // For compatibility - returns null since we don't use Wix SDK for script-embedded widgets
  getWixClient(): any {
    return null;
  }
}

export default WixService.getInstance();
