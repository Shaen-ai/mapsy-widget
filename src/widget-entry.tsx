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
    };
  }
}

class MapsyWidget {
  private static version: string = '0.0.0';
  private static manifestUrl: string = '';
  private static initialized: boolean = false;

  static async fetchVersion() {
    try {
      const currentScript = document.currentScript as HTMLScriptElement;
      if (currentScript) {
        const scriptUrl = new URL(currentScript.src);
        const manifestUrl = new URL('manifest.json', scriptUrl.origin + scriptUrl.pathname.replace(/[^\/]*$/, ''));

        const response = await fetch(manifestUrl.href);
        if (response.ok) {
          const manifest = await response.json();
          this.version = manifest.version || '0.0.0';
          console.log(`Mapsy Widget Version: ${this.version}`);
        }
      }
    } catch (error) {
      console.warn('Could not fetch widget manifest:', error);
    }
  }

  static init(selector?: string, config?: any) {
    // If no selector provided, look for mapsy-widget tags
    if (!selector) {
      this.autoInit();
      return;
    }

    const element = document.querySelector(selector);
    if (!element) {
      console.error(`Element with selector "${selector}" not found`);
      return;
    }

    this.renderWidget(element as HTMLElement, config);
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
    return this.version;
  }
}

// Auto-fetch version on load
MapsyWidget.fetchVersion();

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
  }
};

export default MapsyWidget;