import { FiPhone, FiMail, FiGlobe, FiMapPin, FiClock, FiNavigation } from 'react-icons/fi';
import { Location } from '../types/location';

interface LocationListProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
  primaryColor?: string;
}

const LocationList: React.FC<LocationListProps> = ({
  locations,
  selectedLocation,
  onLocationSelect,
  primaryColor = '#3B82F6',
}) => {
  const getCurrentDayHours = (location: Location) => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = days[new Date().getDay()];
    return location.business_hours?.[today as keyof typeof location.business_hours] || 'Closed';
  };

  const isOpenNow = (location: Location) => {
    const hours = getCurrentDayHours(location);
    if (hours === 'Closed') return false;

    // Simple check - in production, you'd parse times properly
    return !hours.toLowerCase().includes('closed');
  };

  if (locations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No locations available at this time.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {locations.map((location) => (
        <div
          key={location.id}
          className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${
            selectedLocation?.id === location.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
          }`}
          onClick={() => onLocationSelect(location)}
        >
          <div className="flex gap-4">
            {location.image_url && (
              <img
                src={location.image_url}
                alt={location.name}
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
              />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{location.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                      {location.category}
                    </span>
                    {isOpenNow(location) ? (
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                        Open Now
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                        Closed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FiMapPin className="flex-shrink-0" size={14} />
                  <span className="truncate">{location.address}</span>
                </div>

                {location.phone && (
                  <div className="flex items-center gap-2">
                    <FiPhone className="flex-shrink-0" size={14} />
                    <a
                      href={`tel:${location.phone}`}
                      className="hover:underline"
                      style={{ color: primaryColor }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {location.phone}
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <FiClock className="flex-shrink-0" size={14} />
                  <span className="text-xs">Today: {getCurrentDayHours(location)}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                {location.email && (
                  <a
                    href={`mailto:${location.email}`}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    title="Send Email"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FiMail size={16} />
                  </a>
                )}

                {location.website && (
                  <a
                    href={location.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    title="Visit Website"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FiGlobe size={16} />
                  </a>
                )}
              </div>

              <div className="mt-3">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 text-white text-sm rounded-lg hover:opacity-90 transition"
                  style={{ backgroundColor: primaryColor }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <FiNavigation size={16} />
                  Get Directions
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LocationList;