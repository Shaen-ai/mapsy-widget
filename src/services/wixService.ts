import { site } from '@wix/site';
import { createClient } from '@wix/sdk';

// App ID from Wix Dev Center
const APP_ID = '0d076a26-ce6d-4d16-83c5-126cdf640aa4';

// Store instance token and compId
let instanceToken: string | null = null;
let compId: string | null = null;
let wixClient: ReturnType<typeof createClient> | null = null;
let isWixEnvironment = false;

// Create Wix client with site authentication (as per Wix docs)
console.log('[Wix] Creating client...');

try {
  wixClient = createClient({
    auth: site.auth(),
    host: site.host({ applicationId: APP_ID }),
  });
  isWixEnvironment = true;
  console.log('[Wix] ✅ Client created');
} catch (error) {
  console.log('[Wix] Running outside Wix environment, using standalone mode');
  isWixEnvironment = false;
}

/**
 * Listen for postMessage from parent window (Wix sends data this way to iframes)
 */
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

      // Log messages that look like they contain useful data
      if (data && typeof data === 'object' && (data.compId || data.instance || data.props || data.type)) {
        console.log('[Wix] PostMessage:', JSON.stringify(data).substring(0, 200));
      }

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
        console.log('[Wix] Wix message type:', data.type);
        if (data.compId) {
          compId = data.compId;
          console.log('[Wix] ✅ CompId from Wix message:', compId);
        }
      }

      // Wix TPA message format
      if (data?.intent === 'TPA2') {
        console.log('[Wix] TPA2 message received');
        if (data.compId) {
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
      console.log('[Wix] Requested compId from parent');
    } catch (e) {
      // Parent communication failed
    }
  }

  console.log('[Wix] PostMessage listener registered');
}

/**
 * Get compId from Wix widget element's data attributes or parent Wix component
 */
const extractCompIdFromElement = (): string | null => {
  if (typeof document === 'undefined') return null;

  console.log('[Wix] Searching for compId in DOM...');

  // Check wix-internal-id element (Wix iframe container)
  const wixInternalEl = document.getElementById('wix-internal-id');
  if (wixInternalEl) {
    // Log all attributes for debugging
    const attrs: string[] = [];
    for (let i = 0; i < wixInternalEl.attributes.length; i++) {
      const attr = wixInternalEl.attributes[i];
      attrs.push(`${attr.name}="${attr.value}"`);
    }
    console.log('[Wix] wix-internal-id attributes:', attrs.join(', '));

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
    console.log('[Wix] Found mapsy-widget element');

    // Log all attributes on the widget for debugging
    const attrs: string[] = [];
    for (let i = 0; i < widget.attributes.length; i++) {
      const attr = widget.attributes[i];
      if (!attr.name.startsWith('style')) {
        attrs.push(`${attr.name}="${attr.value.substring(0, 50)}${attr.value.length > 50 ? '...' : ''}"`);
      }
    }
    console.log('[Wix] Widget attributes:', attrs.join(', ') || 'none');

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
    const samples = Array.from(compElements).slice(0, 3).map(el => el.id);
    console.log('[Wix] Found comp-* IDs:', samples.join(', '));
    return compElements[0].id;
  }

  console.log('[Wix] No compId found in DOM');
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

  // Log available Wix-related globals
  const wixGlobals = ['Wix', 'wixEmbedsAPI', 'rendererModel', 'warmupData', '__VIEWER_MODEL__'];
  const foundGlobals = wixGlobals.filter(g => win[g] !== undefined);
  if (foundGlobals.length > 0) {
    console.log('[Wix] Available globals:', foundGlobals.join(', '));
  }

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
 * Extract compId from URL query parameters
 */
const extractCompIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('compId') || urlParams.get('comp-id') || urlParams.get('comp_id') || null;
};

/**
 * Extract instance token from URL query parameters (for iframe scenarios)
 */
const extractInstanceFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('instance') || null;
};

/**
 * Initialize and retrieve Wix instance token and compId
 */
const initializeWixData = async (): Promise<void> => {
  console.log('[Wix] Initializing...');
  console.log('[Wix] URL:', window.location.href);

  // 1. Check URL parameters
  const urlCompId = extractCompIdFromUrl();
  const urlInstance = extractInstanceFromUrl();
  if (urlCompId) {
    compId = urlCompId;
    console.log('[Wix] ✅ CompId from URL:', compId);
  }
  if (urlInstance) {
    instanceToken = urlInstance;
    console.log('[Wix] ✅ Instance from URL');
  }

  // 2. Check DOM elements
  if (!compId) {
    const elementCompId = extractCompIdFromElement();
    if (elementCompId) {
      compId = elementCompId;
    }
  }

  // 3. Check Wix window globals
  const wixGlobals = extractInstanceFromWixGlobals();
  if (!instanceToken && wixGlobals.instance) {
    instanceToken = wixGlobals.instance;
  }
  if (!compId && wixGlobals.compId) {
    compId = wixGlobals.compId;
  }

  // 4. Try Wix SDK methods
  if (isWixEnvironment && wixClient) {
    try {
      if (wixClient.auth && typeof (wixClient.auth as any).getAccessToken === 'function') {
        const tokenData = await (wixClient.auth as any).getAccessToken();
        if (tokenData?.accessToken && !instanceToken) {
          instanceToken = tokenData.accessToken;
          console.log('[Wix] ✅ Instance from SDK');
        }
      }
    } catch (error) {
      // SDK method failed, continue
    }

    // Try legacy Wix.Utils API
    try {
      const wixContext = (window as any).Wix;
      if (wixContext?.Utils?.getCompId) {
        const wixCompId = await wixContext.Utils.getCompId();
        if (wixCompId && !compId) {
          compId = wixCompId;
          console.log('[Wix] ✅ CompId from Wix.Utils:', compId);
        }
      }
    } catch (error) {
      // Legacy API failed, continue
    }
  }

  // Final summary
  console.log('[Wix] Result - Instance:', instanceToken ? '✅' : '❌', 'CompId:', compId || '❌');
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
  console.log('[Wix] CompId set:', compId);
};

/**
 * Set the instance token (can be set externally)
 */
export const setInstanceToken = (token: string): void => {
  instanceToken = token;
  console.log('[Wix] Instance token set:', instanceToken ? 'Available' : 'Not available');
};

/**
 * Check if running in Wix environment
 */
export const isInWixEnvironment = (): boolean => {
  return isWixEnvironment;
};

// Fetch with Wix auth, fallback to direct fetch if auth fails (e.g., in editor preview)
export const fetchWithAuth = async (url: string, options?: RequestInit): Promise<Response> => {
  // Add compId header if available
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (compId) {
    headers['X-Wix-Comp-Id'] = compId;
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  // If in Wix environment and client available, use authenticated fetch
  if (isWixEnvironment && wixClient) {
    try {
      // Try Wix authenticated fetch
      const response = await wixClient.fetchWithAuth(url, fetchOptions);
      console.log('[Wix] Auth fetch:', response.status, response.ok ? '✅' : '❌');
      return response;
    } catch (error) {
      // Fallback to direct fetch (for editor preview or when auth fails)
      console.log('[Wix] Auth failed, using direct fetch');
    }
  }

  // Direct fetch (non-Wix or fallback)
  const response = await fetch(url, fetchOptions);
  console.log('[Wix] Direct fetch:', response.status, response.ok ? '✅' : '❌');
  return response;
};

// Simple API service wrapper
class ApiService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await initializeWixData();
    this.initialized = true;
    console.log('[API] ✅ Ready');
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
}

export default new ApiService();
