/**
 * Mapsy Widget Loader
 * Exactly matching yoga widget's working approach
 */
(function() {
  'use strict';

  // Configuration
  const WIDGET_CONFIG = {
    baseUrl: '', // Will be auto-detected
  };

  // Auto-detect base URL from current script
  const currentScript = document.currentScript || document.querySelector('script[src*="mapsy-widget"]');
  if (currentScript && currentScript.src) {
    // Get base URL without the script name
    const scriptUrl = currentScript.src;
    const lastSlash = scriptUrl.lastIndexOf('/');
    WIDGET_CONFIG.baseUrl = scriptUrl.substring(0, lastSlash);
    // For production, manifest is in the same directory as the loader
    WIDGET_CONFIG.manifestPath = WIDGET_CONFIG.baseUrl + '/widget-manifest.json';
  } else {
    // If we can't detect the script URL, default to current directory
    WIDGET_CONFIG.baseUrl = '.';
    WIDGET_CONFIG.manifestPath = './widget-manifest.json';
  }

  // Log configuration for debugging
  console.log('[Mapsy Widget Loader] Base URL:', WIDGET_CONFIG.baseUrl);
  console.log('[Mapsy Widget Loader] Manifest Path:', WIDGET_CONFIG.manifestPath);
  console.log('[Mapsy Widget Loader] Current Script:', currentScript?.src || 'Not detected');

  // Check if widget is already loaded
  if (window.MapsyWidgetLoaded) {
    console.log('[Mapsy Widget] Already loaded');
    return;
  }

  /**
   * Get widget version from manifest - always fetch fresh
   */
  function getWidgetVersion() {
    // Always fetch fresh manifest with cache-busting parameter
    const manifestUrl = WIDGET_CONFIG.manifestPath + '?t=' + Date.now();
    console.log('[Mapsy Widget Loader] Fetching fresh manifest from:', manifestUrl);

    return fetch(manifestUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(manifest => {
        console.log('[Mapsy Widget Loader] Manifest loaded:', manifest);
        return {
          version: manifest.version || 'latest',
          buildTime: manifest.buildTime || null
        };
      })
      .catch(error => {
        console.error('[Mapsy Widget Loader] Failed to fetch manifest:', error);
        // Fallback to default version
        console.log('[Mapsy Widget Loader] Using fallback version:', '1.0.0');
        return {
          version: '1.0.0',
          buildTime: null
        };
      });
  }

  /**
   * Load script dynamically
   */
  function loadScript(src, onLoad, onError) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    // Don't use async - we want the script to execute as soon as it loads
    // to register the custom element before Wix tries to use it
    script.async = false;
    script.src = src;
    script.onload = onLoad;
    script.onerror = onError;

    const target = document.head || document.getElementsByTagName('head')[0] || document.body;
    target.appendChild(script);
  }

  /**
   * Load CSS
   */
  function loadStyles(version, timestamp) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = `${WIDGET_CONFIG.baseUrl}/style.css?v=${version}&t=${timestamp}`;

    const target = document.head || document.getElementsByTagName('head')[0];
    target.appendChild(link);
  }

  /**
   * Initialize the widget
   */
  function initializeWidget(version, buildTime) {
    // Build widget URL with version AND timestamp for cache busting
    // This ensures fresh load when same version is re-deployed
    const timestamp = buildTime ? new Date(buildTime).getTime() : Date.now();
    const widgetUrl = `${WIDGET_CONFIG.baseUrl}/mapsy-widget.min.js?v=${version}&t=${timestamp}`;

    console.log('Loading Mapsy Widget version:', version);

    // Load styles with timestamp
    loadStyles(version, timestamp);

    // Load the widget script
    loadScript(widgetUrl,
      function onSuccess() {
        console.log('Mapsy Widget loaded successfully');
        window.MapsyWidgetLoaded = true;

        // Initialize widget if function exists
        if (typeof window.MapsyWidget !== 'undefined' && typeof window.MapsyWidget.init === 'function') {
          // Get config from script tag
          const script = document.currentScript || document.querySelector('script[src*="mapsy-widget"]');
          if (script) {
            const config = {
              container: script.getAttribute('data-container') || 'mapsy-widget',
              apiUrl: script.getAttribute('data-api-url') || undefined
            };

            // Auto-initialize for all mapsy-widget elements
            const widgets = document.querySelectorAll('mapsy-widget');
            if (widgets.length > 0) {
              widgets.forEach((widget, index) => {
                const widgetConfig = {
                  ...config,
                  container: widget,
                  apiUrl: widget.getAttribute('data-api-url') || config.apiUrl
                };
                window.MapsyWidget.init(widgetConfig);
              });
            }
          }
        }

        // Fire custom event
        const event = new CustomEvent('MapsyWidgetReady', {
          detail: { version: version }
        });
        window.dispatchEvent(event);
      },
      function onError() {
        console.error('Failed to load Mapsy Widget');

        const event = new CustomEvent('MapsyWidgetError', {
          detail: { message: 'Failed to load widget script' }
        });
        window.dispatchEvent(event);
      }
    );
  }

  /**
   * Main execution
   */
  function loadWidget() {
    getWidgetVersion().then(data => {
      initializeWidget(data.version, data.buildTime);
    });
  }

  // Start loading IMMEDIATELY - don't wait for DOMContentLoaded
  // This ensures the custom element is registered before Wix tries to use it
  loadWidget();

  // Expose loader API
  window.MapsyWidgetLoader = {
    reload: function() {
      // Force reload by resetting loaded flag
      window.MapsyWidgetLoaded = false;
      loadWidget();
    },
    config: WIDGET_CONFIG
  };

})();