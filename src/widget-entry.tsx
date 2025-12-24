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
    console.log('[MapsyWidget.init] 🚀 Called with:', { selectorOrConfig, config });
    console.trace('[MapsyWidget.init] Call stack');

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
    // Custom element auto-initializes via connectedCallback
  }

  private static createWidget(element: HTMLElement, config?: any) {
    console.log('[MapsyWidget.createWidget] 🏗️ Called with element:', element.tagName, 'config:', config);

    // Defensive check: ensure element exists
    if (!element) {
      console.error('[MapsyWidget] Cannot create widget: element is null or undefined');
      return;
    }

    // If element is already a mapsy-widget, just update its config
    if (element.tagName.toLowerCase() === 'mapsy-widget') {
      console.log('[MapsyWidget.createWidget] ✅ Element is already mapsy-widget, updating config only');
      if (config) {
        // ✅ NEW: Use direct method API instead of setAttribute
        // This updates state directly without string conversion
        const widgetElement = element as any;
        if (typeof widgetElement.setConfig === 'function') {
          widgetElement.setConfig(config);
        } else {
          // Fallback to setAttribute for backwards compatibility
          element.setAttribute('config', JSON.stringify(config));
        }
      }
      return;
    }

    // Otherwise, create a new mapsy-widget element inside
    console.log('[MapsyWidget.createWidget] ⚠️ Element is NOT mapsy-widget, SKIPPING recreation (commented out)');

    // COMMENTED OUT TO PREVENT RECREATION - UNCOMMENT STEP BY STEP TO DEBUG
    // const widget = document.createElement('mapsy-widget') as any;

    // // Apply configuration using direct method API if available
    // if (config) {
    //   // Wait for element to be connected and initialized
    //   if (typeof widget.setConfig === 'function') {
    //     widget.setConfig(config);
    //   } else {
    //     // Set as attribute initially, will be parsed on connection
    //     widget.setAttribute('config', JSON.stringify(config));
    //   }
    // }

    // // Clear element and add widget
    // console.log('[MapsyWidget.createWidget] 🗑️ Clearing innerHTML and appending new widget');
    // element.innerHTML = '';
    // element.appendChild(widget);
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