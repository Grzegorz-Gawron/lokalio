import type { LatLng } from '../types';

/** Link do nawigacji w Google Maps (otwiera apkę na telefonie albo web), pieszo. */
export function directionsUrl(c: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}&travelmode=walking`;
}

/** Otwórz nawigację do punktu w Google Maps (nowa karta / aplikacja). */
export function openDirections(c: LatLng) {
  window.open(directionsUrl(c), '_blank', 'noopener,noreferrer');
}
