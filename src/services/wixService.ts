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

  // Look for mapsy-widget element
  const widget = document.querySelector('mapsy-widget');
  if (widget) {
    // Check various attribute patterns Wix might use
    const wixCompId = widget.getAttribute('wix-comp-id') ||
                      widget.getAttribute('data-comp-id') ||
                      widget.getAttribute('data-wix-comp-id') ||
                      widget.getAttribute('compid');
    if (wixCompId) {
      console.log('[Wix] CompId from widget attribute:', wixCompId);
      return wixCompId;
    }

    // Walk up the DOM tree to find a Wix component wrapper with an ID
    let parent = widget.parentElement;
    while (parent) {
      // Wix components typically have IDs like "comp-xxxxx"
      if (parent.id && parent.id.startsWith('comp-')) {
        console.log('[Wix] CompId from parent element ID:', parent.id);
        return parent.id;
      }
      // Also check for data-comp-id attribute
      const parentCompId = parent.getAttribute('data-comp-id');
      if (parentCompId) {
        console.log('[Wix] CompId from parent data-comp-id:', parentCompId);
        return parentCompId;
      }
      parent = parent.parentElement;
    }

    // Try closest with ID as fallback
    const closestWithId = widget.closest('[id]');
    if (closestWithId?.id && closestWithId.id.startsWith('comp-')) {
      console.log('[Wix] CompId from closest element with ID:', closestWithId.id);
      return closestWithId.id;
    }
  }

  // Also check for comp id in any element on the page
  const compElement = document.querySelector('[data-comp-id]') ||
                      document.querySelector('[wix-comp-id]') ||
                      document.querySelector('[id^="comp-"]');
  if (compElement) {
    const id = compElement.getAttribute('data-comp-id') ||
               compElement.getAttribute('wix-comp-id') ||
               (compElement.id?.startsWith('comp-') ? compElement.id : null);
    if (id) {
      console.log('[Wix] CompId from page element:', id);
      return id;
    }
  }

  return null;
};

/**
 * Extract instance from Wix's window.wixDevelopersAnalytics or other globals
 */
const extractInstanceFromWixGlobals = (): { instance: string | null; compId: string | null } => {
  if (typeof window === 'undefined') return { instance: null, compId: null };

  let instance: string | null = null;
  let extractedCompId: string | null = null;

  // Check for Wix instance in various global locations
  const win = window as any;

  // Method 1: wixDevelopersAnalytics
  if (win.wixDevelopersAnalytics?.biToken) {
    console.log('[Wix] Found wixDevelopersAnalytics');
  }

  // Method 2: Check viewerModel (Wix Viewer)
  if (win.viewerModel?.site?.siteId) {
    console.log('[Wix] Found viewerModel, siteId:', win.viewerModel.site.siteId);
  }

  // Method 3: Check warmupData
  if (win.warmupData?.currentUrl?.query?.instance) {
    instance = win.warmupData.currentUrl.query.instance;
    console.log('[Wix] Instance from warmupData');
  }

  // Method 4: Check wixBiSession
  if (win.wixBiSession?.viewerSessionId) {
    console.log('[Wix] Found wixBiSession');
  }

  // Method 5: Check for rendered by or componentId in warmupData
  if (win.warmupData?.wixCodeModel?.componentId) {
    extractedCompId = win.warmupData.wixCodeModel.componentId;
    console.log('[Wix] CompId from warmupData:', extractedCompId);
  }

  // Method 6: Check fedops
  if (win.fedops?.data?.params?.componentId) {
    extractedCompId = win.fedops.data.params.componentId;
    console.log('[Wix] CompId from fedops:', extractedCompId);
  }

  // Method 7: Check __VIEWER_MODEL__
  if (win.__VIEWER_MODEL__?.siteFeaturesConfigs?.platform?.componentId) {
    extractedCompId = win.__VIEWER_MODEL__.siteFeaturesConfigs.platform.componentId;
    console.log('[Wix] CompId from __VIEWER_MODEL__');
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
  console.log('[Wix] Initializing Wix data...');

  // Method 1: Try to get from URL parameters
  const urlCompId = extractCompIdFromUrl();
  if (urlCompId) {
    compId = urlCompId;
    console.log('[Wix] CompId from URL:', compId);
  }

  const urlInstance = extractInstanceFromUrl();
  if (urlInstance) {
    instanceToken = urlInstance;
    console.log('[Wix] Instance from URL:', instanceToken ? 'Available' : 'Not available');
  }

  // Method 2: Try to extract from DOM elements
  if (!compId) {
    const elementCompId = extractCompIdFromElement();
    if (elementCompId) {
      compId = elementCompId;
    }
  }

  // Method 3: Try to extract from Wix globals
  const wixGlobals = extractInstanceFromWixGlobals();
  if (!instanceToken && wixGlobals.instance) {
    instanceToken = wixGlobals.instance;
  }
  if (!compId && wixGlobals.compId) {
    compId = wixGlobals.compId;
  }

  // Method 4: If in Wix environment, try to get from SDK
  if (isWixEnvironment && wixClient) {
    try {
      // Get instance token from Wix client auth
      if (wixClient.auth && typeof (wixClient.auth as any).getAccessToken === 'function') {
        const tokenData = await (wixClient.auth as any).getAccessToken();
        if (tokenData?.accessToken) {
          instanceToken = tokenData.accessToken;
          console.log('[Wix] Instance token from SDK:', instanceToken ? 'Available' : 'Not available');
        }
      }
    } catch (error) {
      console.log('[Wix] Could not get instance token from SDK:', (error as Error).message);
    }

    // Try to get compId from Wix widget context if available
    try {
      // Check if we're in a widget context (legacy Wix API)
      if (typeof (window as any).Wix !== 'undefined') {
        const wixContext = (window as any).Wix;
        if (wixContext.Utils && wixContext.Utils.getCompId) {
          const wixCompId = await wixContext.Utils.getCompId();
          if (wixCompId && !compId) {
            compId = wixCompId;
            console.log('[Wix] CompId from Wix.Utils:', compId);
          }
        }
      }
    } catch (error) {
      console.log('[Wix] Could not get compId from Wix.Utils:', (error as Error).message);
    }
  }

  // Method 5: Try to get compId from props passed to the widget via Wix Blocks
  try {
    if (typeof (window as any).$w !== 'undefined') {
      // Wix Velo environment
      console.log('[Wix] $w (Velo) environment detected');
    }
  } catch (error) {
    // Not in Velo environment
  }

  console.log('[Wix] Final state - Instance:', instanceToken ? 'Available' : 'Not available');
  console.log('[Wix] Final state - CompId:', compId || 'Not available');
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
