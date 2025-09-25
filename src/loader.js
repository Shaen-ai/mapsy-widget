/**
 * Mapsy Widget Loader
 * Exactly matching yoga widget's working approach
 */
(function() {
  'use strict';

  // Configuration
  const WIDGET_CONFIG = {
    baseUrl: '', // Will be auto-detected
    cacheTimeout: 3600000, // 1 hour
    manifestPath: '/widget-manifest.json' // Matching yoga widget
  };

  // Auto-detect base URL from current script
  const currentScript = document.currentScript || document.querySelector('script[src*="mapsy-widget"]');
  if (currentScript) {
    // Get base URL without the script name
    const scriptUrl = currentScript.src;
    WIDGET_CONFIG.baseUrl = scriptUrl.substring(0, scriptUrl.lastIndexOf('/'));
  }

  // Check if widget is already loaded
  if (window.MapsyWidgetLoaded) {
    console.log('[Mapsy Widget] Already loaded');
    return;
  }

  /**
   * Get widget version from manifest with localStorage caching
   */
  function getWidgetVersion() {
    const cacheKey = 'mapsy-widget-version';
    const cacheTimeKey = 'mapsy-widget-version-time';

    // Check localStorage cache first
    const cachedVersion = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(cacheTimeKey);

    if (cachedVersion && cacheTime) {
      const now = Date.now();
      const timeDiff = now - parseInt(cacheTime);

      // Use cache if still valid
      if (timeDiff < WIDGET_CONFIG.cacheTimeout) {
        return Promise.resolve(cachedVersion);
      }
    }

    // Fetch latest version from manifest - exactly like yoga widget
    return fetch(WIDGET_CONFIG.baseUrl + WIDGET_CONFIG.manifestPath)
      .then(response => response.json())
      .then(manifest => {
        const version = manifest.version || 'latest';
        // Cache the version
        localStorage.setItem(cacheKey, version);
        localStorage.setItem(cacheTimeKey, Date.now().toString());
        return version;
      })
      .catch(error => {
        console.error('Failed to fetch widget manifest:', error);
        // Fallback to cached or default
        return cachedVersion || '1.0.0';
      });
  }

  /**
   * Load script dynamically
   */
  function loadScript(src, onLoad, onError) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = src;
    script.onload = onLoad;
    script.onerror = onError;

    const target = document.head || document.getElementsByTagName('head')[0] || document.body;
    target.appendChild(script);
  }

  /**
   * Load CSS
   */
  function loadStyles(version) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = `${WIDGET_CONFIG.baseUrl}/style.css?v=${version}`;

    const target = document.head || document.getElementsByTagName('head')[0];
    target.appendChild(link);
  }

  /**
   * Initialize the widget
   */
  function initializeWidget(version) {
    // Build widget URL with version for cache busting
    const widgetUrl = `${WIDGET_CONFIG.baseUrl}/mapsy-widget.min.js?v=${version}`;

    console.log('Loading Mapsy Widget version:', version);

    // Load styles
    loadStyles(version);

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
    getWidgetVersion().then(version => {
      initializeWidget(version);
    });
  }

  // Start loading
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWidget);
  } else {
    loadWidget();
  }

  // Expose loader API
  window.MapsyWidgetLoader = {
    reload: function() {
      localStorage.removeItem('mapsy-widget-version');
      localStorage.removeItem('mapsy-widget-version-time');
      window.MapsyWidgetLoaded = false;
      loadWidget();
    },
    config: WIDGET_CONFIG
  };

})();