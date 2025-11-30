import { site } from '@wix/site';
import { createClient } from '@wix/sdk';

// App ID from Wix Dev Center
const APP_ID = '0d076a26-ce6d-4d16-83c5-126cdf640aa4';

// Store instance token and compId
let instanceToken: string | null = null;
let compId: string | null = null;
let wixClient: ReturnType<typeof createClient> | null = null;
let isWixEnvironment = false;
let accessTokenInjector: (() => Promise<{ accessToken: string | null }>) | null = null;

// Create Wix client with site authentication (as per Wix docs for self-hosted apps)
console.log('[WixClient] 🔄 Attempting to create Wix client...');
console.log('[WixClient] APP_ID:', APP_ID);
try {
  console.log('[WixClient] 📦 site module:', site);
  console.log('[WixClient] 📦 site.auth:', typeof site?.auth);
  console.log('[WixClient] 📦 site.host:', typeof site?.host);

  const authResult = site.auth();
  console.log('[WixClient] 🔐 site.auth() result:', authResult);

  const hostResult = site.host({ applicationId: APP_ID });
  console.log('[WixClient] 🏠 site.host() result:', hostResult);

  wixClient = createClient({
    auth: authResult,
    host: hostResult,
  });

  console.log('[WixClient] ✅ Wix client created successfully');
  console.log('[WixClient] 📋 Client keys:', Object.keys(wixClient || {}));
  console.log('[WixClient] 🔐 Client auth:', wixClient?.auth);
  console.log('[WixClient] 📡 Client fetchWithAuth:', typeof wixClient?.fetchWithAuth);

  // Get access token injector (as per Wix docs for self-hosted Site Widget)
  if (wixClient?.auth?.getAccessTokenInjector) {
    accessTokenInjector = wixClient.auth.getAccessTokenInjector();
    console.log('[WixClient] ✅ Access token injector obtained');
  } else {
    console.log('[WixClient] ⚠️ getAccessTokenInjector not available on auth');
  }

  isWixEnvironment = true;
  console.log('[WixClient] ✅ isWixEnvironment set to:', isWixEnvironment);
} catch (error) {
  console.error('[WixClient] ❌ Failed to create Wix client:', error);
  console.error('[WixClient] ❌ Error details:', {
    message: (error as Error)?.message,
    stack: (error as Error)?.stack,
  });
  isWixEnvironment = false;
}

/**
 * Get the Wix client instance
 */
export const getWixClient = () => wixClient;

/**
 * Get access token using the injector (for self-hosted apps)
 * This is the recommended way per Wix docs
 */
export const getAccessToken = async (): Promise<string | null> => {
  console.log('[WixAuth] 🔄 Getting access token...');

  // Method 1: Use access token injector (preferred for self-hosted widgets)
  if (accessTokenInjector) {
    try {
      console.log('[WixAuth] Using accessTokenInjector...');
      const result = await accessTokenInjector();
      console.log('[WixAuth] accessTokenInjector result:', result);
      if (result?.accessToken) {
        console.log('[WixAuth] ✅ Got access token from injector');
        return result.accessToken;
      }
    } catch (error) {
      console.error('[WixAuth] ❌ accessTokenInjector failed:', error);
    }
  }

  // Method 2: Try wixClient.auth.getAccessToken
  if (wixClient?.auth && typeof (wixClient.auth as any).getAccessToken === 'function') {
    try {
      console.log('[WixAuth] Using wixClient.auth.getAccessToken...');
      const tokenData = await (wixClient.auth as any).getAccessToken();
      console.log('[WixAuth] getAccessToken result:', tokenData);
      if (tokenData?.accessToken) {
        console.log('[WixAuth] ✅ Got access token from SDK');
        return tokenData.accessToken;
      }
    } catch (error) {
      console.error('[WixAuth] ❌ getAccessToken failed:', error);
    }
  }

  console.log('[WixAuth] ⚠️ No access token available');
  return null;
};

/**
 * Listen for postMessage from parent window (Wix sends data this way to iframes)
 */
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

      // Check for compId in various message formats
      if (data?.compId && !compId) {
        compId = data.compId;
        console.log('[Wix] ✅ CompId from postMessage:', compId);
      }
      if (data?.props?.compId && !compId) {
        compId = data.props.compId;
        console.log('[Wix] ✅ CompId from postMessage props:', compId);
      }
      if (data?.instance && !instanceToken) {
        instanceToken = data.instance;
        console.log('[Wix] ✅ Instance from postMessage');
      }

      // Wix custom element widget props
      if (data?.type === 'props' || data?.type === 'attributeChanged') {
        if (data.compId && !compId) {
          compId = data.compId;
          console.log('[Wix] ✅ CompId from Wix message:', compId);
        }
      }

      // Wix TPA message format
      if (data?.intent === 'TPA2') {
        if (data.compId && !compId) {
          compId = data.compId;
          console.log('[Wix] ✅ CompId from TPA2:', compId);
        }
      }
    } catch (e) {
      // Not a JSON message, ignore
    }
  });

  // Request compId from parent (Wix custom element communication)
  if (window.parent !== window) {
    try {
      window.parent.postMessage({ type: 'getCompId', source: 'mapsy-widget' }, '*');
    } catch (e) {
      // Parent communication failed
    }
  }
}

/**
 * Get compId from Wix widget element's data attributes or parent Wix component
 */
const extractCompIdFromElement = (): string | null => {
  if (typeof document === 'undefined') return null;

  // Check wix-internal-id element (Wix iframe container)
  const wixInternalEl = document.getElementById('wix-internal-id');
  if (wixInternalEl) {
    // Check for data attributes that might contain compId
    const dataCompId = wixInternalEl.getAttribute('data-comp-id') ||
                       wixInternalEl.getAttribute('data-wix-comp-id');
    if (dataCompId) {
      console.log('[Wix] ✅ CompId from wix-internal-id:', dataCompId);
      return dataCompId;
    }
  }

  // Look for mapsy-widget element
  const widget = document.querySelector('mapsy-widget');
  if (widget) {
    // Check various attribute patterns Wix might use
    const wixCompId = widget.getAttribute('wix-comp-id') ||
                      widget.getAttribute('data-comp-id') ||
                      widget.getAttribute('data-wix-comp-id') ||
                      widget.getAttribute('compid');
    if (wixCompId) {
      console.log('[Wix] ✅ CompId from widget attribute:', wixCompId);
      return wixCompId;
    }
  }

  // Check for comp id in any element on the page
  const compElements = document.querySelectorAll('[id^="comp-"]');
  if (compElements.length > 0) {
    console.log('[Wix] ✅ CompId from DOM element:', compElements[0].id);
    return compElements[0].id;
  }

  return null;
};

/**
 * Extract instance from Wix's window globals
 */
const extractInstanceFromWixGlobals = (): { instance: string | null; compId: string | null } => {
  if (typeof window === 'undefined') return { instance: null, compId: null };

  let instance: string | null = null;
  let extractedCompId: string | null = null;

  const win = window as any;

  // Check wixEmbedsAPI (common way to get app token)
  if (win.wixEmbedsAPI?.getAppToken) {
    try {
      const token = win.wixEmbedsAPI.getAppToken();
      if (token) {
        instance = token;
        console.log('[Wix] ✅ Instance from wixEmbedsAPI');
      }
    } catch (e) { /* ignore */ }
  }

  // Check warmupData
  if (win.warmupData?.currentUrl?.query?.instance) {
    instance = win.warmupData.currentUrl.query.instance;
    console.log('[Wix] ✅ Instance from warmupData');
  }

  // Check for componentId
  if (win.warmupData?.wixCodeModel?.componentId) {
    extractedCompId = win.warmupData.wixCodeModel.componentId;
    console.log('[Wix] ✅ CompId from warmupData:', extractedCompId);
  }

  return { instance, compId: extractedCompId };
};

/**
 * Extract compId from URL query parameters (as per Wix docs - compId is passed as URL param)
 */
const extractCompIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const urlCompId = urlParams.get('compId') || urlParams.get('comp-id') || urlParams.get('comp_id') || null;
  if (urlCompId) {
    console.log('[Wix] Found compId in URL:', urlCompId);
  }
  return urlCompId;
};

/**
 * Extract instance token from URL query parameters (for External URL extensions)
 */
const extractInstanceFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const urlInstance = urlParams.get('instance') || null;
  if (urlInstance) {
    console.log('[Wix] Found instance in URL (first 30 chars):', urlInstance.substring(0, 30) + '...');
  }
  return urlInstance;
};

/**
 * Initialize and retrieve Wix instance token and compId
 */
const initializeWixData = async (): Promise<void> => {
  console.log('[WixInit] 🔄 Starting initializeWixData...');
  console.log('[WixInit] 📍 Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');

  // 1. Check URL parameters (compId is passed as URL param per Wix docs)
  console.log('[WixInit] 1️⃣ Checking URL parameters...');
  const urlCompId = extractCompIdFromUrl();
  const urlInstance = extractInstanceFromUrl();

  if (urlCompId) {
    compId = urlCompId;
    console.log('[WixInit] ✅ CompId from URL:', compId);
  }
  if (urlInstance) {
    instanceToken = urlInstance;
    console.log('[WixInit] ✅ Instance from URL');
  }

  // 2. Check DOM elements
  console.log('[WixInit] 2️⃣ Checking DOM elements...');
  if (!compId) {
    const elementCompId = extractCompIdFromElement();
    if (elementCompId) {
      compId = elementCompId;
    }
  }

  // 3. Check Wix window globals
  console.log('[WixInit] 3️⃣ Checking Wix window globals...');
  const wixGlobals = extractInstanceFromWixGlobals();
  if (!instanceToken && wixGlobals.instance) {
    instanceToken = wixGlobals.instance;
  }
  if (!compId && wixGlobals.compId) {
    compId = wixGlobals.compId;
  }

  // 4. Try to get access token from Wix SDK (for self-hosted Site Widget)
  console.log('[WixInit] 4️⃣ Getting access token from Wix SDK...');
  if (isWixEnvironment && !instanceToken) {
    const accessToken = await getAccessToken();
    if (accessToken) {
      instanceToken = accessToken;
      console.log('[WixInit] ✅ Got instance token from Wix SDK');
    }
  }

  // 5. Try legacy Wix.Utils API
  console.log('[WixInit] 5️⃣ Trying legacy Wix.Utils API...');
  try {
    const wixContext = (window as any).Wix;
    console.log('[WixInit] window.Wix:', wixContext);

    if (wixContext?.Utils?.getCompId && !compId) {
      const wixCompId = await wixContext.Utils.getCompId();
      if (wixCompId) {
        compId = wixCompId;
        console.log('[WixInit] ✅ CompId from Wix.Utils:', compId);
      }
    }

    if (wixContext?.Utils?.getInstance && !instanceToken) {
      const wixInstance = wixContext.Utils.getInstance();
      if (wixInstance) {
        instanceToken = wixInstance;
        console.log('[WixInit] ✅ Instance from Wix.Utils.getInstance');
      }
    }
  } catch (error) {
    console.log('[WixInit] Legacy Wix.Utils not available');
  }

  // Final summary
  console.log('[WixInit] ========== SUMMARY ==========');
  console.log('[WixInit] compId:', compId);
  console.log('[WixInit] instanceToken:', instanceToken ? `${instanceToken.substring(0, 30)}...` : null);
  console.log('[WixInit] isWixEnvironment:', isWixEnvironment);
  console.log('[WixInit] wixClient available:', !!wixClient);
  console.log('[WixInit] ==============================');
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
  console.log('[Wix] CompId set to:', id);
};

/**
 * Set the instance token (can be set externally)
 */
export const setInstanceToken = (token: string): void => {
  instanceToken = token;
  console.log('[Wix] Instance token set');
};

/**
 * Check if running in Wix environment
 */
export const isInWixEnvironment = (): boolean => {
  return isWixEnvironment;
};

/**
 * Fetch with Wix authentication
 * Per Wix docs: Use wixClient.fetchWithAuth() to send the access token to your backend
 * The backend can then extract instanceId from the token via Wix API
 */
export const fetchWithAuth = async (url: string, options?: RequestInit): Promise<Response> => {
  console.log('[FetchWithAuth] 🔄 Starting fetch to:', url);
  console.log('[FetchWithAuth] Method:', options?.method || 'GET');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // Add compId header if available
  if (compId) {
    headers['X-Wix-Comp-Id'] = compId;
    console.log('[FetchWithAuth] ✅ Added X-Wix-Comp-Id header:', compId);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  // Use Wix authenticated fetch if available (recommended per Wix docs)
  // This automatically injects the Wix access token
  if (isWixEnvironment && wixClient?.fetchWithAuth) {
    console.log('[FetchWithAuth] 🔐 Using wixClient.fetchWithAuth (Wix recommended method)...');
    try {
      const response = await wixClient.fetchWithAuth(url, fetchOptions);
      console.log('[FetchWithAuth] ✅ wixClient.fetchWithAuth response:', response.status);
      return response;
    } catch (error: any) {
      console.error('[FetchWithAuth] ❌ wixClient.fetchWithAuth failed:', error?.message);
      console.log('[FetchWithAuth] Falling back to direct fetch with manual token...');
    }
  }

  // Fallback: Add instance token manually to Authorization header
  if (instanceToken) {
    headers['Authorization'] = `Bearer ${instanceToken}`;
    console.log('[FetchWithAuth] ✅ Added Authorization header with instance token');
  } else {
    console.log('[FetchWithAuth] ⚠️ No instance token available');
  }

  // Direct fetch
  console.log('[FetchWithAuth] 📡 Using direct fetch...');
  console.log('[FetchWithAuth] Final headers:', Object.keys(headers));

  const response = await fetch(url, {
    ...options,
    headers,
  });
  console.log('[FetchWithAuth] Direct fetch response:', response.status);
  return response;
};

// Simple API service wrapper
class ApiService {
  private initialized = false;

  async initialize(): Promise<void> {
    console.log('[ApiService] 🔄 initialize() called, already initialized:', this.initialized);
    if (this.initialized) {
      console.log('[ApiService] ⏩ Already initialized, skipping');
      return;
    }

    console.log('[ApiService] 🚀 Running initializeWixData...');
    await initializeWixData();
    this.initialized = true;
    console.log('[ApiService] ✅ Initialization complete');
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

  getWixClient() {
    return wixClient;
  }

  isWixEnvironment(): boolean {
    return isWixEnvironment;
  }
}

export default new ApiService();
