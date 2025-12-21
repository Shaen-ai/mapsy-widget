import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {
  setCompId,
  setInstanceToken,
  getWixClient,
  getAccessTokenListener,
  setViewModeFromWixConfig
} from './services/api';

/**
 * Custom Element for Wix integration
 * Per Wix docs for self-hosted Site Widget:
 * - Store accessTokenListener in constructor (required for fetchWithAuth to work)
 * - Use wixClient.fetchWithAuth() to send requests - it automatically adds the access token
 * - Backend extracts instanceId from the access token via Wix API
 */
class MapsyWidgetElement extends HTMLElement {
  private root: ReactDOM.Root | null = null;
  private container: HTMLDivElement | null = null;
  public _initialized: boolean = false;
  // Store access token listener as per Wix example
  private accessTokenListener: any = null;
  private config = {
    defaultView: 'map' as 'map' | 'list',
    showHeader: false,
    headerTitle: 'Our Locations',
    mapZoomLevel: 12,
    primaryColor: '#3B82F6',
    showWidgetName: false,
    widgetName: '',
    apiUrl: 'https://mapsy-api.nextechspires.com/api'
  };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Store access token listener (as per Wix docs example)
    // This is required for wixClient.fetchWithAuth to work
    this.accessTokenListener = getAccessTokenListener();

    console.log('[MapsyWidget] Constructor - Wix client:', !!getWixClient());
    console.log('[MapsyWidget] Constructor - accessTokenListener stored:', !!this.accessTokenListener);
  }

  // ✅ OVERRIDE: Add defensive wrapper around setAttribute
  // This prevents Wix editor from crashing when trying to set attributes on a detached element
  setAttribute(name: string, value: string): void {
    try {
      // Check if we're still connected to the DOM before setting attributes
      if (!this.isConnected && !this.shadowRoot) {
        console.warn(`[Widget] setAttribute('${name}') called on detached element, deferring...`);
        // Defer the setAttribute until the element is connected
        requestAnimationFrame(() => {
          if (this.isConnected) {
            super.setAttribute(name, value);
          }
        });
        return;
      }
      super.setAttribute(name, value);
    } catch (error) {
      console.error(`[Widget] setAttribute('${name}') error:`, error);
    }
  }

  static get observedAttributes() {
    return [
      'default-view', 'defaultview',
      'show-header', 'showheader',
      'header-title', 'headertitle',
      'map-zoom-level', 'mapzoomlevel',
      'primary-color', 'primarycolor',
      'show-widget-name', 'showwidgetname',
      'widget-name', 'widgetname',
      'api-url', 'compid', 'comp-id', 'instance', 'config', 'auth',
      'wixconfig' // ✅ Wix official: ViewMode is here
    ];
  }

  connectedCallback() {
    // Allow reconnection if element was disconnected (e.g., moved in DOM by Wix editor)
    if (this._initialized && !this.root) {
      console.log('[Widget] Element reconnected after being disconnected');
      this._initialized = false; // Reset to allow re-initialization
    }

    if (this._initialized) {
      console.log('[Widget] Already initialized, skipping connectedCallback');
      return;
    }

    // Add a small delay to ensure we're in a stable DOM state
    // This helps prevent race conditions with Wix editor's preview system
    requestAnimationFrame(() => {
      if (this._initialized) return;

      // Double-check we're still connected after the delay
      if (!this.isConnected) {
        console.warn('[Widget] Element disconnected before initialization completed');
        return;
      }

      this._initialized = true;

      // Debug: Log all attributes on the element
      const attrs: string[] = [];
      for (let i = 0; i < this.attributes.length; i++) {
        const attr = this.attributes[i];
        attrs.push(`${attr.name}="${attr.value.substring(0, 50)}"`);
      }
      console.log('[Widget] Element attributes:', attrs.join(', ') || 'none');

      // ✅ WIX OFFICIAL: Read ViewMode from wixconfig attribute
      this.readWixConfig();

      try {
        this.updateConfigFromAttributes();
        this.mountReactApp();
      } catch (error) {
        console.error('[Widget] Mount error:', error);
      }
    });
  }

  disconnectedCallback() {
    try {
      if (this.root) {
        this.root.unmount();
        this.root = null;
      }
      this._initialized = false;
    } catch (error) {
      console.error('[Widget] Disconnect error:', error);
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    // Defensive check: ensure we're still in a valid state
    if (!this.shadowRoot) {
      console.warn('[Widget] attributeChangedCallback called before shadowRoot initialized');
      return;
    }

    if (oldValue === newValue || newValue === null) return;

    console.log(`[Widget] ✅ Attribute changed: ${name} = ${newValue} (old: ${oldValue})`);

    // ✅ WIX OFFICIAL: Handle wixconfig attribute for ViewMode detection
    if (name === 'wixconfig') {
      this.readWixConfig();
      return;
    }

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
        console.log(`[Widget] 🔍 Zoom level updated: ${oldValue} → ${this.config.mapZoomLevel}`);
        break;
      case 'primary-color':
      case 'primarycolor':
        this.config.primaryColor = newValue || '#3B82F6';
        break;
      case 'show-widget-name':
      case 'showwidgetname':
        this.config.showWidgetName = newValue === 'true';
        break;
      case 'widget-name':
      case 'widgetname':
        this.config.widgetName = newValue || '';
        break;
      case 'api-url':
        this.config.apiUrl = newValue || 'https://mapsy-api.nextechspires.com/api';
        break;
      case 'compid':
      case 'comp-id':
        // Set compId in the wixService for API requests
        setCompId(newValue);
        return;
      case 'instance':
        // Set instance token in the wixService for API requests
        setInstanceToken(newValue);
        return;
      case 'auth':
        // Wix might pass auth data as an attribute
        try {
          const authData = JSON.parse(newValue);
          console.log('[Widget] 🔐 Auth attribute received:', authData);
          if (authData.instance) {
            setInstanceToken(authData.instance);
            console.log('[Widget] ✅ Instance token extracted from auth attribute');
          }
        } catch (error) {
          console.log('[Widget] ⚠️ Could not parse auth attribute');
        }
        return;
      case 'config':
        try {
          const parsedConfig = JSON.parse(newValue);

          // Extract auth data if present
          if (parsedConfig.auth?.instanceToken) {
            setInstanceToken(parsedConfig.auth.instanceToken);
            console.log('[Widget] ✅ Instance token extracted from config.auth');
          }

          // Remove auth from config before storing (it's not a display config)
          const { auth, ...configWithoutAuth } = parsedConfig;
          this.config = { ...this.config, ...configWithoutAuth };
        } catch (error) {
          console.error('[Widget] Config parse error:', error);
        }
        break;
    }

    // Only re-render if we're initialized and still connected to the DOM
    if (this.root && this.isConnected && this._initialized) {
      console.log(`[Widget] 🔄 Re-rendering with config:`, this.config);
      this.mountReactApp();
    }
  }

  /**
   * ✅ WIX OFFICIAL: Read ViewMode from wixconfig attribute
   * Per Wix documentation: this is the official way to access ViewMode
   */
  private readWixConfig() {
    // Wix official pattern for reading ViewMode
    const consoleCongig =  (this as any)?.attributes;
    const wixconfig = JSON.parse((this as any)?.attributes?.wixconfig?.value ?? '{}');

    console.log('wixconfigwixconfig',wixconfig);
    console.log('consoleCongigconsoleCongig',consoleCongig);
    const viewMode = wixconfig?.ViewMode as 'Editor' | 'Preview' | 'Site' | undefined;

    if (viewMode) {
      console.log('[Widget] 🔍 ViewMode from wixconfig:', viewMode);
      setViewModeFromWixConfig(viewMode);
    } else {
      console.log('[Widget] ⚠️ No ViewMode found in wixconfig');
    }
  }

  private updateConfigFromAttributes() {
    // Read all attributes and update config
    const defaultView = this.getAttribute('default-view');
    const showHeader = this.getAttribute('show-header');
    const headerTitle = this.getAttribute('header-title');
    const mapZoomLevel = this.getAttribute('map-zoom-level');
    const primaryColor = this.getAttribute('primary-color');
    const showWidgetName = this.getAttribute('show-widget-name');
    const widgetName = this.getAttribute('widget-name');
    const apiUrl = this.getAttribute('api-url');
    const compIdAttr = this.getAttribute('compid') || this.getAttribute('comp-id');
    const instanceAttr = this.getAttribute('instance');

    if (defaultView) this.config.defaultView = defaultView as 'map' | 'list';
    if (showHeader !== null) this.config.showHeader = showHeader === 'true';
    if (headerTitle) this.config.headerTitle = headerTitle;
    if (mapZoomLevel) this.config.mapZoomLevel = parseInt(mapZoomLevel, 10);
    if (primaryColor) this.config.primaryColor = primaryColor;
    if (showWidgetName !== null) this.config.showWidgetName = showWidgetName === 'true';
    if (widgetName) this.config.widgetName = widgetName;
    if (apiUrl) this.config.apiUrl = apiUrl;

    // Set Wix-specific attributes in the service
    if (compIdAttr) {
      setCompId(compIdAttr);
    }
    if (instanceAttr) {
      setInstanceToken(instanceAttr);
    }
  }

  private mountReactApp() {
    // Safety check: ensure we're in a valid state
    if (!this.shadowRoot || !this.isConnected) {
      console.warn('[Widget] mountReactApp called in invalid state');
      return;
    }

    // Only set up shadow DOM once
    if (!this.container && this.shadowRoot) {
      // Create container for React app
      this.container = document.createElement('div');
      this.container.style.width = '100%';
      this.container.style.height = '100%';

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

      // Add link to widget's compiled CSS from the CDN
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://mapsy-widget.nextechspires.com/style.css';
      this.shadowRoot.appendChild(link);

      this.shadowRoot.appendChild(this.container);

      // Create React root once
      this.root = ReactDOM.createRoot(this.container);
    }

    // Render/update React app
    if (this.root) {
      this.root.render(
        <React.StrictMode>
          <App config={this.config} />
        </React.StrictMode>
      );
    }
  }

  // DEPRECATED: Old method that uses setAttribute (inefficient)
  public setProp(property: string, value: any) {
    const attrName = property.replace(/([A-Z])/g, '-$1').toLowerCase();
    this.setAttribute(attrName, String(value));
  }

  // ✅ NEW: Direct config update without setAttribute
  public updateConfig(newConfig: Partial<typeof this.config>) {
    // Directly update internal config state
    this.config = { ...this.config, ...newConfig };

    // Re-render if already initialized
    if (this.root && this.isConnected && this._initialized) {
      console.log('[Widget] 🔄 Config updated directly:', this.config);
      this.mountReactApp();
    }
  }

  // ✅ NEW: Set entire config object at once
  public setConfig(config: Partial<typeof this.config>) {
    this.updateConfig(config);
  }

  public getConfig() {
    return { ...this.config };
  }
}

// Register the custom element
if (!customElements.get('mapsy-widget')) {
  customElements.define('mapsy-widget', MapsyWidgetElement);

  // Manually upgrade any existing elements that were in DOM before registration
  document.querySelectorAll('mapsy-widget').forEach((widget) => {
    if (widget instanceof MapsyWidgetElement && !widget._initialized) {
      widget.connectedCallback();
    }
  });
}

export default MapsyWidgetElement;
