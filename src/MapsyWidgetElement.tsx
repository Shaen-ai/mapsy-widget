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

  // Only emit for dynamic config changes
  setConfigPartial(update: Partial<any>) {
    const dynamicKeys = ['defaultView', 'showHeader', 'headerTitle', 'mapZoomLevel', 'showWidgetName', 'widgetName'];
    const hasDynamicChange = Object.keys(update).some(k => dynamicKeys.includes(k));

    this.state = {
      ...this.state,
      config: { ...this.state.config, ...update }
    };

    if (hasDynamicChange) {
      this.emit();
    }
  }

  // Locations are static → no emit
  setLocations(locations: any[]) {
    this.state = { ...this.state, locations };
  }

  // Premium status is static → no emit
  setPremiumStatus(premiumPlanName?: string, shouldHideWidget?: boolean, showFreePlanNotice?: boolean) {
    this.state = {
      ...this.state,
      premiumPlanName,
      shouldHideWidget,
      showFreePlanNotice
    };
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
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

    // Default store config
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
  ========================== */

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
  ========================== */

  connectedCallback() {
    if (this._initialized) {
      if (!this.root) {
        requestAnimationFrame(() => {
          if (this.isConnected) this.mountReactOnce();
        });
      }
      return;
    }

    this._initialized = true;

    requestAnimationFrame(() => {
      if (!this.isConnected) return;
      this.readInitialAttributes();
      this.mountReactOnce();
      this.fetchBackendOnce();
    });
  }

  disconnectedCallback() {
    // Do nothing. Keep store and state intact
  }

  /* =========================
     ATTRIBUTE CHANGES
  ========================== */

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (!this._initialized || oldValue === newValue || newValue === null) return;

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
        // static → do not trigger React
        this.store.setConfigPartial({ apiUrl: newValue });
        break;
      case 'config':
        try {
          const parsedConfig = JSON.parse(newValue);
          if (parsedConfig.auth?.instanceToken) setInstanceToken(parsedConfig.auth.instanceToken);
          const { auth, ...configWithoutAuth } = parsedConfig;
          this.store.setConfigPartial(configWithoutAuth);
        } catch {}
        break;
      case 'auth':
        try {
          const authData = JSON.parse(newValue);
          if (authData.instance) setInstanceToken(authData.instance);
        } catch {}
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
  ========================== */

  private readInitialAttributes() {
    const read = (kebab: string, camel: string) => this.getAttribute(kebab) ?? this.getAttribute(camel);

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

    if (Object.keys(partial).length > 0) this.store.setConfigPartial(partial);

    const compId = read('compid', 'comp-id');
    if (compId) setCompId(compId);
    const instance = this.getAttribute('instance');
    if (instance) setInstanceToken(instance);
  }

  /* =========================
     BACKEND FETCH (ONCE)
  ========================== */

  private async fetchBackendOnce() {
    if (this._backendFetched) return;
    this._backendFetched = true;

    try {
      const { config, locations } = await widgetDataService.getData();
      if (config) this.store.setConfigPartial(config);
      if (locations) this.store.setLocations(locations);

      // Premium plan logic
      if (config?.premiumPlanName) {
        const viewMode = this.getViewMode();
        const inEditor = viewMode === 'Editor' || viewMode === 'Preview';
        const isFreePlan = config.premiumPlanName === 'free';

        if (isFreePlan) {
          if (inEditor) {
            this.store.setPremiumStatus(config.premiumPlanName, false, true);
            setTimeout(() => this.store.setPremiumStatus(config.premiumPlanName, false, false), 5000);
          } else {
            this.store.setPremiumStatus(config.premiumPlanName, true, false);
          }
        }
      }
    } catch (e) {
      console.error('[Widget] ❌ Backend fetch failed:', e);
    }
  }

  private getViewMode(): string {
    const url = window.location.href.toLowerCase();
    if (url.includes('editor.wix.com') || url.includes('editor-x.wix.com') || url.includes('static.parastorage.com')) return 'Editor';
    return 'Site';
  }

  /* =========================
     MOUNT REACT ONCE
  ========================== */

  private mountReactOnce() {
    if (this.root || !this.shadowRoot) return;

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

    // Only dynamic config triggers React updates
    this.root.render(<App store={this.store} />);
  }
}

/* =========================
   REGISTER ELEMENT
========================= */

if (!customElements.get('mapsy-widget')) {
  customElements.define('mapsy-widget', MapsyWidgetElement);

  document.querySelectorAll('mapsy-widget').forEach(widget => {
    if (widget instanceof MapsyWidgetElement && !widget._initialized) widget.connectedCallback();
  });
}

export default MapsyWidgetElement;
