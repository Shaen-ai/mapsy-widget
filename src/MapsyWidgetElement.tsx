import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {
  setCompId,
  setInstanceToken,
  getWixClient,
  getAccessTokenListener,
  isInEditorMode,
  premiumService
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
  public _initialized: boolean = false;
  // Store access token listener as per Wix example
  private accessTokenListener: any = null;
  // Whether to show premium warning (free user in editor/preview)
  private showPremiumWarning: boolean = false;
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
      'api-url', 'compid', 'comp-id', 'instance', 'config'
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

      // Mount React app immediately for fast first render
      this.mountReactApp();

      // Check premium status asynchronously after mount
      this.checkAndHandlePremiumStatus();
    } catch (error) {
      console.error('[Widget] Mount error:', error);
    }
  }

  /**
   * Check premium status asynchronously and handle visibility
   * This runs after the widget is already mounted for fast first render
   */
  private async checkAndHandlePremiumStatus(): Promise<void> {
    try {
      const { shouldShow, showWarning } = await this.checkShouldShowWidget();

      if (!shouldShow) {
        console.log('[Widget] Hiding widget - no premium on published site');
        this.hideWidget();
        return;
      }

      // Update premium warning state if needed
      if (showWarning !== this.showPremiumWarning) {
        this.showPremiumWarning = showWarning;
        this.mountReactApp(); // Re-render with updated warning state
      }
    } catch (error) {
      console.error('[Widget] Error checking premium status:', error);
      // Keep widget visible on error (fail open)
    }
  }

  /**
   * Check if the widget should be shown and whether to display premium warning
   * - Editor/Preview mode: Always show widget, but show warning if user is on free plan
   * - Published site: Hide widget if user is on free plan
   * Returns: { shouldShow: boolean, showWarning: boolean }
   */
  private async checkShouldShowWidget(): Promise<{ shouldShow: boolean; showWarning: boolean }> {
    const inEditorOrPreview = isInEditorMode();

    // Check premium status
    try {
      console.log('[Widget] Checking premium status...');
      const premiumStatus = await premiumService.checkPremium();
      console.log('[Widget] Premium status:', premiumStatus);

      if (premiumStatus.hasPremium) {
        // Premium user - show widget everywhere, no warning
        console.log('[Widget] User has premium - showing widget');
        return { shouldShow: true, showWarning: false };
      } else {
        // Free user
        if (inEditorOrPreview) {
          // In editor/preview - show widget with warning
          console.log('[Widget] Free user in editor/preview - showing widget with warning');
          return { shouldShow: true, showWarning: true };
        } else {
          // On published site - hide widget
          console.log('[Widget] Free user on published site - hiding widget');
          return { shouldShow: false, showWarning: false };
        }
      }
    } catch (error) {
      // If we can't check premium, assume premium (fail open)
      console.error('[Widget] Error checking premium status:', error);
      console.log('[Widget] Falling back to showing widget without warning');
      return { shouldShow: true, showWarning: false };
    }
  }

  /**
   * Hide the widget completely
   */
  private hideWidget(): void {
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = '';
      const style = document.createElement('style');
      style.textContent = ':host { display: none !important; }';
      this.shadowRoot.appendChild(style);
    }
    this.style.display = 'none';
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

      // Add link to widget's compiled CSS from the CDN
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://mapsy-widget.nextechspires.com/style.css';
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
          showPremiumWarning={this.showPremiumWarning}
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

  // Manually upgrade any existing elements that were in DOM before registration
  document.querySelectorAll('mapsy-widget').forEach((widget) => {
    if (widget instanceof MapsyWidgetElement && !widget._initialized) {
      widget.connectedCallback();
    }
  });
}

export default MapsyWidgetElement;
