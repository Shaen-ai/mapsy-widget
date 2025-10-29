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
  public _initialized: boolean = false; // Public so we can check from outside
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
    console.log('[MapsyWidgetElement] ========================================');
    console.log('[MapsyWidgetElement] CONSTRUCTOR CALLED!');
    console.log('[MapsyWidgetElement] ========================================');
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
      'compid',  // Wix component ID (legacy attribute)
      'comp-id',
      'config'  // Support full config as JSON string
    ];
  }

  async connectedCallback() {
    console.log('[MapsyWidget] ========================================');
    console.log('[MapsyWidget] connectedCallback CALLED!');
    console.log('[MapsyWidget] ========================================');

    // Prevent double initialization
    if (this._initialized) {
      console.log('[MapsyWidget] Already initialized, skipping connectedCallback');
      return;
    }

    try {
      console.log('[MapsyWidget] === connectedCallback START ===');
      console.log('[MapsyWidget] Connected to DOM');
      console.log('[MapsyWidget] All attributes:', this.getAttributeNames());
      console.log('[MapsyWidget] Current URL:', window.location.href);
      console.log('[MapsyWidget] URL search params:', window.location.search);

      // Try to get compId from various attribute formats
      const datasetCompId = this.dataset?.compId || (this.dataset as any)?.compid;
      const compId = this.getAttribute('compId') || this.getAttribute('compid') || this.getAttribute('comp-id') || datasetCompId;
      console.log('[MapsyWidget] CompId from attributes:', compId);
      if (!this.getAttribute('compid') && compId) {
        this.setAttribute('compid', compId);
      }

      // Try to get instance token from dataset/attributes (Wix often injects these)
      const attrInstance =
        this.getAttribute('data-instance') ||
        this.getAttribute('instance') ||
        this.dataset?.instance ||
        (this.dataset as any)?.instanceToken ||
        (this.dataset as any)?.instancetoken;
      if (attrInstance) {
        console.log('[MapsyWidget] Instance token found on element attributes');
      }

      // Initialize Wix service
      console.log('[MapsyWidget] Calling wixService.initialize()...');
      await wixService.initialize(compId || undefined, attrInstance || undefined);
      console.log('[MapsyWidget] wixService.initialize() completed');

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

      // Mark as initialized
      this._initialized = true;
      console.log('[MapsyWidget] === connectedCallback COMPLETE ===');

    } catch (error) {
      console.error('[MapsyWidget] ERROR in connectedCallback:', error);
      console.error('[MapsyWidget] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      // Still try to mount the app even if there's an error
      try {
        this.mountReactApp();
        this._initialized = true;
      } catch (mountError) {
        console.error('[MapsyWidget] Failed to mount React app:', mountError);
      }
    }
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
      case 'compid':
      case 'comp-id':
        // Update compId in wixService and re-initialize
        if (newValue) {
          console.log('[MapsyWidgetElement] CompId updated via attribute, updating Wix service state...');
          wixService.setCompId(newValue);
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
  console.log('[MapsyWidgetElement] Registering custom element...');
  customElements.define('mapsy-widget', MapsyWidgetElement);
  console.log('[MapsyWidgetElement] ✅ Custom element registered');

  // IMPORTANT: Manually upgrade any existing elements
  // When custom element is defined AFTER elements already exist in DOM,
  // browser automatically upgrades them, but we need to ensure connectedCallback runs
  setTimeout(() => {
    const existingWidgets = document.querySelectorAll('mapsy-widget');
    console.log(`[MapsyWidgetElement] Found ${existingWidgets.length} existing widget elements`);

    existingWidgets.forEach((widget, index) => {
      console.log(`[MapsyWidgetElement] Checking widget ${index + 1}:`, {
        isConnected: widget.isConnected,
        isInstance: widget instanceof MapsyWidgetElement,
        hasRoot: !!(widget as any).root,
        isInitialized: !!(widget as any)._initialized,
      });

      // If element is upgraded but not initialized, manually call connectedCallback
      if (widget instanceof MapsyWidgetElement) {
        const widgetElement = widget as MapsyWidgetElement;
        if (!widgetElement._initialized) {
          console.log('[MapsyWidgetElement] Manually initializing widget', index + 1);
          widgetElement.connectedCallback().catch(err => {
            console.error('[MapsyWidgetElement] Error during manual initialization:', err);
          });
        } else {
          console.log('[MapsyWidgetElement] Widget', index + 1, 'already initialized');
        }
      } else {
        console.warn('[MapsyWidgetElement] Widget', index + 1, 'not upgraded to MapsyWidgetElement instance!');
      }
    });
  }, 100); // Increased timeout to give browser time to upgrade
} else {
  console.log('[MapsyWidgetElement] Custom element already registered');
}

export default MapsyWidgetElement;
