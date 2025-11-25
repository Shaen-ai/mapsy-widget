import { site } from '@wix/site';
import { createClient } from '@wix/sdk';

// App ID from Wix Dev Center
const APP_ID = '0d076a26-ce6d-4d16-83c5-126cdf640aa4';

// Create Wix client with site authentication (as per Wix docs)
console.log('[Wix] Creating client...');

const wixClient = createClient({
  auth: site.auth(),
  host: site.host({ applicationId: APP_ID }),
});

console.log('[Wix] ✅ Client created');

// Fetch with Wix auth, fallback to direct fetch if auth fails (e.g., in editor preview)
export const fetchWithAuth = async (url: string, options?: RequestInit): Promise<Response> => {
  const fetchOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  };

  try {
    // Try Wix authenticated fetch
    const response = await wixClient.fetchWithAuth(url, fetchOptions);
    console.log('[Wix] Auth fetch:', response.status, response.ok ? '✅' : '❌');
    return response;
  } catch (error) {
    // Fallback to direct fetch (for editor preview or when auth fails)
    console.log('[Wix] Auth failed, using direct fetch');
    const response = await fetch(url, fetchOptions);
    console.log('[Wix] Direct fetch:', response.status, response.ok ? '✅' : '❌');
    return response;
  }
};

// Simple API service wrapper
class ApiService {
  async initialize(): Promise<void> {
    console.log('[API] ✅ Ready');
  }

  async fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
    return fetchWithAuth(url, options);
  }

  isInitialized(): boolean {
    return true;
  }
}

export default new ApiService();
