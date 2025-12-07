import { site } from '@wix/site';
import { createClient } from '@wix/sdk';

// App ID from Wix Dev Center
const APP_ID = '0d076a26-ce6d-4d16-83c5-126cdf640aa4';

// Default values for local development
const DEV_INSTANCE_TOKEN = '4V4yklZJzi-9mM3TkyVsG-dQcOX7iBH5xzewyrEIJUE.eyJpbnN0YW5jZUlkIjoiNjNmZDE5YTctYTg5Zi00OTc1LTgxNmItZTYxM2MwNDA5NTllIiwiYXBwRGVmSWQiOiIwZDA3NmEyNi1jZTZkLTRkMTYtODNjNS0xMjZjZGY2NDBhYTQiLCJzaWduRGF0ZSI6IjIwMjUtMTItMDdUMDg6MDg6MTguNDQ3WiIsInVpZCI6IjRhMjllMmJmLTU4MWMtNDNkNi1iOGZlLTNiYzNiODA2Njg1ZCIsInBlcm1pc3Npb25zIjoiT1dORVIiLCJkZW1vTW9kZSI6ZmFsc2UsInNpdGVPd25lcklkIjoiNGEyOWUyYmYtNTgxYy00M2Q2LWI4ZmUtM2JjM2I4MDY2ODVkIiwic2l0ZU1lbWJlcklkIjoiNGEyOWUyYmYtNTgxYy00M2Q2LWI4ZmUtM2JjM2I4MDY2ODVkIiwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTEyLTA3VDEyOjA4OjE4LjQ0N1oiLCJsb2dpbkFjY291bnRJZCI6IjRhMjllMmJmLTU4MWMtNDNkNi1iOGZlLTNiYzNiODA2Njg1ZCIsInBhaSI6bnVsbCwibHBhaSI6bnVsbCwiYW9yIjp0cnVlLCJzY2QiOiIyMDI1LTA1LTI5VDE4OjUyOjI4Ljg0MVoiLCJhY2QiOiIyMDI0LTEyLTI5VDE3OjA4OjQ2WiJ9';
const DEV_COMP_ID = 'comp-r1tmfnf0';

// State
let instanceToken: string | null = DEV_INSTANCE_TOKEN;
let compId: string | null = DEV_COMP_ID;
let wixClient: ReturnType<typeof createClient> | null = null;
let isWixEnvironment = false;
let accessTokenListener: any = null;

// Create Wix client
try {
  wixClient = createClient({
    auth: site.auth(),
    host: site.host({ applicationId: APP_ID }),
  });
  accessTokenListener = wixClient.auth.getAccessTokenInjector();
  isWixEnvironment = true;
} catch {
  isWixEnvironment = false;
}

export const getWixClient = () => wixClient;
export const getAccessTokenListener = () => accessTokenListener;
export const getInstanceToken = (): string | null => instanceToken;
export const getCompId = (): string | null => compId;

export const setCompId = (id: string): void => {
  compId = id;
};

export const setInstanceToken = (token: string): void => {
  instanceToken = token;
};

/**
 * Check if we're in the editor or preview mode
 */
export const isInEditorMode = (): boolean => {
  if (typeof window === 'undefined') return false;

  const url = window.location.href.toLowerCase();
  const editorPatterns = [
    'editor.wix.com', 'editor-elements-registry', '/editor/',
    'wixsite.com/_preview', 'editorx.com', 'wixstudio.com',
    '/edit', 'preview=true', 'viewMode=editor', 'viewMode=preview',
    '/preview/', '_preview',
  ];

  for (const pattern of editorPatterns) {
    if (url.includes(pattern)) return true;
  }

  const win = window as any;
  const viewMode = win.Wix?.Utils?.getViewMode?.();
  if (viewMode && viewMode !== 'Site') return true;
  if (win.warmupData?.viewMode && win.warmupData.viewMode !== 'site') return true;
  if (win.renderingContext?.viewMode && win.renderingContext.viewMode !== 'SITE') return true;

  return false;
};

/**
 * Fetch with Wix authentication
 */
export const fetchWithAuth = async (url: string, options?: RequestInit): Promise<Response> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (compId) {
    headers['X-Wix-Comp-Id'] = compId;
  }

  const fetchOptions: RequestInit = { ...options, headers };

  // Use Wix authenticated fetch if available
  if (isWixEnvironment && wixClient?.fetchWithAuth) {
    try {
      return await wixClient.fetchWithAuth(url, fetchOptions);
    } catch {
      // Fall through to direct fetch
    }
  }

  // Fallback: Add instance token manually
  if (instanceToken) {
    headers['Authorization'] = `Bearer ${instanceToken}`;
  }

  return fetch(url, { ...options, headers });
};

/**
 * Initialize Wix data from URL params
 */
const initializeWixData = async (): Promise<void> => {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const urlCompId = urlParams.get('compId');
  const urlInstance = urlParams.get('instance');

  if (urlCompId) compId = urlCompId;
  if (urlInstance) instanceToken = urlInstance;
};

// API Service
class ApiService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await initializeWixData();
    this.initialized = true;
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
}

export default new ApiService();
