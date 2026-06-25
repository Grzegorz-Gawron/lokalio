// ============================================================
// Lokalio — typy domenowe (prototyp web)
// ============================================================

export type CategoryKey =
  | 'concert'
  | 'sport'
  | 'culture'
  | 'social'
  | 'party'
  | 'gastro';

export interface LatLng {
  lat: number;
  lng: number;
}

export type Gender = 'k' | 'm' | 'inna';

export interface Organizer {
  id: string;
  name: string;
  kind: 'instytucja' | 'lokal';
  emoji: string;
  verified: boolean;
  followers: number;
  bio: string;
  categories: CategoryKey[];
  photo?: string; // własne zdjęcie główne (jeśli ustawione w panelu) — inaczej zdjęcie poglądowe wg kategorii
  address?: string; // dla instytucji (urzędy, muzea, centra kultury)
  hours?: OpeningHours[]; // godziny otwarcia siedziby (opcjonalne)
  phone?: string;
  website?: string;
}

/** Agregat meldowań — anonimowo (licznik + demografia). */
export interface CheckinAgg {
  base: number; // ile osób z Lokalio "teraz" w lokalu
  trend: 'up' | 'down' | 'flat';
  age: { y18_25: number; y26_35: number; y36p: number }; // % (suma ~100)
  gender: { k: number; m: number }; // %
  peak: string; // np. "Najwięcej ludzi ok. 21:00"
}

export interface Venue {
  id: string;
  name: string;
  category: CategoryKey;
  tags: string[];
  emoji: string;
  color: string; // akcent hex
  coords: LatLng;
  address: string;
  district: string;
  rating: number;
  reviews: number;
  priceLevel: 1 | 2 | 3;
  description: string;
  organizerId?: string;
  venueType?: string; // szczegółowy rodzaj lokalu (np. „Kawiarnia", „Escape room")
  addrPlaceName?: string; // nazwa biura/miejsca
  addrLine2?: string; // druga linia adresu
  city?: string; // miasto
  region?: string; // województwo / region
  postal?: string; // kod pocztowy
  country?: string; // kraj
  openUntil?: string; // "do 24:00"
  phone?: string; // numer kontaktowy (z OSM, jeśli jest)
  website?: string; // strona www (z OSM, jeśli jest)
  menu?: string; // link do menu (z OSM, jeśli jest)
  hours?: OpeningHours[]; // godziny otwarcia — różne bloki dni
  socials?: VenueSocials; // profile w mediach społecznościowych
  photo?: string; // główne zdjęcie ustawione przez właściciela
  gallery?: string[]; // galeria zdjęć lokalu
  checkin: CheckinAgg;
}

export interface OpeningHours { days: number[]; from: string; to: string; } // days: 0=Pn..6=Nd
export interface VenueSocials { facebook?: string; instagram?: string; twitter?: string; linkedin?: string; youtube?: string; tiktok?: string; }

/** Profil organizatora (zapisywany w ownerBusiness — organizator nie ma obiektu Venue). */
export interface OrgProfile {
  photo?: string; description?: string; phone?: string; website?: string;
  addrPlaceName?: string; address?: string; addrLine2?: string; city?: string; region?: string; postal?: string; country?: string;
  hasHours?: boolean; hours?: OpeningHours[]; socials?: VenueSocials; gallery?: string[];
}

// Skupienie mapy na konkretnej karuzeli z „Na dziś" — mapa pokazuje TYLKO te pozycje.
export interface MapFocus { title: string; items: { kind: 'event' | 'offer' | 'venue'; id: string }[]; }

export interface EventItem {
  id: string;
  title: string;
  category: CategoryKey;
  organizerId: string;
  venueId?: string;
  place: string;
  coords: LatLng;
  dateIso: string;
  endIso?: string;
  free: boolean;
  priceLabel: string;
  description: string;
  emoji: string;
  gradient: [string, string];
  tags: string[];
  promoted?: boolean;
  ageMin?: number;
  source: 'instytucja' | 'lokal';
  photo?: string; // własne zdjęcie dodane w panelu firmowym
  eventCategory?: string; // szczegółowa kategoria wydarzenia (np. „Transmisja sportowa")
  addrPlaceName?: string; // nazwa miejsca (np. „Sukiennice") — adres rozbity jak w lokalu
  addrLine1?: string; // ulica i numer
  addrLine2?: string; // druga linia adresu
  city?: string; // miasto
  region?: string; // województwo / region
  postal?: string; // kod pocztowy
  country?: string; // kraj
  eventUrl?: string; // link do strony wydarzenia
  ticketUrl?: string; // link do zakupu biletu
  seoTitle?: string; // SEO — tytuł w wynikach wyszukiwania / udostępnianiu
  seoDescription?: string; // SEO — opis
  seoKeywords?: string; // SEO — słowa kluczowe (po przecinku)
  seoIndex?: boolean; // SEO — zezwól wyszukiwarkom na indeksowanie (domyślnie true)
  ended?: boolean; // właściciel ręcznie zakończył wydarzenie — znika z aplikacji, trafia do „Zakończone"
}

export type OfferKind = 'promo' | 'bon';

/** Promocje i oferty Lokalio dodawane przez lokale. */
export interface Offer {
  id: string;
  venueId: string;
  kind: OfferKind;
  title: string;
  subtitle: string;
  discountLabel: string; // "-20%", "2 za 1"
  description: string;
  terms: string[];
  validLabel: string; // "Dziś do 18:00"
  activationMinutes: number; // odliczanie po aktywacji
  ageMin?: number;
  emoji: string;
  color: string;
  photo?: string; // własne zdjęcie dodane w panelu
  recurring?: boolean; // cykliczna (true) vs jednorazowa (false)
  days?: number[]; // dni tygodnia 0=Pn..6=Nd (dla cyklicznej)
  timeFrom?: string; // godzina od, np. "12:00"
  timeTo?: string; // godzina do, np. "16:00"
  promoCategory?: string; // kategoria (promocja lub bon)
  startDate?: string; // okres obowiązywania — od (YYYY-MM-DD)
  endDate?: string; // okres obowiązywania — do (YYYY-MM-DD)
  valueType?: 'percent' | 'amount' | 'price'; // oferta Lokalio — rabat procentowy / kwotowy / oferta cenowa
  value?: number; // bon — wartość rabatu (% lub zł)
  quantity?: number; // bon — limit pobrań (brak = bez limitu)
  perPersonLimit?: number; // bon — limit użyć na osobę (0 = bez limitu)
  requireCheckin?: boolean; // oferta Lokalio: wymaga zameldowania w lokalu
  requireFollow?: boolean; // oferta Lokalio: tylko dla obserwujących lokal
  ended?: boolean; // właściciel ręcznie zakończył ofertę — znika z aplikacji, trafia do „Zakończone"
}

export interface Friend {
  id: string;
  name: string;
  emoji: string;
  color: string;
  checkedInVenueId?: string;
  note?: string;
}

export type BadgeMetric =
  | 'checkins'
  | 'vouchers'
  | 'saves'
  | 'events'
  | 'follows';

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  goal: number;
  metric: BadgeMetric;
}

// ---- stan użytkownika / aplikacji ----

export interface ActiveVoucher {
  offerId: string;
  activatedAt: number; // ms epoch
  durationSec: number;
  code: string; // unikalny kod do okazania / skanowania przez obsługę
}

export interface LocationPreset {
  id: string;
  label: string;
  district: string;
  coords: LatLng;
}

export interface User {
  name: string;
  age: number;
  gender: Gender;
  avatar?: string; // wybrane emoji-awatar (fallback: emoji wg płci)
  district: string;
  coords: LatLng; // bieżąca lokalizacja (symulowana)
  preferredCategories: CategoryKey[];
  points: number;
  savedEventIds: string[];
  attendingEventIds: string[]; // „Wezmę udział" — deklaracja udziału w wydarzeniu
  savedVenueIds: string[];
  savedOfferIds: string[];
  followedOrganizerIds: string[];
  friendIds: string[];
  checkedInVenueId: string | null;
  checkedInAt: number | null;
  usesRealLocation: boolean;
}

// Element dodany przez właściciela lokalu w panelu (mock).
export interface OwnerDraft {
  kind: 'event' | 'offer';
  id: string;
}
