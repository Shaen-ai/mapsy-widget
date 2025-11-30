import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { setCompId, setInstanceToken } from './services/api';

/**
 * Custom Element for Wix integration
 */
class MapsyWidgetElement extends HTMLElement {
  private root: ReactDOM.Root | null = null;
  public _initialized: boolean = false;
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

  static get observedAttributes() {
    return [
      'default-view', 'defaultview',
      'show-header', 'showheader',
      'header-title', 'headertitle',
      'map-zoom-level', 'mapzoomlevel',
      'primary-color', 'primarycolor',
      'api-url', 'compid', 'comp-id', 'instance', 'config'
    ];
  }

  async connectedCallback() {
    if (this._initialized) return;

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
      this._initialized = true;
    } catch (error) {
      console.error('[Widget] Mount error:', error);
      try {
        this.mountReactApp();
        this._initialized = true;
      } catch (mountError) {
        console.error('[Widget] Failed to mount:', mountError);
      }
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
        // Set compId in the wixService for API requests
        setCompId(newValue);
        return;
      case 'instance':
        // Set instance token in the wixService for API requests
        setInstanceToken(newValue);
        return;
      case 'config':
        try {
          const parsedConfig = JSON.parse(newValue);
          this.config = { ...this.config, ...parsedConfig };
        } catch (error) {
          console.error('[Widget] Config parse error:', error);
        }
        break;
    }

    if (this.root) {
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
    const compIdAttr = this.getAttribute('compid') || this.getAttribute('comp-id');
    const instanceAttr = this.getAttribute('instance');

    if (defaultView) this.config.defaultView = defaultView as 'map' | 'list';
    if (showHeader !== null) this.config.showHeader = showHeader === 'true';
    if (headerTitle) this.config.headerTitle = headerTitle;
    if (mapZoomLevel) this.config.mapZoomLevel = parseInt(mapZoomLevel, 10);
    if (primaryColor) this.config.primaryColor = primaryColor;
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

  // Manually upgrade any existing elements
  setTimeout(() => {
    document.querySelectorAll('mapsy-widget').forEach((widget) => {
      if (widget instanceof MapsyWidgetElement && !widget._initialized) {
        widget.connectedCallback().catch(console.error);
      }
    });
  }, 100);
}

export default MapsyWidgetElement;
