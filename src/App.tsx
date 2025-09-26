import { useState, useEffect } from 'react';
import MapView from './components/MapView';
import ListView from './components/ListView';
import { Location } from './types/location';
import { locationService, widgetConfigService, initializeApi } from './services/api';
import { FiMap, FiList } from 'react-icons/fi';

interface WidgetConfig {
  defaultView: 'map' | 'list';
  showHeader: boolean;
  headerTitle?: string;
  mapZoomLevel?: number;
  primaryColor?: string;
}

interface AppProps {
  apiUrl?: string;
  config?: Partial<WidgetConfig>;
}

function App({ apiUrl, config: externalConfig }: AppProps = {}) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [currentView, setCurrentView] = useState<'map' | 'list'>('map');
  const [config, setConfig] = useState<WidgetConfig>({
    defaultView: 'map',
    showHeader: false, // Hide header by default
    headerTitle: 'Our Locations',
    mapZoomLevel: 12,
    primaryColor: '#3B82F6',
    ...externalConfig,
  });

  useEffect(() => {
    // Initialize API with provided URL if any
    if (apiUrl) {
      initializeApi(apiUrl);
    }

    fetchConfig();
    fetchLocations();

    // Register a global listener for config updates
    const configUpdateListener = (updatedConfig: WidgetConfig) => {
      console.log('[Widget] Config update received via global listener:', updatedConfig);
      setConfig(prev => ({ ...prev, ...updatedConfig }));
      setCurrentView(updatedConfig.defaultView || currentView);
    };

    // Initialize the global listeners array if it doesn't exist
    if (!(window as any).__mapsyConfigListeners) {
      (window as any).__mapsyConfigListeners = [];
    }

    // Add our listener to the global array
    (window as any).__mapsyConfigListeners.push(configUpdateListener);
    console.log('[Widget] Registered global config listener. Total listeners:', (window as any).__mapsyConfigListeners.length);

    // Listen for configuration updates from settings panel
    const handleStorageChange = (e: StorageEvent) => {
      console.log('[Widget] Storage event received:', e.key, e.newValue);
      if (e.key === 'mapsy-widget-config' && e.newValue) {
        try {
          const updatedConfig = JSON.parse(e.newValue);
          console.log('[Widget] Parsed config from storage:', updatedConfig);
          setConfig(prev => ({ ...prev, ...updatedConfig }));
          setCurrentView(updatedConfig.defaultView || currentView);
          console.log('[Widget] Config updated via storage event');
        } catch (error) {
          console.error('[Widget] Error parsing config update:', error);
        }
      }
    };

    const handleCustomConfigUpdate = (e: CustomEvent) => {
      console.log('[Widget] Custom event received:', e.detail);
      if (e.detail) {
        setConfig(prev => ({ ...prev, ...e.detail }));
        setCurrentView(e.detail.defaultView || currentView);
        console.log('[Widget] Config updated via custom event');
      }
    };

    // Listen for postMessage events
    const handlePostMessage = (e: MessageEvent) => {
      console.log('[Widget] PostMessage received:', e.data);
      if (e.data && e.data.type === 'mapsy-config-update' && e.data.config) {
        console.log('[Widget] Config update via postMessage:', e.data.config);
        setConfig(prev => ({ ...prev, ...e.data.config }));
        setCurrentView(e.data.config.defaultView || currentView);
      }
    };

    // Listen for BroadcastChannel messages
    const bc = new BroadcastChannel('mapsy-widget-config');
    bc.onmessage = (e) => {
      console.log('[Widget] BroadcastChannel message received:', e.data);
      if (e.data) {
        setConfig(prev => ({ ...prev, ...e.data }));
        setCurrentView(e.data.defaultView || currentView);
      }
    };
    console.log('[Widget] BroadcastChannel listener added');

    // Listen for storage events (cross-tab/iframe communication)
    window.addEventListener('storage', handleStorageChange);
    console.log('[Widget] Added storage event listener');

    // Listen for custom events on both window and document
    window.addEventListener('mapsy-config-update', handleCustomConfigUpdate as EventListener);
    console.log('[Widget] Added custom event listener on window');

    document.addEventListener('mapsy-config-update', handleCustomConfigUpdate as EventListener);
    console.log('[Widget] Added custom event listener on document');

    // Listen for postMessage
    window.addEventListener('message', handlePostMessage);
    console.log('[Widget] Added postMessage listener');

    // Expose updateConfig method on MapsyWidget for direct calls
    if ((window as any).MapsyWidget) {
      (window as any).MapsyWidget.updateConfig = (newConfig: WidgetConfig) => {
        console.log('[Widget] updateConfig called directly:', newConfig);
        setConfig(prev => ({ ...prev, ...newConfig }));
        setCurrentView(newConfig.defaultView || currentView);
      };
      console.log('[Widget] Exposed MapsyWidget.updateConfig method');
    }

    // Check for existing config in localStorage on mount
    const storedConfig = localStorage.getItem('mapsy-widget-config');
    console.log('[Widget] Checking localStorage on mount:', storedConfig);
    if (storedConfig) {
      try {
        const parsedConfig = JSON.parse(storedConfig);
        console.log('[Widget] Found config in localStorage:', parsedConfig);
        setConfig(prev => ({ ...prev, ...parsedConfig }));
        setCurrentView(parsedConfig.defaultView || config.defaultView);
      } catch (error) {
        console.error('[Widget] Error parsing stored config:', error);
      }
    } else {
      console.log('[Widget] No config found in localStorage');
    }

    return () => {
      // Remove the global listener
      if ((window as any).__mapsyConfigListeners) {
        const index = (window as any).__mapsyConfigListeners.indexOf(configUpdateListener);
        if (index > -1) {
          (window as any).__mapsyConfigListeners.splice(index, 1);
          console.log('[Widget] Removed global config listener. Remaining listeners:', (window as any).__mapsyConfigListeners.length);
        }
      }

      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('mapsy-config-update', handleCustomConfigUpdate as EventListener);
      document.removeEventListener('mapsy-config-update', handleCustomConfigUpdate as EventListener);
      window.removeEventListener('message', handlePostMessage);
      bc.close();
      console.log('[Widget] Cleaned up all event listeners');
    };
  }, [apiUrl]);

  const fetchConfig = async () => {
    try {
      const configData = await widgetConfigService.getConfig();
      // Merge external config with fetched config
      const mergedConfig = { ...configData, ...externalConfig };
      setConfig(mergedConfig);
      setCurrentView(mergedConfig.defaultView || 'map');
    } catch (error) {
      console.error('Error fetching widget config, using defaults:', error);
      // Use external config or defaults if fetch fails
      setCurrentView(config.defaultView || 'map');
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const data = await locationService.getAll();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);

    // If in map view, find and trigger click on the corresponding marker
    if (currentView === 'map') {
      const markerIndex = locations.findIndex(loc => loc.id === location.id);
      if (markerIndex !== -1 && markers[markerIndex]) {
        google.maps.event.trigger(markers[markerIndex], 'click');
      }

      // Pan and zoom to the selected location
      if (mapInstance && location.latitude && location.longitude) {
        mapInstance.panTo({ lat: location.latitude, lng: location.longitude });
        mapInstance.setZoom(16);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {config.showHeader && (
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 py-3 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {config.headerTitle || 'Our Locations'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('map')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition ${
                  currentView === 'map'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={currentView === 'map' ? { backgroundColor: config.primaryColor } : {}}
              >
                <FiMap size={16} />
                <span className="hidden sm:inline">Map</span>
              </button>
              <button
                onClick={() => setCurrentView('list')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition ${
                  currentView === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={currentView === 'list' ? { backgroundColor: config.primaryColor } : {}}
              >
                <FiList size={16} />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {currentView === 'map' ? (
          <MapView
            locations={locations}
            onMapLoad={setMapInstance}
            onMarkersLoad={setMarkers}
            onMarkerClick={setSelectedLocation}
            defaultZoom={config.mapZoomLevel}
          />
        ) : (
          <ListView
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationSelect}
            primaryColor={config.primaryColor}
          />
        )}
      </div>
    </div>
  );
}

export default App;