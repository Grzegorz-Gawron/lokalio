import type { LatLng } from '../types';

export interface DirectionsTarget {
  coords?: LatLng;
  /** Czytelny adres docelowy. Google geokoduje adres i trafia w konkretny punkt,
   *  zamiast „przyklejać" surowe współrzędne do najbliższego biznesu (np. innego lokalu). */
  address?: string;
}

/** Składa czytelny adres z części (pomija puste, łączy przecinkami). */
export function addressQuery(parts: (string | null | undefined)[]): string {
  return parts.map((p) => (p ?? '').trim()).filter(Boolean).join(', ');
}

/**
 * Link do nawigacji w Google Maps (apka na telefonie albo web).
 * Preferuje adres tekstowy — dokładniejsze trafienie niż surowe współrzędne
 * (te potrafią „przeskoczyć" na sąsiedni biznes). Bez wymuszania trybu podróży,
 * żeby Google nie pokazywał absurdalnych tras (np. „36 h pieszo" przy dużym dystansie).
 */
export function directionsUrl(target: LatLng | DirectionsTarget): string {
  const t: DirectionsTarget = 'lat' in target ? { coords: target } : target;
  const dest = t.address ? encodeURIComponent(t.address) : t.coords ? `${t.coords.lat},${t.coords.lng}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}

/** Otwórz nawigację do punktu w Google Maps (nowa karta / aplikacja). */
export function openDirections(target: LatLng | DirectionsTarget) {
  window.open(directionsUrl(target), '_blank', 'noopener,noreferrer');
}

// Minimalne kształty (bez importu pełnych typów) — wystarczą do złożenia adresu.
type VenueLike = { coords: LatLng; address?: string; addrLine2?: string; city?: string; region?: string };
type EventLike = { coords: LatLng; place?: string; addrLine1?: string; addrLine2?: string; city?: string; region?: string };

/** Adres lokalu do geokodowania: adres + miasto (fallback: currentCity). */
export function venueAddress(v: VenueLike, fallbackCity?: string): string {
  return addressQuery([v.address, v.addrLine2, v.city ?? fallbackCity, v.region]);
}

/** Adres wydarzenia: ulica lub nazwa miejsca + miasto (fallback: currentCity). */
export function eventAddress(e: EventLike, fallbackCity?: string): string {
  return addressQuery([e.addrLine1 || e.place, e.addrLine2, e.city ?? fallbackCity, e.region]);
}

/** Nawigacja do lokalu — adres lokalu + miasto, z fallbackiem do współrzędnych. */
export function openVenueDirections(v: VenueLike, fallbackCity?: string) {
  openDirections({ coords: v.coords, address: venueAddress(v, fallbackCity) });
}

/** Nawigacja do wydarzenia — ulica lub nazwa miejsca + miasto. */
export function openEventDirections(e: EventLike, fallbackCity?: string) {
  openDirections({ coords: e.coords, address: eventAddress(e, fallbackCity) });
}
