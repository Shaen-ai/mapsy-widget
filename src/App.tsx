import { useState, useEffect } from 'react';
import MapView from './components/MapView';
import ListView from './components/ListView';
import { Location } from './types/location';
import { locationService, widgetConfigService, initializeApi } from './services/api';
import wixService from './services/wixService';
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
  const [authStatus, setAuthStatus] = useState<{ hasAuth: boolean; isPreview: boolean; message: string } | null>(null);
  const [config, setConfig] = useState<WidgetConfig>({
    defaultView: 'map',
    showHeader: false, // Hide header by default
    headerTitle: 'Our Locations',
    mapZoomLevel: 12,
    primaryColor: '#3B82F6',
    ...externalConfig,
  });

  useEffect(() => {
    const initializeWidget = async () => {
      console.log('[Widget] ========================================');
      console.log('[Widget] Starting widget initialization...');
      console.log('[Widget] ========================================');

      // Note: WixService is already initialized by MapsyWidgetElement.connectedCallback
      // We just need to update the API URL if provided
      if (apiUrl) {
        console.log('[Widget] Initializing API with custom URL:', apiUrl);
        await initializeApi(apiUrl);
      } else {
        console.log('[Widget] Using default API URL');
        // Still call initializeApi to ensure wixService is ready
        // (it won't re-initialize if already done)
        await initializeApi();
      }

      // Get authentication status for display
      const status = wixService.getAuthStatus();
      setAuthStatus(status);
      console.log('[Widget] Auth status:', status);

      // Log comprehensive instance information using the new method
      await wixService.logInstanceInfo();

      // Also log quick access values
      const instanceId = wixService.getInstanceId();
      console.log('[Widget] Quick Access - Instance ID:', instanceId);

      // Check for global Wix object and window.Wix.Utils.getInstanceId()
      if (typeof window !== 'undefined' && (window as any).Wix) {
        console.log('[Widget] Global Wix object exists:', Object.keys((window as any).Wix));
        if ((window as any).Wix.Utils) {
          console.log('[Widget] Wix.Utils exists:', Object.keys((window as any).Wix.Utils));

          // Try to call getInstanceId if it exists
          if (typeof (window as any).Wix.Utils.getInstanceId === 'function') {
            try {
              const wixInstanceId = (window as any).Wix.Utils.getInstanceId();
              console.log('[Widget] window.Wix.Utils.getInstanceId():', wixInstanceId);
            } catch (err) {
              console.log('[Widget] Error calling Wix.Utils.getInstanceId():', err);
            }
          } else {
            console.log('[Widget] Wix.Utils.getInstanceId is not a function');
          }
        } else {
          console.log('[Widget] Wix.Utils does not exist');
        }
      } else {
        console.log('[Widget] Global Wix object not found');
      }

      console.log('[Widget] ========================================');
      console.log('[Widget] Fetching config and locations...');
      console.log('[Widget] ========================================');

      // Fetch config and locations after Wix is initialized
      await fetchConfig();
      await fetchLocations();

      console.log('[Widget] ========================================');
      console.log('[Widget] Widget initialization complete');
      console.log('[Widget] ========================================');

      // Note: In Wix environment, configuration updates come through
      // the custom element's attributeChangedCallback, not through events
      console.log('[Widget] Config updates will be handled by the custom element.');
    };

    initializeWidget();
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