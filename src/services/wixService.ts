import { createClient } from '@wix/sdk';

class WixService {
  private static instance: WixService;
  private wixClient: any = null;
  private instanceToken: string | null = null;
  private compId: string | null = null;

  private constructor() {}

  static getInstance(): WixService {
    if (!WixService.instance) {
      WixService.instance = new WixService();
    }
    return WixService.instance;
  }

  async initialize(compId?: string, instanceTokenOverride?: string): Promise<void> {
    try {
      console.log('[WixService] ========================================');
      console.log('[WixService] Initializing for Site Widget (Custom Element)...');
      console.log('[WixService] ========================================');
      console.log('[WixService] Environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');
      console.log('[WixService] Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');

      // Store compId if provided
      if (compId) {
        this.compId = compId;
        console.log('[WixService] Component ID stored:', compId);
      }

       // Allow explicit instance token to be passed in (from attributes/dataset)
       if (instanceTokenOverride) {
         this.setInstanceToken(instanceTokenOverride);
       }

      // For Site Widgets with "Enable frontend modules from Wix JavaScript SDK" toggle enabled,
      // we create the client and it automatically gets the instance token
      console.log('[WixService] Creating Wix SDK client...');

      try {
        // Create Wix client for Custom Element
        // When SDK modules are enabled, Wix injects the authentication context
        this.wixClient = createClient({
          modules: {},
        });

        console.log('[WixService] ✅ Wix client created');
        console.log('[WixService] Client object:', this.wixClient);
        console.log('[WixService] Client keys:', Object.keys(this.wixClient || {}));

        // Try to get instance token from the client
        if (this.wixClient) {
          // Method 1: Check if client has auth property
          if (this.wixClient.auth) {
            const authKeys = Object.keys(this.wixClient.auth);
            console.log('[WixService] Found auth on client:', authKeys);
            console.log('[WixService] Auth object:', this.wixClient.auth);

            // Log what each property is
            authKeys.forEach(key => {
              const value = this.wixClient.auth[key];
              console.log(`[WixService] auth.${key}:`, typeof value, value);
            });

            // Try to get auth headers
            if (typeof this.wixClient.auth.getAuthHeaders === 'function') {
              console.log('[WixService] Calling getAuthHeaders()...');
              try {
                const authHeaders = await this.wixClient.auth.getAuthHeaders();
                console.log('[WixService] Auth headers:', authHeaders);
                console.log('[WixService] Headers object:', authHeaders?.headers);
                console.log('[WixService] Headers keys:', authHeaders?.headers ? Object.keys(authHeaders.headers) : 'no headers');

                // Check if headers contain Authorization
                if (authHeaders && authHeaders.headers && authHeaders.headers.Authorization) {
                  const authHeader = authHeaders.headers.Authorization;
                  if (authHeader.startsWith('Bearer ')) {
                    this.instanceToken = authHeader.substring(7);
                    console.log('[WixService] ✅ Got instance token from getAuthHeaders');
                    console.log('[WixService] Token preview:', this.instanceToken.substring(0, 20) + '...');
                  }
                }
              } catch (err) {
                console.log('[WixService] Error calling getAuthHeaders:', err);
              }
            }

            // Try different methods to get the token
            if (!this.instanceToken && typeof this.wixClient.auth.getAccessTokenFunction === 'function') {
              console.log('[WixService] Calling getAccessTokenFunction...');
              const tokenFunc = this.wixClient.auth.getAccessTokenFunction();
              console.log('[WixService] Token function:', typeof tokenFunc);
              if (typeof tokenFunc === 'function') {
                this.instanceToken = await tokenFunc();
                console.log('[WixService] ✅ Got token from getAccessTokenFunction');
              }
            } else if (typeof this.wixClient.auth.getAccessToken === 'function') {
              console.log('[WixService] Calling getAccessToken...');
              this.instanceToken = await this.wixClient.auth.getAccessToken();
              console.log('[WixService] ✅ Got token from getAccessToken');
            } else if (this.wixClient.auth.accessToken) {
              this.instanceToken = this.wixClient.auth.accessToken;
              console.log('[WixService] ✅ Got token from auth.accessToken');
            } else {
              console.warn('[WixService] ⚠️ None of the expected auth methods are available');
              console.warn('[WixService] Available auth keys:', authKeys);
            }
          }

          // Method 2: Check global Wix SDK context
          if (!this.instanceToken && typeof window !== 'undefined') {
            const wixSdk = (window as any).__WIXSDK__ || (window as any).wixSdk || (window as any).WixSDK;
            if (wixSdk) {
              console.log('[WixService] Found global Wix SDK:', Object.keys(wixSdk));
              if (wixSdk.instance) {
                this.instanceToken = wixSdk.instance;
                console.log('[WixService] ✅ Got token from global SDK');
              }
            }
          }
        }

        if (this.instanceToken) {
          console.log('[WixService] ✅ Instance token retrieved');
          console.log('[WixService] Token preview:', this.instanceToken.substring(0, 20) + '...');
          console.log('[WixService] Token length:', this.instanceToken.length);
        } else {
          console.warn('[WixService] ⚠️ No instance token available from SDK');
          // Fallback to manual retrieval
          await this.fallbackTokenRetrieval();
        }

      } catch (sdkError) {
        console.error('[WixService] Error creating Wix SDK client:', sdkError);
        console.error('[WixService] Error details:', sdkError instanceof Error ? sdkError.message : String(sdkError));
        // Fallback to manual token retrieval
        await this.fallbackTokenRetrieval();
      }

    } catch (error) {
      console.error('[WixService] Failed to initialize:', error);
      console.error('[WixService] Error details:', error instanceof Error ? error.message : String(error));
    }
  }

  private async fallbackTokenRetrieval(): Promise<void> {
    console.log('[WixService] Attempting fallback token retrieval...');

    // Check URL parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('instance') || urlParams.get('instanceToken');
      if (urlToken) {
        this.instanceToken = urlToken;
        console.log('[WixService] ✅ Instance token found in URL parameters');
        console.log('[WixService] Token preview:', this.instanceToken.substring(0, 20) + '...');
        return;
      }

      // Check script or DOM dataset attributes
      const currentScript = document.currentScript as HTMLScriptElement | null;
      const datasetInstance = currentScript?.dataset?.instance;
      if (!datasetInstance) {
        // Try custom element dataset if it exists in DOM
        const widgetElement = document.querySelector('mapsy-widget') as HTMLElement | null;
        const widgetInstance = widgetElement?.getAttribute('data-instance') || widgetElement?.dataset?.instance;
        if (widgetInstance) {
          this.instanceToken = widgetInstance;
          console.log('[WixService] ✅ Instance token retrieved from widget dataset');
          console.log('[WixService] Token preview:', this.instanceToken.substring(0, 20) + '...');
          return;
        }
      } else {
        this.instanceToken = datasetInstance;
        console.log('[WixService] ✅ Instance token retrieved from script dataset');
        console.log('[WixService] Token preview:', this.instanceToken.substring(0, 20) + '...');
        return;
      }

      // Check global Wix object
      const wixGlobal = (window as any).Wix || (window as any).wixData;
      if (wixGlobal) {
        console.log('[WixService] Found Wix global:', Object.keys(wixGlobal));
        if (wixGlobal.Utils && typeof wixGlobal.Utils.getInstanceValue === 'function') {
          try {
            this.instanceToken = await wixGlobal.Utils.getInstanceValue('instance');
            if (this.instanceToken) {
              console.log('[WixService] ✅ Got token from Wix.Utils');
              return;
            }
          } catch (err) {
            console.log('[WixService] Failed to get instance from Wix.Utils:', err);
          }
        }
      }

      console.warn('[WixService] ⚠️ No instance token found');
      console.warn('[WixService] Widget will run without multi-tenancy');
    }
  }

  getInstanceToken(): string | null {
    return this.instanceToken;
  }

  setInstanceToken(token: string): void {
    if (!token) {
      return;
    }

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

  getWixClient(): any {
    return this.wixClient;
  }

  // Detect if running in Wix Editor preview mode
  isEditorPreview(): boolean {
    if (typeof window === 'undefined') return false;

    const url = window.location.href;
    // Check for editor preview indicators
    return url.includes('parastorage.com') ||
           url.includes('thunderboltPreview') ||
           url.includes('CustomElementPreviewIframe') ||
           url.includes('editor-elements-library');
  }

  // Get authentication status for UI display
  getAuthStatus(): { hasAuth: boolean; isPreview: boolean; message: string } {
    const isPreview = this.isEditorPreview();
    const hasAuth = this.instanceToken !== null;

    if (isPreview && !hasAuth) {
      return {
        hasAuth: false,
        isPreview: true,
        message: 'Editor Preview Mode - No authentication available. Publish your site to test multi-tenancy.'
      };
    }

    if (!hasAuth) {
      return {
        hasAuth: false,
        isPreview: false,
        message: 'No authentication - Running in standalone mode'
      };
    }

    return {
      hasAuth: true,
      isPreview: false,
      message: 'Authenticated with Wix instance'
    };
  }

  // Use Wix SDK's fetchWithAuth if available
  async fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
    if (this.wixClient && typeof this.wixClient.fetchWithAuth === 'function') {
      console.log('[WixService] Using Wix SDK fetchWithAuth');
      return await this.wixClient.fetchWithAuth(url, options);
    }

    // Fallback to regular fetch with manual token
    console.log('[WixService] Using regular fetch with manual token');
    const headers = new Headers(options?.headers);

    if (this.instanceToken) {
      headers.set('Authorization', `Bearer ${this.instanceToken}`);
    }

    if (this.compId) {
      headers.set('X-Wix-Comp-Id', this.compId);
    }

    return await fetch(url, { ...options, headers });
  }
}

export default WixService.getInstance();
