import { FiPhone, FiMail, FiGlobe, FiMapPin, FiClock, FiNavigation } from 'react-icons/fi';
import { Location } from '../types/location';

interface ListViewProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
  primaryColor?: string;
}

const ListView: React.FC<ListViewProps> = ({
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
    return !hours.toLowerCase().includes('closed');
  };

  if (locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          No locations available at this time.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div
              key={location._id || location.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                (selectedLocation?._id || selectedLocation?.id) === (location._id || location.id) ? 'ring-2' : ''
              }`}
              style={
                (selectedLocation?._id || selectedLocation?.id) === (location._id || location.id)
                  ? { borderColor: primaryColor, boxShadow: `0 0 0 2px ${primaryColor}` }
                  : {}
              }
              onClick={() => onLocationSelect(location)}
            >
              {location.image_url && (
                <div className="h-48 overflow-hidden">
                  <img
                    src={location.image_url}
                    alt={location.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {location.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                        {location.category}
                      </span>
                      {isOpenNow(location) ? (
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          Open Now
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          Closed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <FiMapPin className="flex-shrink-0 mt-0.5" size={16} />
                    <span>{location.address}</span>
                  </div>

                  {location.phone && (
                    <div className="flex items-center gap-2">
                      <FiPhone className="flex-shrink-0" size={16} />
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

                  {location.email && (
                    <div className="flex items-center gap-2">
                      <FiMail className="flex-shrink-0" size={16} />
                      <a
                        href={`mailto:${location.email}`}
                        className="hover:underline truncate"
                        style={{ color: primaryColor }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {location.email}
                      </a>
                    </div>
                  )}

                  {location.website && (
                    <div className="flex items-center gap-2">
                      <FiGlobe className="flex-shrink-0" size={16} />
                      <a
                        href={location.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate"
                        style={{ color: primaryColor }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Visit Website
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <FiClock className="flex-shrink-0" size={16} />
                    <span>Today: {getCurrentDayHours(location)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      location.address
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 text-white text-sm rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition"
                    style={{ backgroundColor: primaryColor }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FiNavigation size={16} />
                    Get Directions
                  </a>

                  {location.phone && (
                    <a
                      href={`tel:${location.phone}`}
                      className="flex-1 px-3 py-2 border text-gray-700 text-sm rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FiPhone size={16} />
                      Call
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListView;