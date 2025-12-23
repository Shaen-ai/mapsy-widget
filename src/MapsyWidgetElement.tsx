import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {
  setCompId,
  setInstanceToken,
  getAccessTokenListener,
  widgetDataService
} from './services/api';

/* =========================
   TYPES
========================= */

type Listener = () => void;

type WidgetState = {
  config: any;
  locations: any[];
  premiumPlanName?: string;
  shouldHideWidget?: boolean;
  showFreePlanNotice?: boolean;
};

/* =========================
   PER-INSTANCE STORE
========================= */

export class WidgetStore {
  private state: WidgetState;
  private listeners = new Set<Listener>();

  constructor(initialConfig: any) {
    this.state = {
      config: initialConfig,
      locations: [],
      shouldHideWidget: false,
      showFreePlanNotice: false
    };
  }

  getState() {
    return this.state;
  }

  setConfigPartial(update: Partial<any>) {
    console.log('[WidgetStore] 📝 Config update:', update);
    this.state = {
      ...this.state,
      config: { ...this.state.config, ...update }
    };
    this.emit();
  }

  setLocations(locations: any[]) {
    console.log('[WidgetStore] 📍 Locations update:', locations.length, 'locations');
    this.state = { ...this.state, locations };
    this.emit();
  }

  setPremiumStatus(premiumPlanName?: string, shouldHideWidget?: boolean, showFreePlanNotice?: boolean) {
    console.log('[WidgetStore] 💎 Premium status update:', { premiumPlanName, shouldHideWidget, showFreePlanNotice });
    this.state = {
      ...this.state,
      premiumPlanName,
      shouldHideWidget,
      showFreePlanNotice
    };
    this.emit();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    console.log('[WidgetStore] 🔔 Emitting to', this.listeners.size, 'listeners');
    this.listeners.forEach(l => l());
  }
}

/* =========================
   CUSTOM ELEMENT
========================= */

class MapsyWidgetElement extends HTMLElement {
  private root: ReactDOM.Root | null = null;
  private container: HTMLDivElement | null = null;
  private store: WidgetStore;
  public _initialized = false;
  private _backendFetched = false;
  private accessTokenListener: any;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.accessTokenListener = getAccessTokenListener();

    // Create per-instance store with default config
    this.store = new WidgetStore({
      defaultView: 'map',
      showHeader: false,
      headerTitle: 'Our Locations',
      mapZoomLevel: 12,
      primaryColor: '#3B82F6',
      showWidgetName: false,
      widgetName: '',
      apiUrl: 'https://mapsy-api.nextechspires.com/api'
    });
  }

  /* =========================
     ATTRIBUTES
  ========================= */

  static get observedAttributes() {
    return [
      'default-view', 'defaultview',
      'show-header', 'showheader',
      'header-title', 'headertitle',
      'map-zoom-level', 'mapzoomlevel',
      'primary-color', 'primarycolor',
      'show-widget-name', 'showwidgetname',
      'widget-name', 'widgetname',
      'api-url', 'apiurl',
      'compid', 'comp-id',
      'instance',
      'auth',
      'config',
      'wixconfig'
    ];
  }

  /* =========================
     LIFECYCLE
  ========================= */

  connectedCallback() {
    if (this._initialized) {
      // Handle reconnection - just remount if needed
      if (!this.root) {
        console.log('[Widget] 🔄 Element reconnected - remounting React');
        requestAnimationFrame(() => {
          if (this.isConnected) {
            this.mountReactOnce();
          }
        });
      }
      return;
    }

    this._initialized = true;
    console.log('[Widget] 🎬 Initializing...');

    requestAnimationFrame(() => {
      if (!this.isConnected) {
        console.warn('[Widget] Disconnected before init completed');
        return;
      }

      this.readWixConfig();
      this.readInitialAttributes();
      this.mountReactOnce();
      this.fetchBackendOnce();
    });
  }

  disconnectedCallback() {
    console.warn('[Widget] ⚠️ Element disconnected');
    // Don't unmount - Wix reconnects frequently
    // Keep store and state intact
  }

  /* =========================
     ATTRIBUTE CHANGES
  ========================= */

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (!this._initialized || oldValue === newValue || newValue === null) {
      return;
    }

    console.log(`[Widget] 🔔 Attribute changed: ${name}`, {
      oldValue: oldValue?.substring(0, 50),
      newValue: newValue?.substring(0, 50)
    });

    const update = (obj: any) => this.store.setConfigPartial(obj);

    switch (name) {
      case 'default-view':
      case 'defaultview':
        update({ defaultView: newValue === 'list' ? 'list' : 'map' });
        break;

      case 'show-header':
      case 'showheader':
        update({ showHeader: newValue === 'true' });
        break;

      case 'header-title':
      case 'headertitle':
        update({ headerTitle: newValue });
        break;

      case 'map-zoom-level':
      case 'mapzoomlevel':
        update({ mapZoomLevel: parseInt(newValue, 10) });
        break;

      case 'primary-color':
      case 'primarycolor':
        update({ primaryColor: newValue });
        break;

      case 'show-widget-name':
      case 'showwidgetname':
        update({ showWidgetName: newValue === 'true' });
        break;

      case 'widget-name':
      case 'widgetname':
        update({ widgetName: newValue });
        break;

      case 'api-url':
      case 'apiurl':
        update({ apiUrl: newValue });
        break;

      case 'config':
        try {
          const parsedConfig = JSON.parse(newValue);
          // Extract auth if present
          if (parsedConfig.auth?.instanceToken) {
            setInstanceToken(parsedConfig.auth.instanceToken);
          }
          // Remove auth from config before storing
          const { auth, ...configWithoutAuth } = parsedConfig;
          update(configWithoutAuth);
        } catch (e) {
          console.warn('[Widget] Failed to parse config attribute');
        }
        break;

      case 'auth':
        try {
          const authData = JSON.parse(newValue);
          if (authData.instance) {
            setInstanceToken(authData.instance);
          }
        } catch (e) {
          console.warn('[Widget] Failed to parse auth attribute');
        }
        break;

      case 'compid':
      case 'comp-id':
        setCompId(newValue);
        break;

      case 'instance':
        setInstanceToken(newValue);
        break;
    }
  }

 

  /* =========================
     INITIAL ATTRIBUTES
  ========================= */

  private readInitialAttributes() {
    const read = (kebab: string, camel: string) =>
      this.getAttribute(kebab) ?? this.getAttribute(camel);

    const partial: any = {};

    const defaultView = read('default-view', 'defaultview');
    if (defaultView) partial.defaultView = defaultView === 'list' ? 'list' : 'map';

    const showHeader = read('show-header', 'showheader');
    if (showHeader !== null) partial.showHeader = showHeader === 'true';

    const headerTitle = read('header-title', 'headertitle');
    if (headerTitle) partial.headerTitle = headerTitle;

    const zoom = read('map-zoom-level', 'mapzoomlevel');
    if (zoom) partial.mapZoomLevel = parseInt(zoom, 10);

    const color = read('primary-color', 'primarycolor');
    if (color) partial.primaryColor = color;

    const showName = read('show-widget-name', 'showwidgetname');
    if (showName !== null) partial.showWidgetName = showName === 'true';

    const widgetName = read('widget-name', 'widgetname');
    if (widgetName) partial.widgetName = widgetName;

    const apiUrl = read('api-url', 'apiurl');
    if (apiUrl) partial.apiUrl = apiUrl;

    if (Object.keys(partial).length > 0) {
      this.store.setConfigPartial(partial);
    }

    // Handle auth credentials
    const compId = read('compid', 'comp-id');
    if (compId) setCompId(compId);

    const instance = this.getAttribute('instance');
    if (instance) setInstanceToken(instance);
  }

  /* =========================
     BACKEND (ONCE)
  ========================= */

  private async fetchBackendOnce() {
    console.log('[Widget] 🔍 fetchBackendOnce called, already fetched:', this._backendFetched);
    if (this._backendFetched) {
      console.log('[Widget] ⏭️ Skipping backend fetch - already fetched');
      return;
    }
    this._backendFetched = true;

    console.log('[Widget] 🔄 Fetching from backend...');

    try {
      const { config, locations } = await widgetDataService.getData();

      if (config) {
        this.store.setConfigPartial(config);

        // Handle premium plan logic
        if ('premiumPlanName' in config) {
          const viewMode = this.getViewMode();
          const inEditor = viewMode === 'Editor' || viewMode === 'Preview';
          const isFreePlan = config.premiumPlanName === 'free';

          if (isFreePlan) {
            if (inEditor) {
              this.store.setPremiumStatus(config.premiumPlanName, false, true);
              // Auto-dismiss free plan notice after 5 seconds
              setTimeout(() => {
                this.store.setPremiumStatus(config.premiumPlanName, false, false);
              }, 5000);
            } else {
              console.log('[Widget] Free plan on published site - hiding widget');
              this.store.setPremiumStatus(config.premiumPlanName, true, false);
            }
          }
        }
      }

      if (locations) {
        this.store.setLocations(locations);
      }

      console.log('[Widget] ✅ Backend data loaded');
    } catch (e) {
      console.error('[Widget] ❌ Backend fetch failed:', e);
    }
  }

  /* =========================
     VIEW MODE HELPER
  ========================= */

  private getViewMode(): string {
    const url = window.location.href.toLowerCase();
    if (url.includes('editor.wix.com') ||
          url.includes('editor-x.wix.com') ||
          url.includes('static.parastorage.com')) {
        console.log('[Widget] 🔍 Editor mode detected from URL:', url);
        return 'Editor';
      }
      return 'Site';
  }

  /* =========================
     REACT (ONCE)
  ========================= */

  private mountReactOnce() {
    if (this.root || !this.shadowRoot) return;

    console.log('[Widget] 🎨 Mounting React...');

    this.container = document.createElement('div');
    this.container.style.width = '100%';
    this.container.style.height = '100%';

    const style = document.createElement('style');
    style.textContent = `
      :host { display:block;width:100%;height:100%; }
      * { box-sizing:border-box; }
    `;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://mapsy-widget.nextechspires.com/style.css';

    this.shadowRoot.append(style, link, this.container);

    this.root = ReactDOM.createRoot(this.container);
    this.root.render(<App store={this.store} />);

    console.log('[Widget] ✅ React mounted');
  }
}

/* =========================
   REGISTER
========================= */

if (!customElements.get('mapsy-widget')) {
  customElements.define('mapsy-widget', MapsyWidgetElement);

  // Manually upgrade any existing elements
  document.querySelectorAll('mapsy-widget').forEach((widget) => {
    if (widget instanceof MapsyWidgetElement && !widget._initialized) {
      widget.connectedCallback();
    }
  });
}

export default MapsyWidgetElement;
