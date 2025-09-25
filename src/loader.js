/**
 * Mapsy Widget Loader
 * Simplified loader based on working yoga widget approach
 */
(function() {
  'use strict';

  // Configuration
  const WIDGET_CONFIG = {
    baseUrl: '', // Will be auto-detected from script location
    cacheTimeout: 3600000, // 1 hour in milliseconds
    manifestPath: '/manifest.json'
  };

  // Auto-detect base URL from current script
  const currentScript = document.currentScript || document.querySelector('script[src*="mapsy-widget"]');
  if (currentScript) {
    WIDGET_CONFIG.baseUrl = currentScript.src.replace(/[^\/]*$/, '').replace(/\/$/, '');
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
    try {
      const cachedVersion = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(cacheTimeKey);

      if (cachedVersion && cacheTime) {
        const now = Date.now();
        const timeDiff = now - parseInt(cacheTime);

        // Use cache if it's still valid
        if (timeDiff < WIDGET_CONFIG.cacheTimeout) {
          console.log('[Mapsy Widget] Using cached version:', cachedVersion);
          return Promise.resolve(cachedVersion);
        }
      }
    } catch (e) {
      // localStorage might not be available
      console.warn('[Mapsy Widget] localStorage not available');
    }

    // Fetch latest version from manifest - simple fetch, no special headers
    const manifestUrl = WIDGET_CONFIG.baseUrl + WIDGET_CONFIG.manifestPath;

    return fetch(manifestUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('Manifest not found');
        }
        return response.json();
      })
      .then(manifest => {
        const version = manifest.version || '1.0.0';
        console.log('[Mapsy Widget] Fetched version from manifest:', version);

        // Cache the version in localStorage
        try {
          localStorage.setItem(cacheKey, version);
          localStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (e) {
          // Ignore if localStorage fails
        }

        return version;
      })
      .catch(error => {
        console.warn('[Mapsy Widget] Could not fetch manifest, using fallback');
        // Use timestamp-based fallback
        const fallbackVersion = 'cb' + Math.floor(Date.now() / 3600000); // Changes every hour
        return fallbackVersion;
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
   * Load CSS dynamically
   */
  function loadStyles(version) {
    // Check if styles already loaded
    if (document.querySelector('link[href*="mapsy-widget"][href*="style.css"]')) {
      return;
    }

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
    // Build URLs with version for cache busting
    const widgetUrl = `${WIDGET_CONFIG.baseUrl}/mapsy-widget.min.js?v=${version}`;

    console.log('[Mapsy Widget] Loading version:', version);

    // Load CSS first
    loadStyles(version);

    // Load the widget script
    loadScript(widgetUrl,
      function onSuccess() {
        console.log('[Mapsy Widget] Loaded successfully');
        window.MapsyWidgetLoaded = true;

        // Store version info
        if (window.MapsyWidget) {
          window.MapsyWidget._version = version;
          window.MapsyWidget._loaderVersion = '1.0.0';
        }

        // Auto-initialize for all mapsy-widget elements
        if (typeof window.MapsyWidget !== 'undefined' && typeof window.MapsyWidget.autoInit === 'function') {
          // Small delay to ensure DOM is ready
          setTimeout(function() {
            window.MapsyWidget.autoInit();
          }, 0);
        }

        // Fire custom event
        const event = new CustomEvent('MapsyWidgetReady', {
          detail: { version: version }
        });
        window.dispatchEvent(event);
      },
      function onError() {
        console.error('[Mapsy Widget] Failed to load widget script');

        // Fire error event
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
    // Get version and load widget
    getWidgetVersion().then(function(version) {
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
      // Clear cache
      try {
        localStorage.removeItem('mapsy-widget-version');
        localStorage.removeItem('mapsy-widget-version-time');
      } catch (e) {
        // Ignore if localStorage fails
      }
      // Reset and reload
      window.MapsyWidgetLoaded = false;

      // Remove existing script and styles
      const existingScript = document.querySelector('script[src*="mapsy-widget.min.js"]');
      const existingStyles = document.querySelector('link[href*="mapsy-widget"][href*="style.css"]');
      if (existingScript) existingScript.remove();
      if (existingStyles) existingStyles.remove();

      loadWidget();
    },
    getVersion: function() {
      return window.MapsyWidget && window.MapsyWidget._version;
    },
    config: WIDGET_CONFIG
  };

})();