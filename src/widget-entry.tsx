import './index.css'
import './MapsyWidgetElement'

declare global {
  interface Window {
    MapsyWidget: {
      init: (selector?: string, config?: any) => void;
      version: string;
      autoInit: () => void;
      _version?: string;
      _manifest?: any;
    };
  }
}

// The custom element <mapsy-widget> is now registered by MapsyWidgetElement.tsx
// This file just provides the global API for backward compatibility

class MapsyWidget {
  static init(selectorOrConfig?: string | HTMLElement | any, config?: any) {
    // Handle different parameter types
    if (!selectorOrConfig) {
      // No parameters - auto init
      this.autoInit();
      return;
    }

    // Check if first parameter is a config object (has container property)
    if (typeof selectorOrConfig === 'object' && !(selectorOrConfig instanceof HTMLElement)) {
      // It's a config object
      const configObj = selectorOrConfig;
      if (configObj.container) {
        // Container can be either an element or a selector
        const element = configObj.container instanceof HTMLElement
          ? configObj.container
          : document.querySelector(configObj.container);

        if (element) {
          this.createWidget(element as HTMLElement, configObj);
        } else {
          console.error(`Element not found:`, configObj.container);
        }
      } else {
        // No container specified, auto-init
        this.autoInit();
      }
      return;
    }

    // Handle as selector string or HTMLElement
    let element: HTMLElement | null = null;

    if (typeof selectorOrConfig === 'string') {
      // It's a selector string
      element = document.querySelector(selectorOrConfig);
      if (!element) {
        console.error(`Element with selector "${selectorOrConfig}" not found`);
        return;
      }
    } else if (selectorOrConfig instanceof HTMLElement) {
      // It's already an element
      element = selectorOrConfig;
    } else {
      console.error('Invalid first parameter. Expected selector string, HTMLElement, or config object');
      return;
    }

    this.createWidget(element, config);
  }

  static autoInit() {
    console.log('[MapsyWidget] Auto-initializing...');
    // Custom element <mapsy-widget> automatically initializes itself via connectedCallback
    // This function is here for backward compatibility

    // Check if there are any mapsy-widget elements
    const widgets = document.querySelectorAll('mapsy-widget');
    console.log(`[MapsyWidget] Found ${widgets.length} <mapsy-widget> elements`);

    if (widgets.length === 0) {
      console.log('[MapsyWidget] No <mapsy-widget> elements found. Custom elements will auto-initialize when added to DOM.');
    }
  }

  private static createWidget(element: HTMLElement, config?: any) {
    console.log('[MapsyWidget] Creating widget on element:', element);

    // If element is already a mapsy-widget, just update its config
    if (element.tagName.toLowerCase() === 'mapsy-widget') {
      if (config) {
        // Update attributes based on config
        if (config.apiUrl) element.setAttribute('api-url', config.apiUrl);
        if (config.defaultView) element.setAttribute('default-view', config.defaultView);
        if (config.showHeader !== undefined) element.setAttribute('show-header', String(config.showHeader));
        if (config.headerTitle) element.setAttribute('header-title', config.headerTitle);
        if (config.mapZoomLevel) element.setAttribute('map-zoom-level', String(config.mapZoomLevel));
        if (config.primaryColor) element.setAttribute('primary-color', config.primaryColor);
        if (config.instance) element.setAttribute('instance', config.instance);
        if (config.instanceToken) element.setAttribute('instance-token', config.instanceToken);
        if (config.compId) element.setAttribute('compid', config.compId);
      }
      return;
    }

    // Otherwise, create a new mapsy-widget element inside
    const widget = document.createElement('mapsy-widget');

    // Apply configuration as attributes
    if (config) {
      if (config.apiUrl) widget.setAttribute('api-url', config.apiUrl);
      if (config.defaultView) widget.setAttribute('default-view', config.defaultView);
      if (config.showHeader !== undefined) widget.setAttribute('show-header', String(config.showHeader));
      if (config.headerTitle) widget.setAttribute('header-title', config.headerTitle);
      if (config.mapZoomLevel) widget.setAttribute('map-zoom-level', String(config.mapZoomLevel));
      if (config.primaryColor) widget.setAttribute('primary-color', config.primaryColor);
      if (config.instance) widget.setAttribute('instance', config.instance);
      if (config.instanceToken) widget.setAttribute('instance-token', config.instanceToken);
      if (config.compId) widget.setAttribute('compid', config.compId);
    }

    // Clear element and add widget
    element.innerHTML = '';
    element.appendChild(widget);

    console.log('[MapsyWidget] Widget created with custom element');
  }

  static getVersion() {
    // Return version from loader
    return (window.MapsyWidget && window.MapsyWidget._version) || '0.0.0';
  }

  static getManifest() {
    // Return manifest from loader
    return (window.MapsyWidget && window.MapsyWidget._manifest) || {};
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    MapsyWidget.autoInit();
  });
} else {
  // DOM is already loaded
  setTimeout(() => MapsyWidget.autoInit(), 0);
}

// Expose to window
window.MapsyWidget = {
  init: MapsyWidget.init.bind(MapsyWidget),
  autoInit: MapsyWidget.autoInit.bind(MapsyWidget),
  get version() {
    return MapsyWidget.getVersion();
  },
  _version: window.MapsyWidget?._version,
  _manifest: window.MapsyWidget?._manifest
};

export default MapsyWidget;