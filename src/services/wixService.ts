import { site } from '@wix/site';
import { createClient } from '@wix/sdk';

// App ID from Wix Dev Center
const APP_ID = '0d076a26-ce6d-4d16-83c5-126cdf640aa4';

// Store instance token and compId
let instanceToken: string | null = null;
let compId: string | null = null;
let wixClient: ReturnType<typeof createClient> | null = null;
let isWixEnvironment = false;

// Access token listener - stored as per Wix example
let accessTokenListener: any = null;

// Create Wix client with site authentication (as per Wix docs for self-hosted apps)
console.log('[WixClient] 🔄 Attempting to create Wix client...');
console.log('[WixClient] APP_ID:', APP_ID);
try {
  wixClient = createClient({
    auth: site.auth(),
    host: site.host({ applicationId: APP_ID }),
  });

  // Store the access token listener (as per Wix example)
  // This is required for fetchWithAuth to work
  accessTokenListener = wixClient.auth.getAccessTokenInjector();

  console.log('[WixClient] ✅ Wix client created successfully');
  console.log('[WixClient] ✅ Access token listener stored:', !!accessTokenListener);
  console.log('[WixClient] 📡 fetchWithAuth available:', typeof wixClient?.fetchWithAuth);

  isWixEnvironment = true;
} catch (error) {
  console.error('[WixClient] ❌ Failed to create Wix client:', error);
  isWixEnvironment = false;
}

/**
 * Get the Wix client instance
 */
export const getWixClient = () => wixClient;

/**
 * Get the access token listener (for storing in custom element)
 */
export const getAccessTokenListener = () => accessTokenListener;

/**
 * Listen for postMessage from parent window (Wix sends data this way to custom elements in iframes)
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
          console.log('[Wix] ✅ CompId from Wix props message:', compId);
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

    // Check if the widget element itself has an id starting with 'comp-'
    // This is how Wix assigns component IDs in the editor
    const widgetId = widget.id;
    if (widgetId && widgetId.startsWith('comp-')) {
      console.log('[Wix] ✅ CompId from widget element id:', widgetId);
      return widgetId;
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
 * Extract instance from Wix's window globals (fallback for legacy support)
 */
const extractInstanceFromWixGlobals = (): { instance: string | null; compId: string | null } => {
  if (typeof window === 'undefined') return { instance: null, compId: null };

  let instance: string | null = null;
  let extractedCompId: string | null = null;

  const win = window as any;

  // Check wixEmbedsAPI
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
  if (win.warmupData?.currentUrl?.query?.instance && !instance) {
    instance = win.warmupData.currentUrl.query.instance;
    console.log('[Wix] ✅ Instance from warmupData');
  }

  if (win.warmupData?.wixCodeModel?.componentId && !extractedCompId) {
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
 * Initialize Wix data
 * Per Wix docs for self-hosted Site Widget:
 * - compId may be passed via URL or attributes (saved by settings panel)
 * - instanceId is extracted by the BACKEND from the access token sent via fetchWithAuth
 * - We don't need to manually get the token on frontend
 */
const initializeWixData = async (): Promise<void> => {
  console.log('[WixInit] 🔄 Starting initializeWixData...');
  console.log('[WixInit] 📍 Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
  console.log('[WixInit] 🔐 Wix client available:', !!wixClient);
  console.log('[WixInit] 🔐 Access token listener stored:', !!accessTokenListener);
  console.log('[WixInit] 📦 CompId already set:', compId || 'NOT SET');

  // Only try to extract compId if it hasn't been set yet (via setCompId from widget element)
  if (!compId) {
    // 1. Check URL parameters (compId may be passed as URL param)
    const urlCompId = extractCompIdFromUrl();
    if (urlCompId) {
      compId = urlCompId;
      console.log('[WixInit] ✅ CompId from URL:', compId);
    }

    // 2. Check DOM elements for compId (saved by settings panel via widget.setProp)
    if (!compId) {
      const elementCompId = extractCompIdFromElement();
      if (elementCompId) {
        compId = elementCompId;
        console.log('[WixInit] ✅ CompId from DOM element:', compId);
      }
    }

    // 3. Check Wix window globals (for fallback/legacy support)
    if (!compId) {
      const wixGlobals = extractInstanceFromWixGlobals();
      if (wixGlobals.compId) {
        compId = wixGlobals.compId;
        console.log('[WixInit] ✅ CompId from window globals:', compId);
      }
    }
  } else {
    console.log('[WixInit] ⏭️  CompId already set (skipping extraction):', compId);
  }

  // Extract instanceToken if not already set
  if (!instanceToken) {
    const urlInstance = extractInstanceFromUrl();
    if (urlInstance) {
      instanceToken = urlInstance;
      console.log('[WixInit] ✅ Instance from URL');
    }

    if (!instanceToken) {
      const wixGlobals = extractInstanceFromWixGlobals();
      if (wixGlobals.instance) {
        instanceToken = wixGlobals.instance;
        console.log('[WixInit] ✅ Instance from window globals');
      }
    }
  }

  // Final summary
  console.log('[WixInit] ========== SUMMARY ==========');
  console.log('[WixInit] compId:', compId || 'NOT SET (will fetch default data)');
  console.log('[WixInit] instanceToken (manual):', instanceToken ? 'present' : 'null (will use fetchWithAuth)');
  console.log('[WixInit] isWixEnvironment:', isWixEnvironment);
  console.log('[WixInit] wixClient.fetchWithAuth available:', !!wixClient?.fetchWithAuth);
  console.log('[WixInit] ==============================');

  if (!compId) {
    console.log('[WixInit] ⚠️ No compId found - will fetch default/demo data without authentication');
    console.log('[WixInit] 💡 Tip: Open settings panel to generate and save a compId');
  } else {
    console.log('[WixInit] ✅ CompId found - will fetch widget-specific data with authentication');
  }
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
 * Current Wix view mode - set from wixconfig attribute (Wix official method)
 */
let currentViewMode: 'Editor' | 'Preview' | 'Site' = 'Site';

/**
 * Get current view mode from wixconfig attribute
 */
export function getViewMode(): 'Editor' | 'Preview' | 'Site' {
  return currentViewMode;
}

/**
 * Fetch with Wix authentication (or unauthenticated if no comp-id or in editor)
 *
 * Behavior:
 * - Editor mode: ALWAYS unauthenticated (with comp-id header only if available)
 * - Published site without comp-id: Unauthenticated request (no headers)
 * - Published site with comp-id: Authenticated request (Authorization + comp-id)
 *
 * Per Wix docs: Use wixClient.fetchWithAuth() to send the access token to your backend
 * The backend can then extract instanceId from the token via Wix API
 */
export const fetchWithAuth = async (url: string, options?: RequestInit): Promise<Response> => {
  console.log('[FetchWithAuth] 🔄 Starting fetch to:', url);
  console.log('[FetchWithAuth] Method:', options?.method || 'GET');
  console.log('[FetchWithAuth] CompId:', compId || 'NOT SET');

  const viewMode = getViewMode();
  const inEditor = viewMode === 'Editor' || viewMode === 'Preview';
  console.log('[FetchWithAuth] ViewMode:', viewMode, '| Editor mode:', inEditor);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // EDITOR MODE: Always unauthenticated, but send comp-id if available
  if (inEditor) {
    console.log('[FetchWithAuth] 📝 Editor/Preview mode - making unauthenticated request');
    if (compId) {
      headers['X-Wix-Comp-Id'] = compId;
      console.log('[FetchWithAuth] ✅ Added X-Wix-Comp-Id header (editor):', compId);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });
    console.log('[FetchWithAuth] ✅ Editor unauthenticated fetch response:', response.status);
    return response;
  }

  // PUBLISHED SITE: Check if comp-id exists
  if (!compId) {
    console.log('[FetchWithAuth] 🌐 Published site, no compId - unauthenticated request for default data');
    const response = await fetch(url, {
      ...options,
      headers,
    });
    console.log('[FetchWithAuth] ✅ Unauthenticated fetch response:', response.status);
    return response;
  }

  // PUBLISHED SITE with comp-id: Make authenticated request
  console.log('[FetchWithAuth] 🔐 Published site with compId - making authenticated request');

  // Add compId header
  headers['X-Wix-Comp-Id'] = compId;
  console.log('[FetchWithAuth] ✅ Added X-Wix-Comp-Id header:', compId);

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  // PREFER Wix SDK fetchWithAuth (recommended method per Wix docs)
  if (isWixEnvironment && wixClient?.fetchWithAuth) {
    console.log('[FetchWithAuth] 🔐 Using wixClient.fetchWithAuth (Wix SDK - preferred method)');
    console.log('[FetchWithAuth] 🔍 Headers being sent:', Object.keys(headers));
    try {
      const response = await wixClient.fetchWithAuth(url, fetchOptions);
      console.log('[FetchWithAuth] ✅ wixClient.fetchWithAuth response:', response.status);
      return response;
    } catch (error: any) {
      console.error('[FetchWithAuth] ❌ wixClient.fetchWithAuth failed:', error?.message);
      console.log('[FetchWithAuth] Falling back to manual authentication...');
    }
  }

  // FALLBACK: Manual auth with instance token (if fetchWithAuth failed or unavailable)
  if (instanceToken) {
    headers['Authorization'] = `Bearer ${instanceToken}`;
    console.log('[FetchWithAuth] 📡 Using manual Authorization header with instance token (fallback)');
    console.log('[FetchWithAuth] 🔍 Headers:', Object.keys(headers));

    const response = await fetch(url, {
      ...options,
      headers,
    });
    console.log('[FetchWithAuth] ✅ Manual auth fetch response:', response.status);
    return response;
  }

  // LAST RESORT: Direct fetch without auth (shouldn't happen in published site with compId)
  console.log('[FetchWithAuth] ⚠️ No authentication available - using direct fetch');
  const response = await fetch(url, {
    ...options,
    headers,
  });
  console.log('[FetchWithAuth] ✅ Unauthenticated fetch response:', response.status);
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
    console.log('fetchweithauth options',options)
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
}

export default new ApiService();
