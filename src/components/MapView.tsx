import { useEffect, useRef, memo, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Location } from '../types/location';
import { FiX, FiMapPin, FiPhone, FiMail, FiGlobe, FiClock, FiNavigation } from 'react-icons/fi';

interface MapViewProps {
  locations: Location[];
  mapZoomLevel?: number;
  onMapLoad?: (map: google.maps.Map) => void;
  onMarkersLoad?: (markers: google.maps.Marker[]) => void;
  onMarkerClick?: (location: Location) => void;
}

// Hook to detect mobile screen
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

const MapView: React.FC<MapViewProps> = ({
  locations,
  mapZoomLevel = 12,
  onMapLoad,
  onMarkersLoad,
  onMarkerClick,
}) => {
  console.log('[MapView] 🗺️ Rendering MapView', { locationsCount: locations.length, mapZoomLevel });

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<any[]>([]); // Using any for now as AdvancedMarkerElement types might not be available
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Mobile popup state
  const [mobileSelectedLocation, setMobileSelectedLocation] = useState<Location | null>(null);
  const isMobile = useIsMobile();

  // Store callbacks in refs so they don't trigger effect re-runs
  const onMapLoadRef = useRef(onMapLoad);
  const onMarkersLoadRef = useRef(onMarkersLoad);
  const onMarkerClickRef = useRef(onMarkerClick);

  // Update callback refs when they change
  useEffect(() => {
    onMapLoadRef.current = onMapLoad;
    onMarkersLoadRef.current = onMarkersLoad;
    onMarkerClickRef.current = onMarkerClick;
  });

  useEffect(() => {
    console.log('[MapView] ⚙️ useEffect triggered - recreating map/markers', { locationsCount: locations.length, mapZoomLevel });

    // HARDCODED GOOGLE MAPS API KEY - DO NOT CHANGE
    const GOOGLE_MAPS_API_KEY = 'AIzaSyAU-ogdEZffsjmKb6PH8WjlSRr-Fuw9ti8';

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['marker'], // Add marker library for AdvancedMarkerElement
    });

    loader.load().then(() => {
      if (mapRef.current && !mapInstance.current) {
        // Initialize map with mapId for AdvancedMarkerElement support
        mapInstance.current = new google.maps.Map(mapRef.current, {
          center: { lat: 40.7128, lng: -74.0060 },
          zoom: mapZoomLevel,
          mapTypeControl: false,
          fullscreenControl: true,
          streetViewControl: true,
          mapId: 'MAPSY_WIDGET_MAP', // Required for AdvancedMarkerElement
        });

        // Initialize info window
        infoWindowRef.current = new google.maps.InfoWindow();

        if (onMapLoadRef.current) {
          onMapLoadRef.current(mapInstance.current);
        }
      } else if (mapInstance.current) {
        // Map already exists, apply new zoom level directly
        mapInstance.current.setZoom(mapZoomLevel);
      }

      // Clear existing markers
      markersRef.current.forEach(marker => {
        if (marker.map) {
          marker.map = null; // Remove AdvancedMarkerElement from map
        }
      });
      markersRef.current = [];

      // Add markers for locations
      if (mapInstance.current && locations.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        const newMarkers: any[] = [];

        locations.forEach((location) => {
          if (location.latitude && location.longitude) {
            const position = { lat: location.latitude, lng: location.longitude };

            // Check if AdvancedMarkerElement is available
            if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
              // Use AdvancedMarkerElement (new way)
              const marker = new google.maps.marker.AdvancedMarkerElement({
                position,
                map: mapInstance.current!,
                title: location.name,
              });

              // Add click listener to marker
              marker.addListener('click', () => {
                // Check if mobile at click time
                const isMobileNow = window.innerWidth < 768;
                
                if (isMobileNow) {
                  // On mobile, show bottom sheet popup
                  setMobileSelectedLocation(location);
                  // Close any open InfoWindow
                  if (infoWindowRef.current) {
                    infoWindowRef.current.close();
                  }
                } else {
                  // On desktop, show InfoWindow
                  if (infoWindowRef.current && mapInstance.current) {
                    const content = createInfoWindowContent(location);
                    infoWindowRef.current.setContent(content);
                    infoWindowRef.current.open(mapInstance.current, marker as any);
                  }
                }
                
                if (onMarkerClickRef.current) {
                  onMarkerClickRef.current(location);
                }
              });

              newMarkers.push(marker);
            } else {
              // Fallback to regular Marker if AdvancedMarkerElement is not available
              const marker = new google.maps.Marker({
                position,
                map: mapInstance.current!,
                title: location.name,
                animation: google.maps.Animation.DROP,
              });

              // Add click listener to marker
              marker.addListener('click', () => {
                // Check if mobile at click time
                const isMobileNow = window.innerWidth < 768;
                
                if (isMobileNow) {
                  // On mobile, show bottom sheet popup
                  setMobileSelectedLocation(location);
                  // Close any open InfoWindow
                  if (infoWindowRef.current) {
                    infoWindowRef.current.close();
                  }
                } else {
                  // On desktop, show InfoWindow
                  if (infoWindowRef.current && mapInstance.current) {
                    const content = createInfoWindowContent(location);
                    infoWindowRef.current.setContent(content);
                    infoWindowRef.current.open(mapInstance.current, marker);
                  }
                }
                
                if (onMarkerClickRef.current) {
                  onMarkerClickRef.current(location);
                }
              });

              newMarkers.push(marker);
            }

            bounds.extend(position);
          }
        });

        markersRef.current = newMarkers;

        if (onMarkersLoadRef.current) {
          onMarkersLoadRef.current(newMarkers);
        }

        // Fit map to show all markers
        if (newMarkers.length > 0) {
          mapInstance.current.fitBounds(bounds);

          // Apply configured zoom level after fitBounds
          const listener = google.maps.event.addListener(mapInstance.current, 'idle', () => {
            if (mapInstance.current) {
              const currentZoom = mapInstance.current.getZoom();
              // If zoom is too close or we have a configured level, apply it
              if (currentZoom && currentZoom > mapZoomLevel) {
                mapInstance.current.setZoom(mapZoomLevel);
              }
            }
            google.maps.event.removeListener(listener);
          });
        }
      }
    });

    return () => {
      // Cleanup markers on unmount
      markersRef.current.forEach(marker => {
        if (marker.map) {
          marker.map = null; // For AdvancedMarkerElement
        } else if (marker.setMap) {
          marker.setMap(null); // For regular Marker
        }
      });
    };
    // Only re-run when locations or mapZoomLevel change, not when callbacks change
  }, [locations, mapZoomLevel]);

  const createInfoWindowContent = (location: Location): string => {
    const getCurrentDayHours = () => {
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const today = days[new Date().getDay()];
      return location.business_hours?.[today as keyof typeof location.business_hours] || 'Closed';
    };

    return `
      <div class="p-4 max-w-sm">
        ${location.image_url ? `
          <img src="${location.image_url}" alt="${location.name}" class="w-full h-32 object-cover rounded-lg mb-3">
        ` : ''}
        <h3 class="font-bold text-lg mb-2">${location.name}</h3>
        <div class="space-y-2 text-sm text-gray-600">
          <div class="flex items-start gap-2">
            <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>${location.address}</span>
          </div>

          ${location.phone ? `
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              <a href="tel:${location.phone}" class="text-blue-600 hover:underline">${location.phone}</a>
            </div>
          ` : ''}

          ${location.email ? `
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <a href="mailto:${location.email}" class="text-blue-600 hover:underline">${location.email}</a>
            </div>
          ` : ''}

          ${location.website ? `
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
              </svg>
              <a href="${location.website}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Visit Website</a>
            </div>
          ` : ''}

          <div class="pt-2 border-t">
            <p class="font-semibold text-gray-700">Today's Hours: ${getCurrentDayHours()}</p>
          </div>

          <a
            href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
            Get Directions
          </a>
        </div>
      </div>
    `;
  };

  // Get current day hours for mobile popup
  const getCurrentDayHours = (location: Location) => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = days[new Date().getDay()];
    return location.business_hours?.[today as keyof typeof location.business_hours] || 'Closed';
  };

  // Close mobile popup
  const closeMobilePopup = () => {
    setMobileSelectedLocation(null);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Mobile Bottom Sheet Popup */}
      {mobileSelectedLocation && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={closeMobilePopup}
          />
          
          {/* Bottom Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-up">
            <div className="bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
              
              {/* Close button */}
              <button
                onClick={closeMobilePopup}
                className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"
              >
                <FiX className="w-5 h-5 text-gray-600" />
              </button>
              
              {/* Content */}
              <div className="px-5 pb-8 pt-2 overflow-y-auto max-h-[calc(85vh-60px)]">
                {/* Image */}
                {mobileSelectedLocation.image_url && (
                  <div className="relative -mx-5 mb-4">
                    <img
                      src={mobileSelectedLocation.image_url}
                      alt={mobileSelectedLocation.name}
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                )}
                
                {/* Location Name & Category */}
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {mobileSelectedLocation.name}
                  </h3>
                  {mobileSelectedLocation.category && (
                    <span className="inline-block px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full capitalize">
                      {mobileSelectedLocation.category}
                    </span>
                  )}
                </div>
                
                {/* Info Grid */}
                <div className="space-y-4 mb-6">
                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <FiMapPin className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm text-gray-500 font-medium">Address</p>
                      <p className="text-gray-900">{mobileSelectedLocation.address}</p>
                    </div>
                  </div>
                  
                  {/* Phone */}
                  {mobileSelectedLocation.phone && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                        <FiPhone className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm text-gray-500 font-medium">Phone</p>
                        <a 
                          href={`tel:${mobileSelectedLocation.phone}`}
                          className="text-blue-600 font-medium"
                        >
                          {mobileSelectedLocation.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* Email */}
                  {mobileSelectedLocation.email && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                        <FiMail className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm text-gray-500 font-medium">Email</p>
                        <a 
                          href={`mailto:${mobileSelectedLocation.email}`}
                          className="text-blue-600 font-medium break-all"
                        >
                          {mobileSelectedLocation.email}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* Website */}
                  {mobileSelectedLocation.website && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <FiGlobe className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm text-gray-500 font-medium">Website</p>
                        <a 
                          href={mobileSelectedLocation.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 font-medium break-all"
                        >
                          {mobileSelectedLocation.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* Today's Hours */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                      <FiClock className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm text-gray-500 font-medium">Today's Hours</p>
                      <p className="text-gray-900 font-semibold">
                        {getCurrentDayHours(mobileSelectedLocation)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Get Directions Button */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mobileSelectedLocation.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-transform"
                >
                  <FiNavigation className="w-5 h-5" />
                  Get Directions
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Memoize to prevent unnecessary re-renders when unrelated props change
export default memo(MapView, (prevProps, nextProps) => {
  // Only re-render if locations or mapZoomLevel actually changed
  return (
    prevProps.locations === nextProps.locations &&
    prevProps.mapZoomLevel === nextProps.mapZoomLevel
  );
});