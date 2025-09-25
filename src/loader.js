/**
 * Mapsy Widget Loader
 * This script fetches the manifest and loads the appropriate versioned widget
 */

(function() {
  const WIDGET_BASE_URL = document.currentScript.src.replace(/[^\/]*$/, '');

  // Prevent caching by adding timestamp
  const preventCache = () => '?t=' + new Date().getTime();

  // Load manifest with cache busting
  const loadManifest = async () => {
    try {
      const manifestUrl = WIDGET_BASE_URL + 'manifest.json' + preventCache();
      const response = await fetch(manifestUrl, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch manifest');
      }

      return await response.json();
    } catch (error) {
      console.error('Error loading widget manifest:', error);
      // Fallback to default version
      return { version: 'latest' };
    }
  };

  // Load CSS
  const loadCSS = (version) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${WIDGET_BASE_URL}style.css?v=${version}`;
    document.head.appendChild(link);
  };

  // Load the main widget script
  const loadWidget = (version) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${WIDGET_BASE_URL}mapsy-widget.min.js?v=${version}`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // Initialize
  const init = async () => {
    try {
      // Load manifest
      const manifest = await loadManifest();
      const version = manifest.version || 'latest';

      console.log(`[Mapsy Widget] Loading version ${version}`);
      console.log(`[Mapsy Widget] Build time: ${manifest.buildTime}`);

      // Load CSS
      loadCSS(version);

      // Load widget
      await loadWidget(version);

      // Store version info globally
      if (window.MapsyWidget) {
        window.MapsyWidget._version = version;
        window.MapsyWidget._manifest = manifest;
      }

    } catch (error) {
      console.error('[Mapsy Widget] Failed to initialize:', error);
    }
  };

  // Start initialization
  init();
})();