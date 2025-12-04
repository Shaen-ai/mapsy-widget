import { useState, useEffect } from 'react';
import MapView from './components/MapView';
import ListView from './components/ListView';
import { Location } from './types/location';
import { locationService, widgetConfigService, initializeApi, isInEditorMode } from './services/api';
import { FiMap, FiList } from 'react-icons/fi';

interface WidgetConfig {
  defaultView: 'map' | 'list';
  showHeader: boolean;
  headerTitle?: string;
  mapZoomLevel?: number;
  primaryColor?: string;
  showWidgetName?: boolean;
  widgetName?: string;
  hasPremium?: boolean;
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
  const [shouldHideWidget, setShouldHideWidget] = useState(false);
  const [showFreePlanNotice, setShowFreePlanNotice] = useState(false);
  const [config, setConfig] = useState<WidgetConfig>({
    defaultView: 'map',
    showHeader: false, // Hide header by default
    headerTitle: 'Our Locations',
    mapZoomLevel: 12,
    primaryColor: '#3B82F6',
    showWidgetName: false,
    widgetName: '',
    ...externalConfig,
  });

  useEffect(() => {
    const initializeWidget = async () => {
      console.log('[Widget] Initializing...');

      try {
        await initializeApi();
        await fetchConfig();
        await fetchLocations();
        console.log('[Widget] ✅ Ready');
      } catch (error) {
        console.error('[Widget] ❌ Error:', (error as Error)?.message);
      }
    };

    initializeWidget();
  }, [apiUrl]);

  const fetchConfig = async () => {
    try {
      const configData = await widgetConfigService.getConfig();
      const mergedConfig = { ...configData, ...externalConfig };
      setConfig(mergedConfig);
      setCurrentView(mergedConfig.defaultView || 'map');

      // Check premium status
      const inEditor = isInEditorMode();
      const hasPremium = configData.hasPremium === true;

      if (!hasPremium) {
        if (inEditor) {
          // In editor/preview: show notice that widget won't appear on published site
          setShowFreePlanNotice(true);
          // Auto-hide after 5 seconds
          setTimeout(() => setShowFreePlanNotice(false), 5000);
        } else {
          // On published site: hide widget
          console.log('[Widget] No premium on published site - hiding widget');
          setShouldHideWidget(true);
        }
      }
    } catch (error) {
      console.error('[Config] ❌', (error as Error)?.message);
      setCurrentView(config.defaultView || 'map');
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const data = await locationService.getAll();
      setLocations(data);
    } catch (error) {
      console.error('[Locations] ❌', (error as Error)?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);

    // If in map view, find and trigger click on the corresponding marker
    if (currentView === 'map') {
      const markerIndex = locations.findIndex(loc => (loc._id || loc.id) === (location._id || location.id));
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

  // Hide widget on published site without premium
  if (shouldHideWidget) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50" style={{ position: 'relative' }}>
      {/* Free Plan Notice - shown in editor for users without premium */}
      {showFreePlanNotice && (
        <div
          onClick={() => setShowFreePlanNotice(false)}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 cursor-pointer"
        >
          <div className="bg-white rounded-xl shadow-2xl p-8 mx-4 max-w-md text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Free Plan Notice
            </h2>
            <p className="text-gray-600 mb-4">
              This widget will <strong>not be visible</strong> on your published site.
              Upgrade to a premium plan to show it to your visitors.
            </p>
            <p className="text-sm text-gray-400">
              Click anywhere to dismiss
            </p>
          </div>
        </div>
      )}

      {/* Widget Name Display */}
      {config.showWidgetName && config.widgetName && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2">
          <h1 className="text-white font-semibold text-center">
            {config.widgetName}
          </h1>
        </div>
      )}

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