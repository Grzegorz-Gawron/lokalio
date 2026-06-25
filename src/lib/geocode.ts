import type { LatLng } from '../types';

// Geokodowanie adresu → współrzędne (Nominatim / OpenStreetMap).
// Darmowe, bez klucza, działa też lokalnie (w odróżnieniu od Mapboxa, który wymaga tokenu).
// Używane przy publikacji wydarzenia w „innej lokalizacji", żeby pinezka trafiała w konkretny punkt,
// a nie w środek miasta / współrzędne lokalu.

export interface GeoAddr {
  placeName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal?: string;
  country?: string;
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const TIMEOUT = 8000;

async function query(params: URLSearchParams): Promise<LatLng | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = json[0];
    if (!hit?.lat || !hit?.lon) return null;
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

// Zwraca współrzędne najlepszego trafienia albo null (pusty adres, brak wyniku, błąd sieci/timeout).
// Najpierw zapytanie strukturalne (ulica/miasto/kod) — najdokładniejsze; gdy spudłuje, fallback na tekst.
export async function geocodeAddr(a: GeoAddr): Promise<LatLng | null> {
  const street = (a.line1 || '').trim();
  const placeName = (a.placeName || '').trim();
  const city = (a.city || '').trim();
  const country = (a.country || 'Polska').trim();
  if (!street && !placeName) return null;

  const attempts: URLSearchParams[] = [];
  if (street) {
    const p = new URLSearchParams({ format: 'jsonv2', limit: '1', 'accept-language': 'pl', street, country });
    if (city) p.set('city', city);
    if ((a.postal || '').trim()) p.set('postalcode', (a.postal || '').trim());
    attempts.push(p);
  }
  const qText = [placeName, street, city, country].map((s) => s.trim()).filter(Boolean).join(', ');
  attempts.push(new URLSearchParams({ format: 'jsonv2', limit: '1', 'accept-language': 'pl', q: qText }));

  for (const params of attempts) {
    const hit = await query(params);
    if (hit) return hit;
  }
  return null;
}
