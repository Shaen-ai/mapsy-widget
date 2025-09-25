import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Location } from '../types/location';

interface MapViewProps {
  locations: Location[];
  onMapLoad?: (map: google.maps.Map) => void;
  onMarkersLoad?: (markers: google.maps.Marker[]) => void;
  onMarkerClick?: (location: Location) => void;
  defaultZoom?: number;
}

const MapView: React.FC<MapViewProps> = ({
  locations,
  onMapLoad,
  onMarkersLoad,
  onMarkerClick,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    // HARDCODED GOOGLE MAPS API KEY - DO NOT CHANGE
    const GOOGLE_MAPS_API_KEY = 'AIzaSyAU-ogdEZffsjmKb6PH8WjlSRr-Fuw9ti8';

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
    });

    loader.load().then(() => {
      if (mapRef.current && !mapInstance.current) {
        // Initialize map
        mapInstance.current = new google.maps.Map(mapRef.current, {
          center: { lat: 40.7128, lng: -74.0060 },
          zoom: 12,
          mapTypeControl: false,
          fullscreenControl: true,
          streetViewControl: true,
        });

        // Initialize info window
        infoWindowRef.current = new google.maps.InfoWindow();

        if (onMapLoad) {
          onMapLoad(mapInstance.current);
        }
      }

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add markers for locations
      if (mapInstance.current && locations.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        const newMarkers: google.maps.Marker[] = [];

        locations.forEach((location) => {
          if (location.latitude && location.longitude) {
            const position = { lat: location.latitude, lng: location.longitude };

            const marker = new google.maps.Marker({
              position,
              map: mapInstance.current!,
              title: location.name,
              animation: google.maps.Animation.DROP,
            });

            // Add click listener to marker
            marker.addListener('click', () => {
              if (infoWindowRef.current && mapInstance.current) {
                const content = createInfoWindowContent(location);
                infoWindowRef.current.setContent(content);
                infoWindowRef.current.open(mapInstance.current, marker);
              }
              if (onMarkerClick) {
                onMarkerClick(location);
              }
            });

            newMarkers.push(marker);
            bounds.extend(position);
          }
        });

        markersRef.current = newMarkers;

        if (onMarkersLoad) {
          onMarkersLoad(newMarkers);
        }

        // Fit map to show all markers
        if (newMarkers.length > 0) {
          mapInstance.current.fitBounds(bounds);

          // Ensure zoom is not too close for single marker
          const listener = google.maps.event.addListener(mapInstance.current, 'idle', () => {
            if (mapInstance.current && mapInstance.current.getZoom() && mapInstance.current.getZoom()! > 16) {
              mapInstance.current.setZoom(16);
            }
            google.maps.event.removeListener(listener);
          });
        }
      }
    });

    return () => {
      // Cleanup markers on unmount
      markersRef.current.forEach(marker => marker.setMap(null));
    };
  }, [locations, onMapLoad, onMarkersLoad, onMarkerClick]);

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

  return <div ref={mapRef} className="w-full h-full" />;
};

export default MapView;