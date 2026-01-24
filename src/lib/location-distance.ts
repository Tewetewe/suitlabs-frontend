/**
 * Office location coordinates (Suitlabs Bali - Jimbaran)
 */
export const OFFICE_LOCATION = {
  latitude: -8.7877102,
  longitude: 115.2068142,
};

/**
 * Maximum acceptable distance from office in kilometers
 */
export const MAX_DISTANCE_KM = 0.1; // 100 meters

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if coordinates are within acceptable distance from office
 */
export function isWithinOfficeLocation(lat: number, lon: number): boolean {
  const distance = calculateDistance(
    OFFICE_LOCATION.latitude,
    OFFICE_LOCATION.longitude,
    lat,
    lon
  );
  return distance <= MAX_DISTANCE_KM;
}

/**
 * Get distance from office in kilometers
 */
export function getDistanceFromOffice(lat: number, lon: number): number {
  return calculateDistance(
    OFFICE_LOCATION.latitude,
    OFFICE_LOCATION.longitude,
    lat,
    lon
  );
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
