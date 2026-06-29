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

// ---- geolokalizacja (wspólna dla onboardingu i „Zmień lokalizację") ----
export type GeoFail = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

/**
 * Pobiera pozycję użytkownika. Najpierw próba dokładna (GPS); gdy się przedawni
 * (częste w budynku), JEDNA szybka próba sieciowa — to wyraźnie podnosi skuteczność
 * na telefonie. Nie blokujemy na isSecureContext — gdy kontekst nie jest bezpieczny,
 * przeglądarka i tak zwróci błąd, który mapujemy na czytelny komunikat.
 */
export function requestPosition(onOk: (c: LatLng) => void, onFail: (reason: GeoFail) => void): void {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) { onFail('unsupported'); return; }
  const ok = (pos: GeolocationPosition) => onOk({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  const fail = (err: GeolocationPositionError, retried: boolean) => {
    if (err.code === err.TIMEOUT && !retried) {
      navigator.geolocation.getCurrentPosition(ok, (e) => fail(e, true), { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
      return;
    }
    onFail(err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.POSITION_UNAVAILABLE ? 'unavailable' : 'timeout');
  };
  navigator.geolocation.getCurrentPosition(ok, (e) => fail(e, false), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

/** Czytelny po polsku komunikat dla nieudanej geolokalizacji. */
export function geoFailMessage(reason: GeoFail): string {
  switch (reason) {
    case 'denied': return 'Brak zgody na lokalizację — włącz ją dla strony w ustawieniach przeglądarki';
    case 'unavailable': return 'Lokalizacja niedostępna — sprawdź, czy GPS jest włączony';
    case 'unsupported': return 'Przeglądarka nie wspiera lokalizacji';
    default: return 'Nie udało się pobrać lokalizacji — spróbuj ponownie';
  }
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

/**
 * Konfigurowalny promień wyszukiwania — JEDNO źródło prawdy dla mapy i feedu
 * (zastępuje dawny, nieużywany `filters.maxKm`). Cztery progi, domyślnie 15 km.
 */
export const RADIUS_STEPS = [5, 15, 30, 50] as const;
export type RadiusKm = (typeof RADIUS_STEPS)[number];
export const DEFAULT_RADIUS_KM: RadiusKm = 15;

/** Następny próg w cyklu 5→15→30→50→5 (szybki chip na mapie). */
export function nextRadius(km: number): RadiusKm {
  const i = RADIUS_STEPS.indexOf(km as RadiusKm);
  return RADIUS_STEPS[(i + 1) % RADIUS_STEPS.length];
}

/** Kolejny WIĘKSZY próg (auto-poszerzanie); zwraca null, gdy już maksymalny. */
export function widerRadius(km: number): RadiusKm | null {
  const i = RADIUS_STEPS.indexOf(km as RadiusKm);
  return i >= 0 && i < RADIUS_STEPS.length - 1 ? RADIUS_STEPS[i + 1] : null;
}

/** Sanityzacja zapisanej/legacy wartości do najbliższego dozwolonego progu. */
export function snapRadius(km: number): RadiusKm {
  return RADIUS_STEPS.reduce<RadiusKm>(
    (best, s) => (Math.abs(s - km) < Math.abs(best - km) ? s : best),
    DEFAULT_RADIUS_KM,
  );
}

/** Przybliżony czas spacerem (~4,5 km/h). */
export function walkMinutes(km: number): number {
  return Math.max(1, Math.round((km / 4.5) * 60));
}
