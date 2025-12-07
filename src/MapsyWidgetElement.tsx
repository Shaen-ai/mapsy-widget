import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { setCompId, setInstanceToken } from './services/api';

// Global config update listener - allows React to subscribe to config changes
type ConfigUpdateListener = (config: Record<string, any>) => void;
let configUpdateListener: ConfigUpdateListener | null = null;

export function setConfigUpdateListener(listener: ConfigUpdateListener | null) {
  configUpdateListener = listener;
}

export function notifyConfigUpdate(config: Record<string, any>) {
  if (configUpdateListener) {
    configUpdateListener(config);
  }
}

class MapsyWidgetElement extends HTMLElement {
  private root: ReactDOM.Root | null = null;
  private container: HTMLDivElement | null = null;
  public _initialized: boolean = false;
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
  }

  static get observedAttributes() {
    return [
      'default-view', 'defaultview', 'defaultView',
      'show-header', 'showheader', 'showHeader',
      'header-title', 'headertitle', 'headerTitle',
      'map-zoom-level', 'mapzoomlevel', 'mapZoomLevel',
      'primary-color', 'primarycolor', 'primaryColor',
      'show-widget-name', 'showwidgetname', 'showWidgetName',
      'widget-name', 'widgetname', 'widgetName',
      'api-url', 'compid', 'comp-id', 'instance', 'config'
    ];
  }

  connectedCallback() {
    if (this._initialized) return;
    this._initialized = true;

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
    if (oldValue === newValue) return;

    const value = newValue ?? '';

    switch (name) {
      case 'default-view':
      case 'defaultview':
      case 'defaultView':
        this.config.defaultView = (value === 'list' ? 'list' : 'map');
        break;
      case 'show-header':
      case 'showheader':
      case 'showHeader':
        this.config.showHeader = value === 'true';
        break;
      case 'header-title':
      case 'headertitle':
      case 'headerTitle':
        this.config.headerTitle = value || 'Our Locations';
        break;
      case 'map-zoom-level':
      case 'mapzoomlevel':
      case 'mapZoomLevel':
        this.config.mapZoomLevel = parseInt(value || '12', 10);
        break;
      case 'primary-color':
      case 'primarycolor':
      case 'primaryColor':
        this.config.primaryColor = value || '#3B82F6';
        break;
      case 'show-widget-name':
      case 'showwidgetname':
      case 'showWidgetName':
        this.config.showWidgetName = value === 'true';
        break;
      case 'widget-name':
      case 'widgetname':
      case 'widgetName':
        this.config.widgetName = value || '';
        break;
      case 'api-url':
        this.config.apiUrl = value || 'https://mapsy-api.nextechspires.com/api';
        break;
      case 'compid':
      case 'comp-id':
        if (value) setCompId(value);
        return;
      case 'instance':
        if (value) setInstanceToken(value);
        return;
      case 'config':
        try {
          if (value) {
            const parsedConfig = JSON.parse(value);
            this.config = { ...this.config, ...parsedConfig };
          }
        } catch {
          // Invalid JSON, ignore
        }
        break;
      default:
        return;
    }

    // Notify React component of config change (without remounting)
    if (this._initialized) {
      this.config = { ...this.config };
      notifyConfigUpdate(this.config);
    }
  }

  private updateConfigFromAttributes() {
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

    if (compIdAttr) setCompId(compIdAttr);
    if (instanceAttr) setInstanceToken(instanceAttr);
  }

  private mountReactApp() {
    if (!this.container && this.shadowRoot) {
      this.container = document.createElement('div');
      this.container.style.width = '100%';
      this.container.style.height = '100%';

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

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://mapsy-widget.nextechspires.com/style.css';
      this.shadowRoot.appendChild(link);

      this.shadowRoot.appendChild(this.container);
      this.root = ReactDOM.createRoot(this.container);
    }

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

  document.querySelectorAll('mapsy-widget').forEach((widget) => {
    if (widget instanceof MapsyWidgetElement && !widget._initialized) {
      widget.connectedCallback();
    }
  });
}

export default MapsyWidgetElement;
