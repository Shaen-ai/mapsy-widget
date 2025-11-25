// API Service - Makes direct fetch calls to backend
// Note: Wix SDK auth doesn't work for JS-embedded widgets, using direct fetch

console.log('[ApiService] Module loading...');

class ApiService {
  private static instance: ApiService;
  private initialized: boolean = false;

  private constructor() {
    console.log('[ApiService] Constructor called');
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  async initialize(): Promise<void> {
    console.log('[ApiService] Initializing...');
    this.initialized = true;
    console.log('[ApiService] ✅ Initialized');
  }

  async fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
    console.log('[ApiService] Fetching:', url);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    console.log('[ApiService] Response:', response.status, response.ok ? '✅' : '❌');
    return response;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export default ApiService.getInstance();
