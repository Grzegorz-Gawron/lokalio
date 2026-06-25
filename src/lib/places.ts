import type { CategoryKey, EventItem, LatLng, Offer, Organizer, Venue } from '../types';
import type { LiveData } from '../data/seed';
import { CATEGORY_META } from '../theme';
import { APP_NOW } from './format';
import { haversineKm } from './geo';
import { hashId } from './photos';

// ============================================================
// Realne lokale z OpenStreetMap (Overpass API) + deterministyczna warstwa
// aktywności (oceny, meldunki, obserwujący, wydarzenia, promocje).
// Dane miejsc są prawdziwe; aktywność jest symulowana (stabilnie per id),
// dopóki nie pojawią się realni użytkownicy/organizatorzy.
// ============================================================

const RADIUS_M = 3000; // promień wyszukiwania wokół użytkownika (mniejszy = szybciej w gęstych miastach)
const MAX_VENUES = 60; // limit kafli/markerów dla płynności
const FETCH_TIMEOUT = 20000; // Overpass bywa wolny pod obciążeniem (zwł. duże miasta)
const CACHE_KEY = 'lokalio.places.v7'; // v7: Oferty Lokalio z typami dostępu (meldunek/obserwacja) + limity
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12h

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Gradienty per kategoria (jak w seedzie).
const CAT_GRAD: Record<CategoryKey, [string, string]> = {
  concert: ['#FF7A6E', '#FF5A4D'],
  culture: ['#9B7FBE', '#7A5C99'],
  party: ['#5A82C9', '#2D5DAA'],
  gastro: ['#F0A858', '#E0892B'],
  social: ['#B98A4E', '#8C5A1F'],
  sport: ['#5FC79B', '#3FAE83'],
};

interface OsmTags {
  [k: string]: string | undefined;
}
interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
}

/** Mapowanie tagów OSM → nasza kategoria (null = pomijamy). */
function osmCategory(t: OsmTags): CategoryKey | null {
  const a = t.amenity;
  const l = t.leisure;
  const to = t.tourism;
  const shop = t.shop;
  if (a === 'nightclub' || a === 'bar' || a === 'pub' || a === 'biergarten' || t.club === 'music') return 'party';
  if (a === 'restaurant' || a === 'cafe' || a === 'fast_food' || a === 'food_court' || a === 'ice_cream' || a === 'bbq' || shop === 'bakery' || shop === 'pastry' || shop === 'coffee') return 'gastro';
  if (a === 'theatre' || a === 'cinema' || a === 'arts_centre' || to === 'museum' || to === 'gallery') return 'culture';
  if (l === 'fitness_centre' || l === 'sports_centre' || l === 'stadium' || a === 'gym') return 'sport';
  if (a === 'community_centre' || a === 'social_centre' || a === 'social_facility') return 'social';
  if (a === 'events_venue' || a === 'conference_centre') return 'concert';
  return null;
}

function openUntilFor(cat: CategoryKey): string {
  switch (cat) {
    case 'party': return 'do 02:00';
    case 'gastro': return 'do 22:00';
    case 'culture': return 'do 18:00';
    case 'sport': return 'do 22:00';
    case 'social': return 'do 20:00';
    case 'concert': return 'do 23:00';
  }
}

function descFor(cat: CategoryKey, name: string): string {
  switch (cat) {
    case 'party': return `${name} — miejsce na wieczór: drinki, muzyka i dobre towarzystwo w okolicy.`;
    case 'gastro': return `${name} — lokalne miejsce na jedzenie i kawę. Sprawdź menu i zajrzyj na coś dobrego.`;
    case 'culture': return `${name} — kultura tuż obok: wystawy, spotkania i wydarzenia w Twojej okolicy.`;
    case 'sport': return `${name} — aktywnie w okolicy: treningi, zajęcia i sport dla każdego.`;
    case 'social': return `${name} — miejsce spotkań i lokalnych inicjatyw w sąsiedztwie.`;
    case 'concert': return `${name} — przestrzeń wydarzeń i koncertów w Twojej okolicy.`;
  }
}

const pick = <T,>(arr: T[], seed: string) => arr[hashId(seed) % arr.length];

function buildVenue(el: OsmElement, cat: CategoryKey, name: string, coords: LatLng): { venue: Venue; org: Organizer } {
  const id = `osm-${el.type[0]}${el.id}`;
  const meta = CATEGORY_META[cat];
  const t = el.tags ?? {};
  const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
  const district = t['addr:suburb'] || t['addr:city'] || t['addr:town'] || t['addr:place'] || 'Centrum';
  const rating = Math.round((3.8 + (hashId(id + 'r') % 12) / 10) * 10) / 10; // 3.8–4.9
  const reviews = 25 + (hashId(id + 'rev') % 600);
  const priceLevel = ((hashId(id + 'p') % 3) + 1) as 1 | 2 | 3;
  const span = cat === 'party' ? 50 : cat === 'gastro' ? 30 : 18;
  const base = 2 + (hashId(id + 'c') % span);
  const trend = (['up', 'up', 'flat', 'down'] as const)[hashId(id + 't') % 4];
  const peakHour = cat === 'party' ? 22 : cat === 'gastro' ? 18 : 17;
  // Rozkład wieku znormalizowany do 100%.
  const aw = [4 + (hashId(id + 'a') % 6), 4 + (hashId(id + 'b') % 5), 1 + (hashId(id + 'g') % 4)];
  const awSum = aw[0] + aw[1] + aw[2];
  const y18_25 = Math.round((aw[0] / awSum) * 100);
  const y26_35 = Math.round((aw[1] / awSum) * 100);
  const y36p = 100 - y18_25 - y26_35;

  const venue: Venue = {
    id,
    name,
    category: cat,
    tags: [meta.label],
    emoji: meta.emoji,
    color: meta.color,
    coords,
    address: street || district,
    district,
    rating,
    reviews,
    priceLevel,
    description: descFor(cat, name),
    organizerId: 'osm-org-' + id,
    openUntil: openUntilFor(cat),
    phone: t.phone || t['contact:phone'] || undefined,
    website: t.website || t['contact:website'] || undefined,
    menu: t.menu || t['website:menu'] || t['contact:menu'] || undefined,
    checkin: {
      base,
      trend,
      age: { y18_25, y26_35, y36p },
      gender: { k: 45 + (hashId(id + 'k') % 15), m: 0 },
      peak: `Najwięcej ludzi ok. ${peakHour}:00`,
    },
  };
  venue.checkin.gender.m = 100 - venue.checkin.gender.k;

  const org: Organizer = {
    id: 'osm-org-' + id,
    name,
    kind: 'lokal',
    emoji: meta.emoji,
    verified: false,
    followers: 40 + (hashId(id + 'f') % 900),
    bio: descFor(cat, name),
    categories: [cat],
  };
  return { venue, org };
}

function isoFor(dayOffset: number, hour: number, minute: number): string {
  const d = new Date(APP_NOW);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const EV_TITLES: Record<CategoryKey, string[]> = {
  concert: ['Koncert na żywo', 'Wieczór muzyczny', 'Scena otwarta'],
  party: ['Impreza', 'DJ set', 'Noc taneczna'],
  culture: ['Wystawa', 'Spotkanie autorskie', 'Wernisaż'],
  gastro: ['Degustacja', 'Wieczór kulinarny', 'Śniadanie tematyczne'],
  sport: ['Trening otwarty', 'Zajęcia grupowe', 'Turniej amatorski'],
  social: ['Spotkanie sąsiedzkie', 'Warsztaty', 'Klub dyskusyjny'],
};

function buildEvent(v: Venue, i: number): EventItem {
  const id = `osm-ev-${v.id}-${i}`;
  const cat = v.category;
  const dayOffset = hashId(id + 'd') % 10; // 0–9 dni od dziś
  const hour = [17, 18, 19, 20, 21][hashId(id + 'h') % 5];
  const minute = [0, 30][hashId(id + 'm') % 2];
  const free = hashId(id + 'free') % 2 === 0;
  const base = pick(EV_TITLES[cat], id + 'title');
  return {
    id,
    title: `${base} — ${v.name}`,
    category: cat,
    organizerId: v.organizerId!,
    venueId: v.id,
    place: v.address ? `${v.name}, ${v.address}` : v.name,
    coords: v.coords,
    dateIso: isoFor(dayOffset, hour, minute),
    free,
    priceLabel: free ? 'Wstęp wolny' : `od ${[20, 30, 40, 50][hashId(id + 'pr') % 4]} zł`,
    description: `${base} w ${v.name}. Szczegóły wkrótce — śledź lokal, by nic nie przegapić.`,
    emoji: CATEGORY_META[cat].emoji,
    gradient: CAT_GRAD[cat],
    tags: [CATEGORY_META[cat].label],
    source: 'lokal',
  };
}

const OF_DEALS: { label: string; title: string }[] = [
  { label: '-10%', title: '-10% na rachunek' },
  { label: '-15%', title: '-15% dla nowych gości' },
  { label: '-20%', title: '-20% w happy hours' },
  { label: '2 za 1', title: '2 za 1 na wybrane pozycje' },
  { label: 'Gratis', title: 'Mała kawa gratis' },
  { label: '19 zł', title: 'Zestaw dnia w cenie 19 zł' },
  { label: '25 zł', title: 'Lunch w cenie 25 zł' },
];

// Rodzaje Ofert Lokalio (dla kind 'bon') — rozkładane równomiernie po lokalach.
const LOK_ACCESS: { checkin?: boolean; follow?: boolean; term: string }[] = [
  { checkin: true, term: 'Za zameldowanie w lokalu' },
  { follow: true, term: 'Tylko dla obserwujących' },
  { checkin: true, follow: true, term: 'Za meldunek i dla obserwujących' },
  { term: 'Dostępna w aplikacji' },
];

function buildOffer(v: Venue): Offer {
  const id = `osm-of-${v.id}`;
  const deal = pick(OF_DEALS, id + 'deal');
  const isLokalio = hashId(id + 'k') % 5 < 2; // ~40% to Oferty Lokalio, reszta Promocje
  const acc = isLokalio ? LOK_ACCESS[hashId(id + 'acc') % LOK_ACCESS.length] : undefined;
  const limited = isLokalio && hashId(id + 'lim') % 3 === 0; // co ~3. oferta z limitem
  const qty = limited ? 30 + (hashId(id + 'q') % 70) : undefined;
  const terms: string[] = [];
  if (acc) terms.push(acc.term);
  terms.push('Tylko na miejscu');
  if (limited) terms.push('Limit 1 na osobę', `Pozostało ${qty} szt.`);
  return {
    id,
    venueId: v.id,
    kind: isLokalio ? 'bon' : 'promo',
    title: deal.title,
    subtitle: v.name,
    discountLabel: deal.label,
    description: `${deal.title} w ${v.name}.${acc ? '' : ' Pokaż ofertę na telefonie obsłudze, by skorzystać.'}`,
    terms,
    validLabel: pick(['Dziś', 'Dziś do 18:00', 'W ten weekend', '18.06–30.06'], id + 'valid'),
    activationMinutes: [15, 20, 30][hashId(id + 'am') % 3],
    ageMin: v.category === 'party' ? 18 : undefined,
    emoji: CATEGORY_META[v.category].emoji,
    color: v.color,
    requireCheckin: acc?.checkin || undefined,
    requireFollow: acc?.follow || undefined,
    quantity: qty,
    perPersonLimit: limited ? 1 : undefined,
  };
}

function generate(elements: OsmElement[], here: LatLng): LiveData {
  const seen = new Set<string>();
  const venues: Venue[] = [];
  const organizers: Record<string, Organizer> = {};

  const candidates = elements
    .map((el) => {
      const coords = el.lat != null && el.lon != null ? { lat: el.lat, lng: el.lon } : el.center ? { lat: el.center.lat, lng: el.center.lon } : null;
      const tags = el.tags ?? {};
      const name = tags.name;
      const cat = osmCategory(tags);
      if (!coords || !name || !cat) return null;
      return { el, coords, name, cat, d: haversineKm(here, coords) };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => a.d - b.d);

  for (const c of candidates) {
    if (venues.length >= MAX_VENUES) break;
    const key = `${c.name.toLowerCase()}|${c.coords.lat.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const { venue, org } = buildVenue(c.el, c.cat, c.name, c.coords);
    venues.push(venue);
    organizers[org.id] = org;
  }

  const events: EventItem[] = [];
  const offers: Offer[] = [];
  for (const v of venues) {
    // ~55% lokali ma wydarzenie; część ma drugie.
    if (hashId(v.id + 'ev') % 100 < 55) {
      events.push(buildEvent(v, 0));
      if (hashId(v.id + 'ev2') % 100 < 25) events.push(buildEvent(v, 1));
    }
    // ~40% lokali ma promocję/bon (gastronomia/imprezy/kultura/sport).
    if (['gastro', 'party', 'culture', 'sport'].includes(v.category) && hashId(v.id + 'of') % 100 < 40) {
      offers.push(buildOffer(v));
    }
  }

  return { venues, events, offers, organizers };
}

async function fetchOverpass(coords: LatLng): Promise<OsmElement[] | null> {
  const filters = [
    'nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream|bar|pub|biergarten|nightclub|theatre|cinema|arts_centre|community_centre|events_venue|conference_centre)$"]',
    'nwr["leisure"~"^(fitness_centre|sports_centre|stadium)$"]',
    'nwr["tourism"~"^(museum|gallery)$"]',
    'nwr["shop"~"^(bakery|pastry|coffee)$"]',
  ]
    .map((f) => `${f}(around:${RADIUS_M},${coords.lat},${coords.lng});`)
    .join('');
  const query = `[out:json][timeout:25];(${filters});out center 150;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = (await res.json()) as { elements?: OsmElement[] };
      if (json.elements && json.elements.length) return json.elements;
    } catch {
      /* spróbuj następny endpoint */
    }
  }
  return null;
}

interface CacheShape {
  key: string;
  ts: number;
  data: LiveData;
}

const coordKey = (c: LatLng) => `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`;

function readCache(key: string): LiveData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CacheShape;
    if (c.key === key && Date.now() - c.ts < CACHE_TTL && c.data?.venues?.length) return c.data;
  } catch {
    /* ignore */
  }
  return null;
}
function writeCache(key: string, data: LiveData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ key, ts: Date.now(), data } satisfies CacheShape));
  } catch {
    /* ignore */
  }
}

// Deduplikacja równoległych żądań dla tego samego obszaru (np. StrictMode w dev,
// kilka komponentów naraz) — jeden lot do Overpass zamiast wielu (anty-throttling).
const inflight = new Map<string, Promise<LiveData | null>>();

/**
 * Pobiera realne lokale wokół podanej lokalizacji i buduje pełny zestaw danych
 * (lokale + organizatorzy + wydarzenia + promocje). Zwraca null, gdy się nie uda
 * (wtedy aplikacja korzysta z seeda jako fallbacku).
 */
export async function loadLivePlaces(coords: LatLng): Promise<LiveData | null> {
  const key = coordKey(coords);
  const cached = readCache(key);
  if (cached) return cached;

  const existing = inflight.get(key);
  if (existing) return existing;

  const job = (async () => {
    const elements = await fetchOverpass(coords);
    if (!elements) return null;
    const data = generate(elements, coords);
    if (!data.venues.length) return null;
    writeCache(key, data);
    return data;
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}
