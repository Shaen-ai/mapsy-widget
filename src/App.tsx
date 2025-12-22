import { useState, useEffect, useMemo, useCallback } from 'react';
import MapView from './components/MapView';
import ListView from './components/ListView';
import { Location } from './types/location';
import { initializeApi } from './services/api';
import { FiMap, FiList } from 'react-icons/fi';
import type { WidgetStore } from './MapsyWidgetElement';

interface AppProps {
  store: WidgetStore;
}

function App({ store }: AppProps) {
  // Subscribe to store changes
  const [state, setState] = useState(store.getState());
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [currentView, setCurrentView] = useState<'map' | 'list'>(state.config.defaultView || 'map');
  const [initializing, setInitializing] = useState(true);

  // Initialize API on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeApi();
        setInitializing(false);
      } catch (error) {
        console.error('[App] ❌ API init failed:', error);
        setInitializing(false);
      }
    };
    init();
  }, []);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const newState = store.getState();
      setState(newState);

      // Update current view if defaultView changed
      if (newState.config.defaultView && newState.config.defaultView !== currentView) {
        setCurrentView(newState.config.defaultView);
      }
    });

    return unsubscribe;
  }, [store, currentView]);

  // Extract values from state
  const { config, locations, shouldHideWidget, showFreePlanNotice } = state;

  const handleLocationSelect = useCallback((location: Location) => {
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
  }, [currentView, locations, markers, mapInstance]);

  const handleViewChange = useCallback((view: 'map' | 'list') => {
    setCurrentView(view);
  }, []);

  // Memoize config values to prevent unnecessary re-renders
  const memoizedConfig = useMemo(() => ({
    defaultView: config.defaultView || 'map',
    showHeader: config.showHeader || false,
    headerTitle: config.headerTitle || 'Our Locations',
    mapZoomLevel: config.mapZoomLevel || 12,
    primaryColor: config.primaryColor || '#3B82F6',
    showWidgetName: config.showWidgetName || false,
    widgetName: config.widgetName || '',
  }), [
    config.defaultView,
    config.showHeader,
    config.headerTitle,
    config.mapZoomLevel,
    config.primaryColor,
    config.showWidgetName,
    config.widgetName,
  ]);

  // Hide widget on published site without premium
  if (shouldHideWidget) {
    return null;
  }

  if (initializing) {
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
          onClick={() => {
            // Dismiss by updating store
            store.setPremiumStatus(state.premiumPlanName, false, false);
          }}
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
      {memoizedConfig.showWidgetName && memoizedConfig.widgetName && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2">
          <h1 className="text-white font-semibold text-center">
            {memoizedConfig.widgetName}
          </h1>
        </div>
      )}

      {memoizedConfig.showHeader && (
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 py-3 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {memoizedConfig.headerTitle || 'Our Locations'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleViewChange('map')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition ${
                  currentView === 'map'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={currentView === 'map' ? { backgroundColor: memoizedConfig.primaryColor } : {}}
              >
                <FiMap size={16} />
                <span className="hidden sm:inline">Map</span>
              </button>
              <button
                onClick={() => handleViewChange('list')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition ${
                  currentView === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={currentView === 'list' ? { backgroundColor: memoizedConfig.primaryColor } : {}}
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
            mapZoomLevel={memoizedConfig.mapZoomLevel}
            onMapLoad={setMapInstance}
            onMarkersLoad={setMarkers}
            onMarkerClick={setSelectedLocation}
          />
        ) : (
          <ListView
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationSelect}
            primaryColor={memoizedConfig.primaryColor}
          />
        )}
      </div>
    </div>
  );
}

export default App;
