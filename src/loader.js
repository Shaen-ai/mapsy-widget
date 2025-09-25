/**
 * Mapsy Widget Loader
 * This script fetches the manifest and loads the appropriate versioned widget
 */

(function() {
  const WIDGET_BASE_URL = document.currentScript.src.replace(/[^\/]*$/, '');

  // Generate cache buster based on current time (changes every hour to balance caching and freshness)
  const getCacheBuster = () => {
    const now = new Date();
    // Create a timestamp that changes every hour
    const hourly = `${now.getFullYear()}${now.getMonth()}${now.getDate()}${now.getHours()}`;
    return hourly;
  };

  // Prevent caching by adding timestamp
  const preventCache = () => '?_t=' + new Date().getTime();

  // Load manifest with cache busting - using simple request to avoid OPTIONS
  const loadManifest = async () => {
    try {
      const manifestUrl = WIDGET_BASE_URL + 'manifest.json' + preventCache();

      // Use simple GET request - no custom headers to avoid OPTIONS preflight
      const response = await fetch(manifestUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status}`);
      }

      const manifest = await response.json();
      console.log('[Mapsy Widget] Manifest loaded successfully');
      return manifest;
    } catch (error) {
      console.warn('[Mapsy Widget] Could not fetch manifest, using timestamp-based cache busting.');
      console.warn('Error:', error.message);

      // Return null to indicate manifest is not available
      return null;
    }
  };

  // Load CSS with proper cache busting
  const loadCSS = (version, useTimestamp = false) => {
    const existingCSS = document.querySelector(`link[href*="style.css"]`);
    if (existingCSS) {
      existingCSS.remove();
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';

    // Use timestamp for cache busting if no version or if specified
    if (useTimestamp || !version) {
      // Use timestamp that changes every hour for reasonable caching
      link.href = `${WIDGET_BASE_URL}style.css?_cb=${getCacheBuster()}`;
    } else {
      // Use version-based cache busting
      link.href = `${WIDGET_BASE_URL}style.css?v=${version}`;
    }

    document.head.appendChild(link);
  };

  // Load the main widget script with proper cache busting
  const loadWidget = (version, useTimestamp = false) => {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src*="mapsy-widget.min.js"]`);
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');

      // Use timestamp for cache busting if no version or if specified
      if (useTimestamp || !version) {
        // Use timestamp that changes every hour for reasonable caching
        script.src = `${WIDGET_BASE_URL}mapsy-widget.min.js?_cb=${getCacheBuster()}`;
        console.log(`[Mapsy Widget] Loading with cache buster: ${getCacheBuster()}`);
      } else {
        // Use version-based cache busting
        script.src = `${WIDGET_BASE_URL}mapsy-widget.min.js?v=${version}`;
        console.log(`[Mapsy Widget] Loading version: ${version}`);
      }

      script.onload = () => {
        console.log('[Mapsy Widget] Successfully loaded');
        resolve();
      };

      script.onerror = (error) => {
        console.error('[Mapsy Widget] Failed to load widget script:', error);
        reject(error);
      };

      document.head.appendChild(script);
    });
  };

  // Initialize
  const init = async () => {
    try {
      console.log('[Mapsy Widget] Initializing...');

      // Try to load manifest
      const manifest = await loadManifest();

      if (manifest && manifest.version) {
        // Manifest loaded successfully - use version-based caching
        const version = manifest.version;

        console.log(`[Mapsy Widget] Using version: ${version}`);
        if (manifest.buildTime) {
          console.log(`[Mapsy Widget] Build time: ${manifest.buildTime}`);
        }

        // Load with version
        loadCSS(version, false);
        await loadWidget(version, false);

        // Store version info globally
        if (window.MapsyWidget) {
          window.MapsyWidget._version = version;
          window.MapsyWidget._manifest = manifest;
          window.MapsyWidget._cacheMode = 'version';
          console.log('[Mapsy Widget] Ready with version-based caching!');
        }
      } else {
        // Manifest not available - use timestamp-based cache busting
        console.log('[Mapsy Widget] Using timestamp-based cache busting (manifest unavailable)');

        // Load with timestamp
        loadCSS(null, true);
        await loadWidget(null, true);

        if (window.MapsyWidget) {
          window.MapsyWidget._version = getCacheBuster();
          window.MapsyWidget._manifest = {
            version: getCacheBuster(),
            mode: 'timestamp',
            error: 'Manifest unavailable - using hourly cache refresh'
          };
          window.MapsyWidget._cacheMode = 'timestamp';
          console.log('[Mapsy Widget] Ready with timestamp-based caching!');
        }
      }

    } catch (error) {
      console.error('[Mapsy Widget] Failed to initialize:', error);

      // Final fallback - try with aggressive cache busting
      console.log('[Mapsy Widget] Attempting final fallback with timestamp...');
      try {
        loadCSS(null, true);
        await loadWidget(null, true);

        if (window.MapsyWidget) {
          window.MapsyWidget._version = getCacheBuster();
          window.MapsyWidget._manifest = {
            version: getCacheBuster(),
            error: 'Fallback mode active'
          };
          window.MapsyWidget._cacheMode = 'timestamp-fallback';
          console.log('[Mapsy Widget] Loaded in fallback mode');
        }
      } catch (fallbackError) {
        console.error('[Mapsy Widget] Complete failure. Unable to load widget.', fallbackError);
      }
    }
  };

  // Start initialization
  init();
})();