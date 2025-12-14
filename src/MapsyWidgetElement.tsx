import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {
  setCompId,
  setInstanceToken,
  getWixClient,
  getAccessTokenListener
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

  static get observedAttributes() {
    return [
      'default-view', 'defaultview',
      'show-header', 'showheader',
      'header-title', 'headertitle',
      'map-zoom-level', 'mapzoomlevel',
      'primary-color', 'primarycolor',
      'show-widget-name', 'showwidgetname',
      'widget-name', 'widgetname',
      'api-url', 'compid', 'comp-id', 'instance', 'config', 'auth'
    ];
  }

  connectedCallback() {
    if (this._initialized) return;
    this._initialized = true;

    // Debug: Log all attributes on the element
    const attrs: string[] = [];
    for (let i = 0; i < this.attributes.length; i++) {
      const attr = this.attributes[i];
      attrs.push(`${attr.name}="${attr.value.substring(0, 50)}"`);
    }
    console.log('[Widget] Element attributes:', attrs.join(', ') || 'none');

    try {
      this.updateConfigFromAttributes();
      this.mountReactApp();
    } catch (error) {
      console.error('[Widget] Mount error:', error);
    }
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue || newValue === null) return;

    console.log(`[Widget] ✅ Attribute changed: ${name} = ${newValue} (old: ${oldValue})`);

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

    if (this.root) {
      console.log(`[Widget] 🔄 Re-rendering with config:`, this.config);
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

  public setProp(property: string, value: any) {
    const attrName = property.replace(/([A-Z])/g, '-$1').toLowerCase();
    this.setAttribute(attrName, String(value));
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
