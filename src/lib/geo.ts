import type { LatLng } from '../types';

/** Odległość w km między dwoma punktami (haversine). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** "350 m" / "1,2 km" — format po polsku (przecinek). */
export function formatDistance(km: number): string {
  if (km < 1) {
    const m = Math.round(km * 1000);
    return `${m} m`;
  }
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/** Etykieta zasięgu: "100 m" / "1 km" / "2,5 km" (bez zbędnego ",0"). */
export function formatRadius(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1).replace('.', ',')} km`;
}

/** Przybliżony czas spacerem (~4,5 km/h). */
export function walkMinutes(km: number): number {
  return Math.max(1, Math.round((km / 4.5) * 60));
}
