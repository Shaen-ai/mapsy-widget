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

// Export fetch function that uses Wix authentication
export const fetchWithAuth = async (url: string, options?: RequestInit): Promise<Response> => {
  console.log('[Wix] Fetching:', url);

  const response = await wixClient.fetchWithAuth(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  console.log('[Wix] Response:', response.status, response.ok ? '✅' : '❌');
  return response;
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
