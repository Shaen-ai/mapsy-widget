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
 * Get compId from Wix widget element's data attributes or parent Wix component
 */
const extractCompIdFromElement = (): string | null => {
  if (typeof document === 'undefined') return null;

  console.log('[Wix] Searching for compId in DOM...');

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

    // Walk up the DOM tree to find a Wix component wrapper with an ID
    console.log('[Wix] Walking up DOM tree...');
    let parent = widget.parentElement;
    let depth = 0;
    while (parent && depth < 20) {
      const tagInfo = `${parent.tagName.toLowerCase()}${parent.id ? '#' + parent.id : ''}${parent.className ? '.' + String(parent.className).split(' ')[0] : ''}`;

      // Wix components typically have IDs like "comp-xxxxx"
      if (parent.id && parent.id.startsWith('comp-')) {
        console.log('[Wix] ✅ CompId from parent element ID:', parent.id, `(depth: ${depth})`);
        return parent.id;
      }
      // Also check for data-comp-id attribute
      const parentCompId = parent.getAttribute('data-comp-id');
      if (parentCompId) {
        console.log('[Wix] ✅ CompId from parent data-comp-id:', parentCompId, `(depth: ${depth})`);
        return parentCompId;
      }

      // Log first few parents for debugging
      if (depth < 5) {
        console.log(`[Wix] Parent ${depth}: ${tagInfo}`);
      }

      parent = parent.parentElement;
      depth++;
    }
    console.log('[Wix] No comp-* ID found in parent chain (searched ${depth} levels)');
  } else {
    console.log('[Wix] mapsy-widget element not found in DOM yet');
  }

  // Also check for comp id in any element on the page
  const compElements = document.querySelectorAll('[id^="comp-"]');
  console.log(`[Wix] Found ${compElements.length} elements with comp-* IDs on page`);

  if (compElements.length > 0) {
    // Log first few for debugging
    const samples = Array.from(compElements).slice(0, 3).map(el => el.id);
    console.log('[Wix] Sample comp IDs:', samples.join(', '));
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

  console.log('[Wix] Checking window globals...');

  // Log available Wix-related globals
  const wixGlobals = ['Wix', 'wixDevelopersAnalytics', 'viewerModel', 'warmupData', 'wixBiSession', 'fedops', '__VIEWER_MODEL__', 'rendererModel', 'wixEmbedsAPI'];
  const foundGlobals = wixGlobals.filter(g => win[g] !== undefined);
  console.log('[Wix] Available globals:', foundGlobals.length > 0 ? foundGlobals.join(', ') : 'none');

  // Check rendererModel (common in Wix)
  if (win.rendererModel) {
    console.log('[Wix] rendererModel keys:', Object.keys(win.rendererModel).join(', '));
    if (win.rendererModel.siteInfo?.siteId) {
      console.log('[Wix] SiteId from rendererModel:', win.rendererModel.siteInfo.siteId);
    }
  }

  // Check wixEmbedsAPI
  if (win.wixEmbedsAPI) {
    console.log('[Wix] wixEmbedsAPI available');
    if (typeof win.wixEmbedsAPI.getAppToken === 'function') {
      try {
        const token = win.wixEmbedsAPI.getAppToken?.();
        if (token) {
          instance = token;
          console.log('[Wix] ✅ Instance from wixEmbedsAPI.getAppToken()');
        }
      } catch (e) {
        console.log('[Wix] wixEmbedsAPI.getAppToken() failed');
      }
    }
  }

  // Check warmupData
  if (win.warmupData?.currentUrl?.query?.instance) {
    instance = win.warmupData.currentUrl.query.instance;
    console.log('[Wix] ✅ Instance from warmupData');
  }

  // Check for componentId in various places
  if (win.warmupData?.wixCodeModel?.componentId) {
    extractedCompId = win.warmupData.wixCodeModel.componentId;
    console.log('[Wix] ✅ CompId from warmupData:', extractedCompId);
  }

  if (win.fedops?.data?.params?.componentId) {
    extractedCompId = win.fedops.data.params.componentId;
    console.log('[Wix] ✅ CompId from fedops:', extractedCompId);
  }

  if (win.__VIEWER_MODEL__?.siteFeaturesConfigs?.platform?.componentId) {
    extractedCompId = win.__VIEWER_MODEL__.siteFeaturesConfigs.platform.componentId;
    console.log('[Wix] ✅ CompId from __VIEWER_MODEL__');
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
  console.log('[Wix] === Starting Wix Data Initialization ===');

  // Step 1: Check URL parameters
  console.log('[Wix] Step 1: Checking URL params...');
  console.log('[Wix] Current URL:', window.location.href);
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

  // Step 2: Check DOM elements
  console.log('[Wix] Step 2: Checking DOM elements...');
  if (!compId) {
    const elementCompId = extractCompIdFromElement();
    if (elementCompId) {
      compId = elementCompId;
    }
  }

  // Step 3: Check Wix window globals
  console.log('[Wix] Step 3: Checking window globals...');
  const wixGlobals = extractInstanceFromWixGlobals();
  if (!instanceToken && wixGlobals.instance) {
    instanceToken = wixGlobals.instance;
  }
  if (!compId && wixGlobals.compId) {
    compId = wixGlobals.compId;
  }

  // Step 4: Try Wix SDK methods
  console.log('[Wix] Step 4: Checking Wix SDK...');
  if (isWixEnvironment && wixClient) {
    console.log('[Wix] Wix client available, trying SDK methods...');
    try {
      if (wixClient.auth && typeof (wixClient.auth as any).getAccessToken === 'function') {
        const tokenData = await (wixClient.auth as any).getAccessToken();
        if (tokenData?.accessToken && !instanceToken) {
          instanceToken = tokenData.accessToken;
          console.log('[Wix] ✅ Instance from SDK getAccessToken()');
        }
      }
    } catch (error) {
      console.log('[Wix] SDK getAccessToken() failed:', (error as Error).message);
    }

    // Try legacy Wix.Utils API
    try {
      if (typeof (window as any).Wix !== 'undefined') {
        const wixContext = (window as any).Wix;
        console.log('[Wix] Legacy Wix object found, keys:', Object.keys(wixContext).join(', '));
        if (wixContext.Utils?.getCompId) {
          const wixCompId = await wixContext.Utils.getCompId();
          if (wixCompId && !compId) {
            compId = wixCompId;
            console.log('[Wix] ✅ CompId from Wix.Utils.getCompId():', compId);
          }
        }
      }
    } catch (error) {
      console.log('[Wix] Wix.Utils failed:', (error as Error).message);
    }
  } else {
    console.log('[Wix] Wix client not available (isWixEnvironment:', isWixEnvironment, ')');
  }

  // Final summary
  console.log('[Wix] === Initialization Complete ===');
  console.log('[Wix] Final Instance:', instanceToken ? '✅ Available' : '❌ Not available');
  console.log('[Wix] Final CompId:', compId ? `✅ ${compId}` : '❌ Not available');
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
