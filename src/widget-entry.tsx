import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

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

class MapsyWidget {
  private static initialized: boolean = false;

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
          this.renderWidget(element as HTMLElement, configObj);
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

    this.renderWidget(element, config);
  }

  static autoInit() {
    // Find all mapsy-widget elements
    const widgets = document.querySelectorAll('mapsy-widget');

    if (widgets.length === 0) {
      console.warn('No <mapsy-widget> elements found on the page');
      return;
    }

    widgets.forEach((element) => {
      const widgetElement = element as HTMLElement;

      // Extract configuration from data attributes
      const config: any = {};

      // Get all data attributes
      if (widgetElement.dataset.apiUrl) {
        config.apiUrl = widgetElement.dataset.apiUrl;
      }
      if (widgetElement.dataset.defaultView) {
        config.defaultView = widgetElement.dataset.defaultView;
      }
      if (widgetElement.dataset.showHeader !== undefined) {
        config.showHeader = widgetElement.dataset.showHeader === 'true';
      }
      if (widgetElement.dataset.headerTitle) {
        config.headerTitle = widgetElement.dataset.headerTitle;
      }
      if (widgetElement.dataset.mapZoomLevel) {
        config.mapZoomLevel = parseInt(widgetElement.dataset.mapZoomLevel, 10);
      }
      if (widgetElement.dataset.primaryColor) {
        config.primaryColor = widgetElement.dataset.primaryColor;
      }

      // Also support a single data-config attribute with JSON
      if (widgetElement.dataset.config) {
        try {
          const jsonConfig = JSON.parse(widgetElement.dataset.config);
          Object.assign(config, jsonConfig);
        } catch (error) {
          console.error('Invalid JSON in data-config attribute:', error);
        }
      }

      this.renderWidget(widgetElement, config);
    });

    this.initialized = true;
  }

  private static renderWidget(element: HTMLElement, config?: any) {
    // Add a marker to prevent duplicate initialization
    if (element.dataset.mapsyInitialized === 'true') {
      console.warn('Widget already initialized on this element');
      return;
    }

    const root = ReactDOM.createRoot(element);
    root.render(
      <React.StrictMode>
        <App {...config} />
      </React.StrictMode>
    );

    // Mark as initialized
    element.dataset.mapsyInitialized = 'true';
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