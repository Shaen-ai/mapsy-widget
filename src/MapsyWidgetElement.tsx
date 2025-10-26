import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import wixService from './services/wixService';

/**
 * Custom Element for Wix integration
 * This wraps the React widget as a Web Component that Wix can interact with
 */
class MapsyWidgetElement extends HTMLElement {
  private root: ReactDOM.Root | null = null;
  private config = {
    defaultView: 'map' as 'map' | 'list',
    showHeader: false,
    headerTitle: 'Our Locations',
    mapZoomLevel: 12,
    primaryColor: '#3B82F6',
    apiUrl: 'https://mapsy-api.nextechspires.com/api'
  };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // Specify which attributes to observe for changes
  static get observedAttributes() {
    return [
      'default-view',
      'defaultview',  // Support both hyphenated and non-hyphenated
      'show-header',
      'showheader',
      'header-title',
      'headertitle',
      'map-zoom-level',
      'mapzoomlevel',
      'primary-color',
      'primarycolor',
      'api-url',
      'compid',  // Wix component ID
      'instance',  // Wix instance token
      'instance-token',  // Alternative attribute name
      'config'  // Support full config as JSON string
    ];
  }

  async connectedCallback() {
    console.log('MapsyWidget connected to DOM');
    console.log('[MapsyWidget] All attributes:', this.getAttributeNames());

    // Try to get compId from various attribute formats
    const compId = this.getAttribute('compId') || this.getAttribute('compid') || this.getAttribute('comp-id');
    console.log('[MapsyWidget] CompId from attributes:', compId);

    // Try to get instance token from multiple sources
    let instanceToken = this.getAttribute('instance') || this.getAttribute('instance-token');

    // If not in attributes, try URL parameters (current window)
    if (!instanceToken && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      instanceToken = urlParams.get('instance') || urlParams.get('instanceToken') || null;
      if (instanceToken) {
        console.log('[MapsyWidget] Instance token found in current window URL');
      }
    }

    // If not in current URL, try parent frame URL (for iframe scenarios)
    if (!instanceToken && typeof window !== 'undefined' && window.parent !== window) {
      try {
        const parentUrl = new URL(window.parent.location.href);
        const parentParams = new URLSearchParams(parentUrl.search);
        instanceToken = parentParams.get('instance') || parentParams.get('instanceToken') || null;
        if (instanceToken) {
          console.log('[MapsyWidget] Instance token found in parent frame URL');
        }
      } catch (e) {
        // Cross-origin - can't access parent URL
        console.log('[MapsyWidget] Cannot access parent frame URL (cross-origin)');
      }
    }

    // Check for Wix-provided global variables
    if (!instanceToken && typeof window !== 'undefined') {
      const wixData = (window as any).wixData || (window as any).__WIXDATA__;
      if (wixData && wixData.instance) {
        instanceToken = wixData.instance;
        console.log('[MapsyWidget] Instance token found in window.wixData');
      }
    }

    if (instanceToken) {
      console.log('[MapsyWidget] Instance token found:', instanceToken.substring(0, 20) + '...');
    } else {
      console.log('[MapsyWidget] No instance token found in attributes, URL, or globals - will try SDK');
    }

    // Listen for instance token from parent window via postMessage
    this.setupPostMessageListener();

    // Initialize Wix service with explicit token and compId
    console.log('[MapsyWidget] Initializing Wix client...');
    await wixService.initialize(compId || undefined, instanceToken || undefined);

    // Log the result
    if (wixService.isInitialized()) {
      console.log('[MapsyWidget] ✅ Wix client initialized successfully');
      console.log('[MapsyWidget] Instance token:', wixService.getInstanceToken() ? 'Available' : 'Not available');
      console.log('[MapsyWidget] Comp ID:', wixService.getCompId() || 'Not set');
    } else {
      console.log('[MapsyWidget] ⚠️ Running in standalone mode (no Wix)');
    }

    // Read initial attributes
    this.updateConfigFromAttributes();

    // Mount React app
    this.mountReactApp();

    // Listen for Wix settings updates
    this.setupWixListeners();
  }

  disconnectedCallback() {
    console.log('MapsyWidget disconnected from DOM');

    // Cleanup React app
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }

  // Called when observed attributes change
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    console.log(`[MapsyWidgetElement] Attribute ${name} changed from ${oldValue} to ${newValue}`);

    if (oldValue === newValue || newValue === null) return;

    // Update config based on attribute changes
    switch (name) {
      case 'default-view':
      case 'defaultview':
        this.config.defaultView = (newValue === 'list' ? 'list' : 'map');
        break;
      case 'show-header':
      case 'showheader':
        this.config.showHeader = newValue === 'true';
        break;
      case 'header-title':
      case 'headertitle':
        this.config.headerTitle = newValue || 'Our Locations';
        break;
      case 'map-zoom-level':
      case 'mapzoomlevel':
        this.config.mapZoomLevel = parseInt(newValue || '12', 10);
        break;
      case 'primary-color':
      case 'primarycolor':
        this.config.primaryColor = newValue || '#3B82F6';
        break;
      case 'api-url':
        this.config.apiUrl = newValue || 'https://mapsy-api.nextechspires.com/api';
        break;
      case 'instance':
      case 'instance-token':
        // Update instance token in wixService
        if (newValue) {
          console.log('[MapsyWidgetElement] Instance token updated via attribute');
          const compId = this.getAttribute('compid');
          wixService.initialize(compId || undefined, newValue);
        }
        // Don't re-render for instance token changes
        return;
      case 'compid':
        // Update compId in wixService
        if (newValue) {
          console.log('[MapsyWidgetElement] CompId updated via attribute');
          const instanceToken = this.getAttribute('instance') || this.getAttribute('instance-token');
          wixService.initialize(newValue, instanceToken || undefined);
        }
        // Don't re-render for compId changes
        return;
      case 'config':
        // Handle full config as JSON
        try {
          const parsedConfig = JSON.parse(newValue);
          this.config = { ...this.config, ...parsedConfig };
          console.log('[MapsyWidgetElement] Config updated from JSON:', this.config);
        } catch (error) {
          console.error('[MapsyWidgetElement] Error parsing config JSON:', error);
        }
        break;
    }

    // Re-render React app with new config
    if (this.root) {
      console.log('[MapsyWidgetElement] Re-rendering with updated config');
      this.mountReactApp();
    }
  }

  private updateConfigFromAttributes() {
    // Read all attributes and update config
    const defaultView = this.getAttribute('default-view');
    const showHeader = this.getAttribute('show-header');
    const headerTitle = this.getAttribute('header-title');
    const mapZoomLevel = this.getAttribute('map-zoom-level');
    const primaryColor = this.getAttribute('primary-color');
    const apiUrl = this.getAttribute('api-url');

    if (defaultView) this.config.defaultView = defaultView as 'map' | 'list';
    if (showHeader !== null) this.config.showHeader = showHeader === 'true';
    if (headerTitle) this.config.headerTitle = headerTitle;
    if (mapZoomLevel) this.config.mapZoomLevel = parseInt(mapZoomLevel, 10);
    if (primaryColor) this.config.primaryColor = primaryColor;
    if (apiUrl) this.config.apiUrl = apiUrl;
  }

  private mountReactApp() {
    // Create container for React app
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';

    // Clear shadow DOM and add container
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = '';

      // Add styles to shadow DOM
      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        * {
          box-sizing: border-box;
        }
      `;
      this.shadowRoot.appendChild(style);

      // Add link to Tailwind CSS (or your compiled CSS)
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/src/index.css'; // Adjust path as needed
      this.shadowRoot.appendChild(link);

      this.shadowRoot.appendChild(container);
    }

    // Mount or update React app
    if (!this.root) {
      this.root = ReactDOM.createRoot(container);
    }

    this.root.render(
      <React.StrictMode>
        <App
          apiUrl={this.config.apiUrl}
          config={this.config}
        />
      </React.StrictMode>
    );
  }

  private setupPostMessageListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('message', (event) => {
      // Only accept messages from Wix domains or parent
      const trustedOrigins = [
        'https://www.wix.com',
        'https://editor.wix.com',
        'https://manage.wix.com',
      ];

      // Check if message is from trusted origin or same origin
      const isTrusted = trustedOrigins.some(origin => event.origin.includes(origin)) ||
                       event.origin === window.location.origin;

      if (!isTrusted && event.source !== window.parent) {
        return;
      }

      console.log('[MapsyWidget] Received postMessage:', event.data);

      // Handle different message types
      if (event.data && typeof event.data === 'object') {
        // Wix might send instance token via postMessage
        if (event.data.instance || event.data.instanceToken) {
          const token = event.data.instance || event.data.instanceToken;
          console.log('[MapsyWidget] Instance token received via postMessage');
          wixService.setInstanceToken(token);
        }

        // Handle compId
        if (event.data.compId) {
          console.log('[MapsyWidget] CompId received via postMessage');
          wixService.setCompId(event.data.compId);
        }

        // Handle config updates
        if (event.data.type === 'wix-config-update' && event.data.config) {
          console.log('[MapsyWidget] Config update received via postMessage');
          this.config = { ...this.config, ...event.data.config };
          if (this.root) {
            this.mountReactApp();
          }
        }
      }
    });

    console.log('[MapsyWidget] PostMessage listener set up');

    // Request instance token from parent if we don't have it
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'wix-widget-ready', request: 'instance' }, '*');
      console.log('[MapsyWidget] Requested instance token from parent');
    }
  }

  private setupWixListeners() {
    // In Wix environment, updates come through setProp which updates attributes directly
    // No need for additional message listeners beyond postMessage
    console.log('[MapsyWidgetElement] Ready to receive Wix updates via setProp');
  }

  // Public method for Wix to update properties
  public setProp(property: string, value: any) {
    console.log(`setProp called: ${property} = ${value}`);

    // Convert camelCase to kebab-case
    const attrName = property.replace(/([A-Z])/g, '-$1').toLowerCase();

    // Set attribute (will trigger attributeChangedCallback)
    this.setAttribute(attrName, String(value));
  }

  // Public method to get current config
  public getConfig() {
    return { ...this.config };
  }
}

// Register the custom element
if (!customElements.get('mapsy-widget')) {
  customElements.define('mapsy-widget', MapsyWidgetElement);
}

export default MapsyWidgetElement;