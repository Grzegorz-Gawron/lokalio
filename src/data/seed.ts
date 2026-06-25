import type {
  Badge,
  EventItem,
  Friend,
  LatLng,
  Offer,
  Organizer,
  User,
  Venue,
} from '../types';
import { cityById, cityIdOf, DEFAULT_CITY_ID } from './cities';

// ============================================================
// Organizatorzy — instytucje publiczne + lokale
// ============================================================

export const ORGANIZERS: Record<string, Organizer> = {
  icekrakow: {
    id: 'icekrakow',
    name: 'ICE Kraków',
    kind: 'instytucja',
    emoji: '🏛️',
    verified: true,
    followers: 4120,
    bio: 'Centrum Kongresowe ICE — koncerty, festiwale, wydarzenia kulturalne nad Wisłą.',
    categories: ['concert', 'culture'],
    address: 'Marii Konopnickiej 17, 30-302 Kraków',
    phone: '+48 12 295 95 00',
    website: 'icekrakow.pl',
  },
  'teatr-slowackiego': {
    id: 'teatr-slowackiego',
    name: 'Teatr im. J. Słowackiego',
    kind: 'instytucja',
    emoji: '🎭',
    verified: true,
    followers: 2890,
    bio: 'Zabytkowa scena w sercu Krakowa. Klasyka i współczesny repertuar.',
    categories: ['culture'],
  },
  'muzeum-narodowe': {
    id: 'muzeum-narodowe',
    name: 'Muzeum Narodowe w Krakowie',
    kind: 'instytucja',
    emoji: '🖼️',
    verified: true,
    followers: 5230,
    bio: 'Największe muzeum w Krakowie. Wystawy stałe i czasowe, Noc Muzeów.',
    categories: ['culture'],
    address: 'al. 3 Maja 1, 30-062 Kraków',
    phone: '+48 12 433 57 00',
    website: 'mnk.pl',
  },
  nck: {
    id: 'nck',
    name: 'Nowohuckie Centrum Kultury',
    kind: 'instytucja',
    emoji: '🎪',
    verified: true,
    followers: 1340,
    bio: 'Kultura w Nowej Hucie: warsztaty, wystawy, koncerty, zajęcia dla każdego.',
    categories: ['culture', 'social'],
  },
  umk: {
    id: 'umk',
    name: 'Urząd Miasta Krakowa',
    kind: 'instytucja',
    emoji: '🏛️',
    verified: true,
    followers: 8800,
    bio: 'Oficjalne wydarzenia miejskie: festiwale, święta, akcje plenerowe i społeczne.',
    categories: ['social', 'culture', 'sport'],
  },
  biblioteka: {
    id: 'biblioteka',
    name: 'Biblioteka Kraków',
    kind: 'instytucja',
    emoji: '📚',
    verified: true,
    followers: 970,
    bio: 'Spotkania autorskie, dyskusyjne kluby książki, warsztaty.',
    categories: ['culture', 'social'],
  },
  'tauron-arena': {
    id: 'tauron-arena',
    name: 'Tauron Arena Kraków',
    kind: 'instytucja',
    emoji: '🎤',
    verified: true,
    followers: 6400,
    bio: 'Największa hala widowiskowo-sportowa w Polsce. Koncerty i wielkie wydarzenia.',
    categories: ['concert', 'sport'],
  },
  // --- lokale (właściciele) ---
  'cafe-camelot': {
    id: 'cafe-camelot',
    name: 'Café Camelot',
    kind: 'lokal',
    emoji: '☕',
    verified: true,
    followers: 640,
    bio: 'Kultowa kawiarnia przy św. Tomasza. Szarlotka, kameralne koncerty, klimat.',
    categories: ['gastro', 'social'],
  },
  forum: {
    id: 'forum',
    name: 'Forum Przestrzenie',
    kind: 'lokal',
    emoji: '🛋️',
    verified: true,
    followers: 3100,
    bio: 'Kultowy hotel-modernizm nad Wisłą. Kawa w dzień, imprezy i potańcówki nocą.',
    categories: ['party', 'gastro', 'social'],
  },
  hevre: {
    id: 'hevre',
    name: 'Hevre',
    kind: 'lokal',
    emoji: '🕯️',
    verified: true,
    followers: 1980,
    bio: 'Dawny dom modlitwy na Kazimierzu, dziś bar i scena: koncerty, stand-up, DJ.',
    categories: ['party', 'gastro', 'social'],
  },
  massolit: {
    id: 'massolit',
    name: 'Massolit Books & Café',
    kind: 'lokal',
    emoji: '📖',
    verified: true,
    followers: 820,
    bio: 'Anglojęzyczna księgarnia z kawiarnią. Wieczory autorskie i najlepsze ciasta.',
    categories: ['gastro', 'culture', 'social'],
  },
  drukarnia: {
    id: 'drukarnia',
    name: 'Drukarnia',
    kind: 'lokal',
    emoji: '🎷',
    verified: true,
    followers: 1120,
    bio: 'Klubo-kawiarnia w Podgórzu. Jazz na żywo, vinyl nights, kameralne koncerty.',
    categories: ['party', 'concert'],
  },

  // ——— Sandomierz (instytucje + lokale) ———
  sck: { id: 'sck', name: 'Sandomierskie Centrum Kultury', kind: 'instytucja', emoji: '🎭', verified: true, followers: 1240, bio: 'Główny ośrodek kultury w Sandomierzu — koncerty, teatr, warsztaty, kino.', categories: ['concert', 'culture', 'social'], address: 'Rynek 25, 27-600 Sandomierz', phone: '+48 15 832 23 64', website: 'sck.sandomierz.pl' },
  'mosir-s': { id: 'mosir-s', name: 'MOSiR Sandomierz', kind: 'instytucja', emoji: '⚽', verified: true, followers: 520, bio: 'Miejski Ośrodek Sportu i Rekreacji — turnieje, biegi, zajęcia rekreacyjne.', categories: ['sport'], address: 'Patkowskiego 2, 27-600 Sandomierz', phone: '+48 15 832 28 88', website: 'mosir.sandomierz.pl' },
  'bazylika-s': { id: 'bazylika-s', name: 'Bazylika Katedralna', kind: 'instytucja', emoji: '⛪', verified: true, followers: 430, bio: 'Koncerty sakralne i klasyczne w gotyckiej katedrze.', categories: ['concert', 'culture'], address: 'Mariacka 1, 27-600 Sandomierz' },
  ums: { id: 'ums', name: 'Urząd Miasta Sandomierza', kind: 'instytucja', emoji: '🏛️', verified: true, followers: 1850, bio: 'Oficjalne wydarzenia miejskie: festiwale, święta, Dni Wina.', categories: ['social', 'culture'], address: 'Plac Poniatowskiego 3, 27-600 Sandomierz', phone: '+48 15 815 41 00', website: 'sandomierz.pl' },
  'zamek-s': { id: 'zamek-s', name: 'Muzeum Zamkowe', kind: 'instytucja', emoji: '🏰', verified: true, followers: 610, bio: 'Zamek Kazimierzowski — wystawy, historia, wydarzenia.', categories: ['culture'], address: 'Zamkowa 12, 27-600 Sandomierz', phone: '+48 15 644 57 57', website: 'zamek-sandomierz.pl' },
  'mala-czarna': { id: 'mala-czarna', name: 'Kawiarnia Mała Czarna', kind: 'lokal', emoji: '☕', verified: true, followers: 280, bio: 'Kameralna kawiarnia przy Rynku. Domowe ciasta, kawa, spotkania.', categories: ['gastro', 'social'] },
  'lapidarium-s': { id: 'lapidarium-s', name: 'Klub Lapidarium', kind: 'lokal', emoji: '💿', verified: true, followers: 340, bio: 'Klub w gotyckiej piwnicy przy Rynku — jazz, vinyl nights, koncerty.', categories: ['party', 'concert'] },
  'winiarnia-s': { id: 'winiarnia-s', name: 'Winiarnia Sandomierska', kind: 'lokal', emoji: '🍷', verified: true, followers: 410, bio: 'Lokalne wina z sandomierskich winnic, degustacje i tapas.', categories: ['gastro', 'party'] },
  trzydziestka: { id: 'trzydziestka', name: 'Restauracja Trzydziestka', kind: 'lokal', emoji: '🍽️', verified: true, followers: 390, bio: 'Kuchnia regionalna w sercu Starówki.', categories: ['gastro'] },

  // ——— okolice ———
  tdk: { id: 'tdk', name: 'Tarnobrzeski Dom Kultury', kind: 'instytucja', emoji: '🎪', verified: true, followers: 480, bio: 'Kultura w Tarnobrzegu — koncerty, wystawy, warsztaty.', categories: ['culture', 'concert', 'social'] },
  'mdk-sw': { id: 'mdk-sw', name: 'MDK Stalowa Wola', kind: 'instytucja', emoji: '🎭', verified: true, followers: 520, bio: 'Wydarzenia kulturalne i koncerty w Stalowej Woli.', categories: ['culture', 'concert'] },
  'opatow-um': { id: 'opatow-um', name: 'Urząd Miasta Opatów', kind: 'instytucja', emoji: '🏛️', verified: true, followers: 210, bio: 'Wydarzenia miejskie w Opatowie.', categories: ['social', 'culture'] },
};

// ============================================================
// Lokale (z agregatem meldowań — anonimowo)
// ============================================================

export const VENUES: Venue[] = [
  {
    id: 'cafe-camelot',
    name: 'Café Camelot',
    category: 'gastro',
    tags: ['Kawiarnia', 'Ciasta', 'Klimat'],
    emoji: '☕',
    color: '#E0892B',
    coords: { lat: 50.0637, lng: 19.9395 },
    address: 'św. Tomasza 17',
    district: 'Stare Miasto',
    rating: 4.7,
    reviews: 980,
    priceLevel: 2,
    description:
      'Kameralna, kultowa kawiarnia tuż przy Rynku. Słynie z szarlotki i sernika, a wieczorami bywają tu kameralne koncerty.',
    organizerId: 'cafe-camelot',
    venueType: 'Kawiarnia',
    openUntil: 'do 24:00',
    hours: [
      { days: [0, 1, 2, 3, 4], from: '09:00', to: '23:00' },
      { days: [5, 6], from: '10:00', to: '24:00' },
    ],
    socials: { facebook: 'CafeCamelotKrakow', instagram: 'cafecamelot' },
    checkin: { base: 12, trend: 'up', age: { y18_25: 35, y26_35: 45, y36p: 20 }, gender: { k: 62, m: 38 }, peak: 'Najwięcej ludzi ok. 17:00' },
  },
  {
    id: 'hummus-amamamia',
    name: 'Hummus Amamamia',
    category: 'gastro',
    tags: ['Bistro', 'Wege', 'Tanio'],
    emoji: '🧆',
    color: '#3FAE83',
    coords: { lat: 50.0521, lng: 19.9456 },
    address: 'Beera Meiselsa 4',
    district: 'Kazimierz',
    rating: 4.6,
    reviews: 1500,
    priceLevel: 1,
    description:
      'Mały lokal z najlepszym hummusem na Kazimierzu. Wege, świeżo, szybko i niedrogo.',
    organizerId: 'cafe-camelot',
    openUntil: 'do 22:00',
    checkin: { base: 9, trend: 'up', age: { y18_25: 55, y26_35: 35, y36p: 10 }, gender: { k: 58, m: 42 }, peak: 'Najwięcej ludzi ok. 13:00' },
  },
  {
    id: 'forum',
    name: 'Forum Przestrzenie',
    category: 'party',
    tags: ['Klub', 'Taras', 'Nad Wisłą'],
    emoji: '🛋️',
    color: '#2D5DAA',
    coords: { lat: 50.0467, lng: 19.9389 },
    address: 'Marii Konopnickiej 28',
    district: 'Podgórze',
    rating: 4.5,
    reviews: 3400,
    priceLevel: 2,
    description:
      'Modernistyczny hotel Forum zamieniony w przestrzeń kultury. Leżaki nad Wisłą w dzień, koncerty i potańcówki nocą.',
    organizerId: 'forum',
    venueType: 'Klub muzyczny',
    openUntil: 'do 02:00',
    hours: [
      { days: [0, 1, 2, 3], from: '12:00', to: '23:00' },
      { days: [4, 5], from: '12:00', to: '02:00' },
      { days: [6], from: '14:00', to: '02:00' },
    ],
    socials: { facebook: 'forumprzestrzenie', instagram: 'forum_przestrzenie', tiktok: 'forumprzestrzenie' },
    checkin: { base: 47, trend: 'up', age: { y18_25: 60, y26_35: 32, y36p: 8 }, gender: { k: 52, m: 48 }, peak: 'Najwięcej ludzi ok. 21:00' },
  },
  {
    id: 'hevre',
    name: 'Hevre',
    category: 'party',
    tags: ['Bar', 'Koncerty', 'Kazimierz'],
    emoji: '🕯️',
    color: '#2D5DAA',
    coords: { lat: 50.0515, lng: 19.9447 },
    address: 'Beera Meiselsa 18',
    district: 'Kazimierz',
    rating: 4.4,
    reviews: 2600,
    priceLevel: 2,
    description:
      'Dawny dom modlitwy z odsłoniętymi freskami, dziś jeden z najmodniejszych barów Kazimierza. Koncerty, stand-up i DJ-e.',
    organizerId: 'hevre',
    venueType: 'Bar',
    openUntil: 'do 01:00',
    hours: [
      { days: [0, 1, 2, 3, 4], from: '10:00', to: '01:00' },
      { days: [5, 6], from: '10:00', to: '03:00' },
    ],
    socials: { facebook: 'hevrekrakow', instagram: 'hevre_krakow', youtube: 'hevrekrakow' },
    checkin: { base: 33, trend: 'up', age: { y18_25: 58, y26_35: 34, y36p: 8 }, gender: { k: 49, m: 51 }, peak: 'Najwięcej ludzi ok. 22:00' },
  },
  {
    id: 'eszeweria',
    name: 'Eszeweria',
    category: 'party',
    tags: ['Bar', 'Ogród', 'Klimat'],
    emoji: '🍸',
    color: '#2D5DAA',
    coords: { lat: 50.0505, lng: 19.9461 },
    address: 'Józefa 9',
    district: 'Kazimierz',
    rating: 4.6,
    reviews: 1900,
    priceLevel: 2,
    description:
      'Bar w stylu vintage z magicznym ogródkiem. Świece, stare meble i jeden z najlepszych klimatów na Kazimierzu.',
    organizerId: 'hevre',
    openUntil: 'do 01:00',
    checkin: { base: 21, trend: 'flat', age: { y18_25: 50, y26_35: 40, y36p: 10 }, gender: { k: 55, m: 45 }, peak: 'Najwięcej ludzi ok. 22:00' },
  },
  {
    id: 'bal',
    name: 'BAL',
    category: 'gastro',
    tags: ['Bistro', 'Brunch', 'Zabłocie'],
    emoji: '🍲',
    color: '#E0892B',
    coords: { lat: 50.0444, lng: 19.9566 },
    address: 'Ślusarska 9',
    district: 'Zabłocie',
    rating: 4.6,
    reviews: 2100,
    priceLevel: 2,
    description:
      'Kultowe bistro w dawnej hali przemysłowej Zabłocia. Codziennie świeże menu, najlepszy brunch w okolicy.',
    organizerId: 'forum',
    openUntil: 'do 20:00',
    checkin: { base: 7, trend: 'down', age: { y18_25: 45, y26_35: 45, y36p: 10 }, gender: { k: 60, m: 40 }, peak: 'Najwięcej ludzi ok. 12:00' },
  },
  {
    id: 'massolit',
    name: 'Massolit Books & Café',
    category: 'gastro',
    tags: ['Kawiarnia', 'Księgarnia', 'Ciche'],
    emoji: '📖',
    color: '#7A5C99',
    coords: { lat: 50.0586, lng: 19.9268 },
    address: 'Felicjanek 4',
    district: 'Piasek',
    rating: 4.8,
    reviews: 1200,
    priceLevel: 2,
    description:
      'Labirynt półek z anglojęzycznymi książkami i kawiarnia z domowymi ciastami. Idealne na spokojne popołudnie.',
    organizerId: 'massolit',
    openUntil: 'do 19:00',
    checkin: { base: 5, trend: 'flat', age: { y18_25: 48, y26_35: 38, y36p: 14 }, gender: { k: 64, m: 36 }, peak: 'Najwięcej ludzi ok. 15:00' },
  },
  {
    id: 'drukarnia',
    name: 'Drukarnia',
    category: 'party',
    tags: ['Klubokawiarnia', 'Jazz', 'Podgórze'],
    emoji: '🎷',
    color: '#FF5A4D',
    coords: { lat: 50.0466, lng: 19.9531 },
    address: 'Nadwiślańska 1',
    district: 'Podgórze',
    rating: 4.5,
    reviews: 900,
    priceLevel: 2,
    description:
      'Klubokawiarnia z duszą w sercu Podgórza. Jazz na żywo, vinyl nights i kameralne koncerty.',
    organizerId: 'drukarnia',
    openUntil: 'do 02:00',
    checkin: { base: 14, trend: 'up', age: { y18_25: 40, y26_35: 45, y36p: 15 }, gender: { k: 50, m: 50 }, peak: 'Najwięcej ludzi ok. 21:00' },
  },
  {
    id: 'piekny-pies',
    name: 'Piękny Pies',
    category: 'party',
    tags: ['Bar', 'Do rana', 'Legenda'],
    emoji: '🐶',
    color: '#2D5DAA',
    coords: { lat: 50.0501, lng: 19.9447 },
    address: 'Bożego Ciała 9',
    district: 'Kazimierz',
    rating: 4.3,
    reviews: 1600,
    priceLevel: 2,
    description:
      'Legendarny, lekko szalony bar Kazimierza czynny do białego rana. Tu impreza nigdy nie chce się skończyć.',
    organizerId: 'hevre',
    openUntil: 'do 03:00',
    checkin: { base: 18, trend: 'up', age: { y18_25: 64, y26_35: 28, y36p: 8 }, gender: { k: 47, m: 53 }, peak: 'Najwięcej ludzi ok. 00:00' },
  },

  // ——— Sandomierz ———
  {
    id: 'mala-czarna', name: 'Kawiarnia Mała Czarna', category: 'gastro', tags: ['Kawiarnia', 'Ciasta', 'Rynek'], emoji: '☕', color: '#E0892B',
    coords: { lat: 50.6788, lng: 21.7495 }, address: 'Rynek 11', district: 'Stare Miasto', rating: 4.7, reviews: 420, priceLevel: 2,
    description: 'Kameralna kawiarnia przy sandomierskim Rynku. Najlepsza szarlotka w mieście i kawa specialty.',
    organizerId: 'mala-czarna', openUntil: 'do 21:00',
    checkin: { base: 6, trend: 'up', age: { y18_25: 40, y26_35: 42, y36p: 18 }, gender: { k: 64, m: 36 }, peak: 'Najwięcej ludzi ok. 16:00' },
  },
  {
    id: 'lapidarium-s', name: 'Klub Lapidarium', category: 'party', tags: ['Klub', 'Jazz', 'Piwnica'], emoji: '💿', color: '#2D5DAA',
    coords: { lat: 50.6772, lng: 21.7485 }, address: 'ul. Zamkowa 8', district: 'Stare Miasto', rating: 4.5, reviews: 380, priceLevel: 2,
    description: 'Klub muzyczny w gotyckiej piwnicy przy Rynku. Jazz, funk, vinyl nights i kameralne koncerty.',
    organizerId: 'lapidarium-s', openUntil: 'do 02:00',
    checkin: { base: 15, trend: 'up', age: { y18_25: 55, y26_35: 35, y36p: 10 }, gender: { k: 50, m: 50 }, peak: 'Najwięcej ludzi ok. 22:00' },
  },
  {
    id: 'winiarnia-s', name: 'Winiarnia Sandomierska', category: 'gastro', tags: ['Wino', 'Degustacje', 'Taras'], emoji: '🍷', color: '#7A5C99',
    coords: { lat: 50.6791, lng: 21.75 }, address: 'Rynek 25', district: 'Stare Miasto', rating: 4.8, reviews: 560, priceLevel: 2,
    description: 'Wina z sandomierskich winnic, deska serów i widok na Rynek. Region słynie z winiarstwa.',
    organizerId: 'winiarnia-s', openUntil: 'do 23:00',
    checkin: { base: 11, trend: 'flat', age: { y18_25: 30, y26_35: 45, y36p: 25 }, gender: { k: 58, m: 42 }, peak: 'Najwięcej ludzi ok. 19:00' },
  },
  {
    id: 'trzydziestka', name: 'Restauracja Trzydziestka', category: 'gastro', tags: ['Restauracja', 'Regionalna', 'Obiady'], emoji: '🍽️', color: '#3FAE83',
    coords: { lat: 50.6795, lng: 21.7488 }, address: 'ul. Mariacka 1', district: 'Stare Miasto', rating: 4.6, reviews: 730, priceLevel: 2,
    description: 'Kuchnia regionalna i sezonowe menu w sercu Starówki.',
    organizerId: 'trzydziestka', openUntil: 'do 22:00',
    checkin: { base: 9, trend: 'down', age: { y18_25: 25, y26_35: 40, y36p: 35 }, gender: { k: 55, m: 45 }, peak: 'Najwięcej ludzi ok. 14:00' },
  },

  // ——— okolice ———
  {
    id: 'cafe-wisla', name: 'Cafe Wisła', category: 'gastro', tags: ['Kawiarnia', 'Nad jeziorem'], emoji: '☕', color: '#E0892B',
    coords: { lat: 50.5733, lng: 21.68 }, address: 'Rynek 4', district: 'Centrum', rating: 4.4, reviews: 210, priceLevel: 1,
    description: 'Kawiarnia w centrum Tarnobrzega, blisko Jeziora Tarnobrzeskiego.',
    organizerId: 'tdk', openUntil: 'do 20:00',
    checkin: { base: 4, trend: 'flat', age: { y18_25: 45, y26_35: 40, y36p: 15 }, gender: { k: 60, m: 40 }, peak: 'Najwięcej ludzi ok. 15:00' },
  },
  {
    id: 'pub-centrum-sw', name: 'Pub Centrum', category: 'party', tags: ['Pub', 'Koncerty'], emoji: '🍺', color: '#2D5DAA',
    coords: { lat: 50.5828, lng: 22.0535 }, address: 'ul. Okulickiego 5', district: 'Śródmieście', rating: 4.3, reviews: 300, priceLevel: 1,
    description: 'Popularny pub w Stalowej Woli — piwo rzemieślnicze i koncerty.',
    organizerId: 'mdk-sw', openUntil: 'do 01:00',
    checkin: { base: 8, trend: 'up', age: { y18_25: 60, y26_35: 30, y36p: 10 }, gender: { k: 45, m: 55 }, peak: 'Najwięcej ludzi ok. 22:00' },
  },
];

// ============================================================
// Wydarzenia
// ============================================================

const G = {
  coral: ['#FF7A6E', '#FF5A4D'] as [string, string],
  violet: ['#9B7FBE', '#7A5C99'] as [string, string],
  blue: ['#5A82C9', '#2D5DAA'] as [string, string],
  green: ['#5FC79B', '#3FAE83'] as [string, string],
  amber: ['#F0A858', '#E0892B'] as [string, string],
  brown: ['#B98A4E', '#8C5A1F'] as [string, string],
};

export const EVENTS: EventItem[] = [
  {
    id: 'e1',
    title: 'Jazz w ICE: Kwartet Możdżera',
    category: 'concert',
    organizerId: 'icekrakow',
    place: 'ICE Kraków, Sala Audytoryjna',
    coords: { lat: 50.0473, lng: 19.9377 },
    dateIso: '2026-06-01T19:30',
    free: false,
    priceLabel: 'od 79 zł',
    description:
      'Wieczór z polskim jazzem najwyższej próby. Kwartet zagra autorski materiał oraz standardy w nowych aranżacjach.',
    emoji: '🎷',
    gradient: G.coral,
    tags: ['Jazz', 'Na żywo'],
    promoted: true,
    source: 'instytucja',
  },
  {
    id: 'e2',
    title: 'Noc Muzeów: Sukiennice po zmroku',
    category: 'culture',
    organizerId: 'muzeum-narodowe',
    place: 'Sukiennice, Rynek Główny',
    coords: { lat: 50.0617, lng: 19.937 },
    dateIso: '2026-06-01T18:00',
    endIso: '2026-06-01T23:00',
    free: true,
    priceLabel: 'Wstęp wolny',
    description:
      'Galeria Sztuki Polskiej XIX wieku otwiera się wieczorem. Oprowadzania kuratorskie, muzyka na żywo i wyjątkowy klimat.',
    emoji: '🌙',
    gradient: G.violet,
    tags: ['Plener', 'Dla rodzin', 'Za darmo'],
    source: 'instytucja',
  },
  {
    id: 'e3',
    title: 'Wieczór autorski w Massolit',
    category: 'social',
    organizerId: 'massolit',
    venueId: 'massolit',
    place: 'Massolit Books & Café',
    coords: { lat: 50.0586, lng: 19.9268 },
    dateIso: '2026-06-01T19:00',
    free: true,
    priceLabel: 'Wstęp wolny',
    description:
      'Kameralne spotkanie z autorką debiutanckiej powieści. Czytanie fragmentów, rozmowa i pytania przy kawie.',
    emoji: '📖',
    gradient: G.brown,
    tags: ['Spotkanie', 'Kameralnie'],
    source: 'lokal',
  },
  {
    id: 'e4',
    title: 'Silent Disco na Forum',
    category: 'party',
    organizerId: 'forum',
    venueId: 'forum',
    place: 'Forum Przestrzenie, taras',
    coords: { lat: 50.0467, lng: 19.9389 },
    dateIso: '2026-06-02T21:00',
    free: false,
    priceLabel: '30 zł',
    description:
      'Trzy kanały muzyczne, słuchawki w cenie i widok na Wisłę. House, retro 80/90 i polskie hity do wyboru.',
    emoji: '🎧',
    gradient: G.blue,
    tags: ['Plener', '18+', 'Taniec'],
    promoted: true,
    ageMin: 18,
    source: 'lokal',
  },
  {
    id: 'e5',
    title: 'Wystawa: Wyspiański. Nieznany',
    category: 'culture',
    organizerId: 'muzeum-narodowe',
    place: 'Gmach Główny MNK',
    coords: { lat: 50.0596, lng: 19.9237 },
    dateIso: '2026-06-02T10:00',
    free: false,
    priceLabel: '25 zł',
    description:
      'Rzadko pokazywane szkice i pastele Stanisława Wyspiańskiego. Wystawa czasowa czynna do końca czerwca.',
    emoji: '🖼️',
    gradient: G.violet,
    tags: ['Wystawa'],
    source: 'instytucja',
  },
  {
    id: 'e6',
    title: 'Stand-up Open Mic',
    category: 'social',
    organizerId: 'hevre',
    venueId: 'hevre',
    place: 'Hevre, Kazimierz',
    coords: { lat: 50.0515, lng: 19.9447 },
    dateIso: '2026-06-03T20:00',
    free: false,
    priceLabel: '20 zł',
    description:
      'Otwarta scena komediowa. Sprawdzeni komicy i debiutanci testujący świeże żarty. Możesz też zapisać się na scenę!',
    emoji: '🎤',
    gradient: G.brown,
    tags: ['Komedia', '16+'],
    ageMin: 16,
    source: 'lokal',
  },
  {
    id: 'e7',
    title: 'Koncert: Daria Zawiałow',
    category: 'concert',
    organizerId: 'tauron-arena',
    place: 'Tauron Arena Kraków',
    coords: { lat: 50.0676, lng: 20.0086 },
    dateIso: '2026-06-05T20:00',
    free: false,
    priceLabel: 'od 119 zł',
    description:
      'Największa trasa w karierze artystki. Nowy materiał, największe przeboje i pełna oprawa sceniczna.',
    emoji: '🎸',
    gradient: G.coral,
    tags: ['Koncert', 'Na żywo'],
    promoted: true,
    source: 'instytucja',
  },
  {
    id: 'e8',
    title: 'Targi Śniadaniowe na Wolnicy',
    category: 'gastro',
    organizerId: 'umk',
    place: 'Plac Wolnica, Kazimierz',
    coords: { lat: 50.0505, lng: 19.9437 },
    dateIso: '2026-06-07T10:00',
    endIso: '2026-06-07T15:00',
    free: true,
    priceLabel: 'Wstęp wolny',
    description:
      'Lokalni producenci, food trucki, kawa specialty i muzyka. Najlepszy niedzielny brunch pod chmurką.',
    emoji: '🥐',
    gradient: G.amber,
    tags: ['Jedzenie', 'Dla rodzin', 'Plener'],
    source: 'instytucja',
  },
  {
    id: 'e9',
    title: 'Wesele — spektakl',
    category: 'culture',
    organizerId: 'teatr-slowackiego',
    place: 'Teatr im. J. Słowackiego',
    coords: { lat: 50.0654, lng: 19.9437 },
    dateIso: '2026-06-06T19:00',
    free: false,
    priceLabel: 'od 45 zł',
    description:
      'Najsłynniejszy polski dramat na zabytkowej scenie. Nowa, brawurowa inscenizacja klasyki Wyspiańskiego.',
    emoji: '🎭',
    gradient: G.violet,
    tags: ['Teatr', 'Klasyka'],
    source: 'instytucja',
  },
  {
    id: 'e10',
    title: 'Poranna joga w Parku Jordana',
    category: 'sport',
    organizerId: 'umk',
    place: 'Park Jordana',
    coords: { lat: 50.061, lng: 19.913 },
    dateIso: '2026-06-03T08:00',
    free: true,
    priceLabel: 'Wstęp wolny',
    description:
      'Otwarte zajęcia jogi na trawie dla każdego poziomu. Zabierz matę i dobry humor. W razie deszczu — odwołane.',
    emoji: '🧘',
    gradient: G.green,
    tags: ['Sport', 'Plener', 'Poranek'],
    source: 'instytucja',
  },
  {
    id: 'e11',
    title: 'Vinyl Night: Soul & Funk',
    category: 'party',
    organizerId: 'drukarnia',
    venueId: 'drukarnia',
    place: 'Drukarnia, Podgórze',
    coords: { lat: 50.0466, lng: 19.9531 },
    dateIso: '2026-06-06T20:00',
    free: false,
    priceLabel: '15 zł',
    description:
      'DJ set wyłącznie z analogowych płyt — soul, funk i rzadkie groove’y. Bar czynny do późna.',
    emoji: '💿',
    gradient: G.coral,
    tags: ['Vinyl', '18+'],
    ageMin: 18,
    source: 'lokal',
  },
  {
    id: 'e12',
    title: 'Warsztaty ceramiki dla każdego',
    category: 'social',
    organizerId: 'nck',
    place: 'Nowohuckie Centrum Kultury',
    coords: { lat: 50.047, lng: 20.036 },
    dateIso: '2026-06-08T17:00',
    free: false,
    priceLabel: '60 zł',
    description:
      'Toczenie na kole garncarskim pod okiem instruktora. Materiały w cenie, gotową pracę odbierzesz po wypale.',
    emoji: '🏺',
    gradient: G.brown,
    tags: ['Warsztaty', 'Nowa Huta'],
    source: 'instytucja',
  },

  // ——— Sandomierz ———
  {
    id: 's1', title: 'Jazz na Starówce', category: 'concert', organizerId: 'sck', place: 'Rynek, Sandomierz',
    coords: { lat: 50.6789, lng: 21.7497 }, dateIso: '2026-06-01T19:00', free: true, priceLabel: 'Wstęp wolny',
    description: 'Wieczór z muzyką jazzową na sandomierskim Rynku. Lokalny kwartet i standardy pod gołym niebem.',
    emoji: '🎷', gradient: G.coral, tags: ['Jazz', 'Plener'], promoted: true, source: 'instytucja',
  },
  {
    id: 's2', title: 'Wystawa: Sandomierz w obiektywie', category: 'culture', organizerId: 'zamek-s', place: 'Muzeum Zamkowe',
    coords: { lat: 50.6766, lng: 21.748 }, dateIso: '2026-06-02T10:00', free: false, priceLabel: '10 zł',
    description: 'Fotografia lokalnych autorów — Sandomierz w czterech porach roku.',
    emoji: '📷', gradient: G.violet, tags: ['Wystawa', 'Fotografia'], source: 'instytucja',
  },
  {
    id: 's3', title: 'Wieczór autorski w Małej Czarnej', category: 'social', organizerId: 'mala-czarna', venueId: 'mala-czarna', place: 'Kawiarnia Mała Czarna',
    coords: { lat: 50.6788, lng: 21.7495 }, dateIso: '2026-06-01T18:00', free: true, priceLabel: 'Wstęp wolny',
    description: 'Spotkanie z lokalną autorką przy kawie i szarlotce. Czytanie fragmentów i rozmowa.',
    emoji: '📖', gradient: G.brown, tags: ['Spotkanie', 'Kameralnie'], source: 'lokal',
  },
  {
    id: 's4', title: 'Silent Disco nad Wisłą', category: 'party', organizerId: 'sck', place: 'Bulwar Piłsudskiego',
    coords: { lat: 50.6752, lng: 21.7531 }, dateIso: '2026-06-02T21:00', free: false, priceLabel: '35 zł',
    description: 'Trzy kanały muzyczne i słuchawki w cenie, z widokiem na Wisłę i sandomierski zamek.',
    emoji: '🎧', gradient: G.blue, tags: ['Plener', '18+'], promoted: true, ageMin: 18, source: 'instytucja',
  },
  {
    id: 's5', title: 'Koncert chóru w Bazylice', category: 'concert', organizerId: 'bazylika-s', place: 'Bazylika Katedralna',
    coords: { lat: 50.6797, lng: 21.7486 }, dateIso: '2026-06-03T19:30', free: true, priceLabel: 'Wstęp wolny',
    description: 'Repertuar sakralny i klasyczny w gotyckiej katedrze.', emoji: '⛪', gradient: G.violet, tags: ['Sakralny', 'Klasyka'], source: 'instytucja',
  },
  {
    id: 's6', title: 'Dni Wina — degustacje', category: 'gastro', organizerId: 'ums', place: 'Rynek, Sandomierz',
    coords: { lat: 50.679, lng: 21.7499 }, dateIso: '2026-06-06T12:00', endIso: '2026-06-06T20:00', free: true, priceLabel: 'Wstęp wolny',
    description: 'Sandomierskie winnice prezentują swoje wina. Degustacje, food trucki i muzyka na żywo.',
    emoji: '🍇', gradient: G.amber, tags: ['Wino', 'Plener'], source: 'instytucja',
  },
  {
    id: 's7', title: 'Bieg Wschód Słońca', category: 'sport', organizerId: 'mosir-s', place: 'Park Piszczele',
    coords: { lat: 50.684, lng: 21.744 }, dateIso: '2026-06-07T05:30', free: false, priceLabel: '25 zł',
    description: '5 km krajobrazowo o wschodzie słońca. Pakiet startowy: koszulka, medal, woda.',
    emoji: '🌅', gradient: G.green, tags: ['5 km', 'Poranek'], source: 'instytucja',
  },
  {
    id: 's8', title: 'Vinyl Night w Lapidarium', category: 'party', organizerId: 'lapidarium-s', venueId: 'lapidarium-s', place: 'Klub Lapidarium',
    coords: { lat: 50.6772, lng: 21.7485 }, dateIso: '2026-06-05T20:00', free: false, priceLabel: '20 zł',
    description: 'DJ set z analogowych płyt — funk, soul, jazz. Bar do późna.', emoji: '💿', gradient: G.coral, tags: ['Vinyl', '18+'], ageMin: 18, source: 'lokal',
  },
  {
    id: 's9', title: 'Targi rzemiosła sandomierskiego', category: 'social', organizerId: 'ums', place: 'Rynek, Sandomierz',
    coords: { lat: 50.6787, lng: 21.7494 }, dateIso: '2026-06-07T11:00', free: true, priceLabel: 'Wstęp wolny',
    description: 'Stoiska lokalnych rzemieślników: ceramika, miody, wyroby ze skóry. Warsztaty dla dzieci.',
    emoji: '🧺', gradient: G.brown, tags: ['Plener', 'Dla rodzin'], source: 'instytucja',
  },

  // ——— okolice ———
  {
    id: 't1', title: 'Koncert nad Jeziorem', category: 'concert', organizerId: 'tdk', place: 'Jezioro Tarnobrzeskie',
    coords: { lat: 50.5519, lng: 21.6586 }, dateIso: '2026-06-06T19:00', free: true, priceLabel: 'Wstęp wolny',
    description: 'Letni koncert plenerowy nad Jeziorem Tarnobrzeskim.', emoji: '🎤', gradient: G.coral, tags: ['Plener'], promoted: true, source: 'instytucja',
  },
  {
    id: 'sw1', title: 'Spektakl w MDK', category: 'culture', organizerId: 'mdk-sw', place: 'MDK Stalowa Wola',
    coords: { lat: 50.5826, lng: 22.0533 }, dateIso: '2026-06-05T18:00', free: false, priceLabel: 'od 30 zł',
    description: 'Gościnny spektakl teatralny w Miejskim Domu Kultury.', emoji: '🎭', gradient: G.violet, tags: ['Teatr'], source: 'instytucja',
  },
  {
    id: 'o1', title: 'Jarmark Opatowski', category: 'social', organizerId: 'opatow-um', place: 'Rynek, Opatów',
    coords: { lat: 50.7997, lng: 21.4253 }, dateIso: '2026-06-07T10:00', free: true, priceLabel: 'Wstęp wolny',
    description: 'Tradycyjny jarmark z lokalnymi produktami i muzyką.', emoji: '🛍️', gradient: G.amber, tags: ['Plener', 'Dla rodzin'], source: 'instytucja',
  },
];

// Przesuwamy daty przykładowych wydarzeń tak, by zaczynały się „od dziś" (zachowując
// odstępy między nimi). Dzięki temu fallback (gdy OSM jest niedostępny) nigdy nie wygląda
// na pusty — „Dzieje się teraz" i filtry dat mają treść względem realnego dnia.
(function reanchorSeedEvents() {
  const dayMs = 86400000;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = startOf(new Date());
  const minStart = Math.min(...EVENTS.map((e) => startOf(new Date(e.dateIso))));
  const shiftDays = Math.round((todayStart - minStart) / dayMs);
  if (!shiftDays) return;
  const shiftIso = (iso: string) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + shiftDays);
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  for (const e of EVENTS) {
    e.dateIso = shiftIso(e.dateIso);
    if (e.endIso) e.endIso = shiftIso(e.endIso);
  }
})();

// ============================================================
// Promocje i bony (dodawane przez lokale)
// ============================================================

export const OFFERS: Offer[] = [
  {
    id: 'o1',
    venueId: 'cafe-camelot',
    kind: 'promo',
    title: '-20% na ciasta',
    subtitle: 'Café Camelot',
    discountLabel: '-20%',
    description: 'Cała witryna ciast taniejsza o 20%. Idealny moment na kultową szarlotkę.',
    terms: ['Tylko na miejscu', 'Nie łączy się z innymi promocjami'],
    validLabel: 'Dziś do 18:00',
    activationMinutes: 15,
    emoji: '🍰',
    color: '#E0892B',
  },
  {
    id: 'o2',
    venueId: 'hummus-amamamia',
    kind: 'bon',
    title: 'Falafel gratis do hummusu',
    subtitle: 'Hummus Amamamia',
    discountLabel: 'Gratis',
    description: 'Do każdej porcji hummusu dorzucamy 3 świeże falafle. Wege i pyszne.',
    terms: ['Za zameldowanie w lokalu', '1 raz na osobę', 'Przy zamówieniu hummusu'],
    validLabel: '18.06–30.06',
    activationMinutes: 20,
    emoji: '🧆',
    color: '#3FAE83',
    requireCheckin: true,
    perPersonLimit: 1,
  },
  {
    id: 'o3',
    venueId: 'forum',
    kind: 'promo',
    title: 'Happy hours -30% na koktajle',
    subtitle: 'Forum Przestrzenie',
    discountLabel: '-30%',
    description: 'Wszystkie koktajle z karty taniej o 30% w godzinach happy hours.',
    terms: ['Tylko 18+', 'Codziennie 18:00–20:00'],
    validLabel: 'Codziennie 18–20',
    activationMinutes: 30,
    ageMin: 18,
    emoji: '🍹',
    color: '#2D5DAA',
  },
  {
    id: 'o4',
    venueId: 'hevre',
    kind: 'promo',
    title: 'Drugie piwo gratis',
    subtitle: 'Hevre',
    discountLabel: '2 za 1',
    description: 'Zamów piwo rzemieślnicze, a drugie tej samej marki dostajesz gratis.',
    terms: ['Tylko 18+', 'Pon–Czw', '1 raz na osobę'],
    validLabel: 'Pon–Czw',
    activationMinutes: 20,
    ageMin: 18,
    emoji: '🍺',
    color: '#2D5DAA',
  },
  {
    id: 'o5',
    venueId: 'eszeweria',
    kind: 'bon',
    title: 'Domowa nalewka na powitanie',
    subtitle: 'Eszeweria',
    discountLabel: 'Gratis',
    description: 'Odbierz kieliszek autorskiej nalewki — oferta tylko dla obserwujących lokal.',
    terms: ['Tylko dla obserwujących', 'Tylko 18+', '1 raz na osobę'],
    validLabel: 'Po 18:00',
    activationMinutes: 25,
    ageMin: 18,
    emoji: '🥃',
    color: '#2D5DAA',
    requireFollow: true,
    perPersonLimit: 1,
  },
  {
    id: 'o6',
    venueId: 'bal',
    kind: 'promo',
    title: 'Lunch -15% (zupa + danie)',
    subtitle: 'BAL',
    discountLabel: '-15%',
    description: 'Zestaw lunchowy: zupa dnia i danie główne taniej o 15%.',
    terms: ['Pn–Pt 12:00–16:00'],
    validLabel: 'Pn–Pt 12–16',
    activationMinutes: 30,
    emoji: '🍲',
    color: '#E0892B',
  },
  {
    id: 'o7',
    venueId: 'massolit',
    kind: 'bon',
    title: 'Kawa do książki gratis',
    subtitle: 'Massolit Books & Café',
    discountLabel: 'Gratis kawa',
    description: 'Kup dowolną książkę i odbierz kawę z ekspresu gratis. Oferta dostępna w aplikacji.',
    terms: ['Dostępna w aplikacji', 'Przy zakupie książki', '1 raz na osobę'],
    validLabel: 'Cały dzień',
    activationMinutes: 20,
    emoji: '☕',
    color: '#7A5C99',
    perPersonLimit: 1,
  },
  {
    id: 'o8',
    venueId: 'piekny-pies',
    kind: 'bon',
    title: 'Powitalny shot',
    subtitle: 'Piękny Pies',
    discountLabel: 'Gratis',
    description: 'Odbierz powitalny shot — dla obserwujących, po zameldowaniu w lokalu. Impreza zaczyna się tutaj.',
    terms: ['Za zameldowanie w lokalu', 'Tylko dla obserwujących', 'Tylko 18+'],
    validLabel: 'Pt–Sob po 22:00',
    activationMinutes: 15,
    ageMin: 18,
    emoji: '🥃',
    color: '#2D5DAA',
    requireCheckin: true,
    requireFollow: true,
  },
  {
    id: 'o9',
    venueId: 'drukarnia',
    kind: 'promo',
    title: 'Bilet -50% dla studentów',
    subtitle: 'Drukarnia',
    discountLabel: '-50%',
    description: 'Wstęp na czwartkowy koncert o połowę taniej za okazaniem legitymacji.',
    terms: ['Za okazaniem ważnej legitymacji', 'Czwartki'],
    validLabel: 'Czwartki',
    activationMinutes: 30,
    emoji: '🎟️',
    color: '#FF5A4D',
  },

  // ——— Oferty Lokalio (demo: po dwie z każdego rodzaju, kilka z limitami) ———
  {
    id: 'lok1', venueId: 'cafe-camelot', kind: 'bon', title: '-25% na kawę i ciasto', subtitle: 'Café Camelot', discountLabel: '-25%',
    description: 'Odbierz 25% rabatu na zestaw kawa + ciasto po zameldowaniu w lokalu.',
    terms: ['Za zameldowanie w lokalu', 'Limit 1 na osobę', 'Pozostało 50 szt.'], validLabel: '18.06–30.06', activationMinutes: 20, emoji: '☕', color: '#E0892B',
    requireCheckin: true, quantity: 50, perPersonLimit: 1,
  },
  {
    id: 'lok2', venueId: 'hevre', kind: 'bon', title: 'Drugie piwo gratis dla obserwujących', subtitle: 'Hevre', discountLabel: '2 za 1',
    description: 'Zamów piwo rzemieślnicze, a drugie tej samej marki dostajesz gratis. Oferta tylko dla obserwujących lokal.',
    terms: ['Tylko dla obserwujących', 'Tylko 18+', '1 raz na osobę'], validLabel: 'Pon–Czw', activationMinutes: 20, ageMin: 18, emoji: '🍺', color: '#2D5DAA',
    requireFollow: true, perPersonLimit: 1,
  },
  {
    id: 'lok3', venueId: 'forum', kind: 'bon', title: '-30% na koktajl', subtitle: 'Forum Przestrzenie', discountLabel: '-30%',
    description: 'Rabat 30% na dowolny koktajl — dla obserwujących, po zameldowaniu na miejscu.',
    terms: ['Za zameldowanie w lokalu', 'Tylko dla obserwujących', 'Limit 1 na osobę', 'Pozostało 40 szt.'], validLabel: '18.06–30.06', activationMinutes: 30, ageMin: 18, emoji: '🍹', color: '#2D5DAA',
    requireCheckin: true, requireFollow: true, quantity: 40, perPersonLimit: 1,
  },
  {
    id: 'lok4', venueId: 'bal', kind: 'bon', title: 'Zestaw dnia w cenie 19 zł', subtitle: 'BAL', discountLabel: '19 zł',
    description: 'Zupa dnia i danie główne w stałej cenie 19 zł. Oferta dostępna w aplikacji.',
    terms: ['Dostępna w aplikacji', 'Limit 2 na osobę', 'Pozostało 100 szt.'], validLabel: 'Pn–Pt 12–16', activationMinutes: 30, emoji: '🍲', color: '#3FAE83',
    quantity: 100, perPersonLimit: 2,
  },

  // ——— Sandomierz ———
  {
    id: 'so1', venueId: 'mala-czarna', kind: 'promo', title: '-20% na ciasta', subtitle: 'Kawiarnia Mała Czarna', discountLabel: '-20%',
    description: 'Cała witryna ciast taniej o 20%. Najlepszy moment na szarlotkę.', terms: ['Tylko na miejscu'], validLabel: 'Dziś do 18:00', activationMinutes: 15, emoji: '🍰', color: '#E0892B',
  },
  {
    id: 'so2', venueId: 'winiarnia-s', kind: 'bon', title: 'Lampka wina na powitanie', subtitle: 'Winiarnia Sandomierska', discountLabel: 'Gratis',
    description: 'Odbierz lampkę lokalnego wina z sandomierskiej winnicy — po zameldowaniu w lokalu.', terms: ['Za zameldowanie w lokalu', 'Tylko 18+', '1 raz na osobę'], validLabel: 'Po 17:00', activationMinutes: 20, ageMin: 18, emoji: '🍷', color: '#7A5C99',
    requireCheckin: true, perPersonLimit: 1,
  },
  {
    id: 'so3', venueId: 'trzydziestka', kind: 'promo', title: 'Zestaw obiadowy -15%', subtitle: 'Restauracja Trzydziestka', discountLabel: '-15%',
    description: 'Zupa dnia i danie główne taniej o 15%.', terms: ['Pn–Pt 12:00–16:00'], validLabel: 'Pn–Pt 12–16', activationMinutes: 30, emoji: '🍲', color: '#3FAE83',
  },
  {
    id: 'so4', venueId: 'lapidarium-s', kind: 'promo', title: 'Bilet -50% dla studentów', subtitle: 'Klub Lapidarium', discountLabel: '-50%',
    description: 'Wstęp na koncert o połowę taniej za okazaniem legitymacji.', terms: ['Za okazaniem legitymacji'], validLabel: 'Czwartki', activationMinutes: 30, emoji: '🎟️', color: '#2D5DAA',
  },
  // ——— okolice ———
  {
    id: 'to1', venueId: 'cafe-wisla', kind: 'bon', title: 'Kawa + ciasto 15 zł', subtitle: 'Cafe Wisła', discountLabel: '15 zł',
    description: 'Zestaw: kawa i ciasto dnia w promocyjnej cenie.', terms: ['Tylko na miejscu'], validLabel: 'Cały dzień', activationMinutes: 20, emoji: '☕', color: '#E0892B',
  },
];

// ============================================================
// Znajomi (mock — social proof do meldowań)
// ============================================================

export const FRIENDS: Friend[] = [
  { id: 'f1', name: 'Kasia', emoji: '👩‍🦰', color: '#FF5A4D', checkedInVenueId: 'mala-czarna', note: 'melduje się w Małej Czarnej' },
  { id: 'f2', name: 'Marek', emoji: '🧔', color: '#2D5DAA', checkedInVenueId: 'lapidarium-s', note: 'melduje się w Lapidarium' },
  { id: 'f3', name: 'Ola', emoji: '👩', color: '#7A5C99', note: 'była dziś w Café Camelot' },
  { id: 'f4', name: 'Piotr', emoji: '👨', color: '#3FAE83', checkedInVenueId: 'eszeweria', note: 'melduje się w Eszeweria' },
  { id: 'f5', name: 'Zofia', emoji: '👩‍🎨', color: '#E0892B', note: 'obserwuje MOCAK' },
  { id: 'f6', name: 'Tomek', emoji: '🧑', color: '#8C5A1F', checkedInVenueId: 'forum', note: 'melduje się na Forum' },
  // pula osób do dodania jako znajomi
  { id: 'f7', name: 'Ania', emoji: '👧', color: '#FF5A4D', note: 'lubi kawiarnie' },
  { id: 'f8', name: 'Bartek', emoji: '🧑‍🦱', color: '#2D5DAA', checkedInVenueId: 'piekny-pies', note: 'melduje się w Piękny Pies' },
  { id: 'f9', name: 'Magda', emoji: '👩‍🦱', color: '#7A5C99', note: 'chodzi do teatru' },
  { id: 'f10', name: 'Kuba', emoji: '🧑‍🎤', color: '#3FAE83', checkedInVenueId: 'drukarnia', note: 'melduje się w Drukarni' },
  { id: 'f11', name: 'Nina', emoji: '👩‍🦰', color: '#E0892B', note: 'fanka jazzu' },
  { id: 'f12', name: 'Wojtek', emoji: '🧔‍♂️', color: '#8C5A1F', note: 'biega po Błoniach' },
];

// ============================================================
// Lokalizacje (presety + symulacja "nowego miasta")
// ============================================================

export const LOCATIONS: { id: string; label: string; district: string; coords: { lat: number; lng: number } }[] = [
  { id: 'rynek', label: 'Rynek Główny', district: 'Stare Miasto', coords: { lat: 50.0617, lng: 19.9373 } },
  { id: 'kazimierz', label: 'Kazimierz (Plac Nowy)', district: 'Kazimierz', coords: { lat: 50.0515, lng: 19.9447 } },
  { id: 'podgorze', label: 'Podgórze (Rynek Podgórski)', district: 'Podgórze', coords: { lat: 50.0462, lng: 19.9525 } },
  { id: 'nowahuta', label: 'Plac Centralny', district: 'Nowa Huta', coords: { lat: 50.0719, lng: 20.0378 } },
  { id: 'blonia', label: 'Błonia', district: 'Krowodrza', coords: { lat: 50.059, lng: 19.907 } },
];

// ============================================================
// Odznaki (grywalizacja)
// ============================================================

export const BADGES: Badge[] = [
  { id: 'b1', name: 'Odkrywca', emoji: '🧭', description: 'Zamelduj się w 5 lokalach', goal: 5, metric: 'checkins' },
  { id: 'b2', name: 'Łowca okazji', emoji: '🎟️', description: 'Wykorzystaj 3 oferty', goal: 3, metric: 'vouchers' },
  { id: 'b3', name: 'Kolekcjoner', emoji: '💛', description: 'Zapisz 8 wydarzeń', goal: 8, metric: 'saves' },
  { id: 'b4', name: 'Społecznik', emoji: '🤝', description: 'Obserwuj 5 miejsc', goal: 5, metric: 'follows' },
  { id: 'b5', name: 'Bywalec', emoji: '🌟', description: 'Zbierz 200 punktów', goal: 200, metric: 'events' },
];

// ============================================================
// Dane „live" (OpenStreetMap) — wstrzykiwane w runtime przez registerLiveData().
// Gdy aktywne, stają się głównym źródłem; seed pozostaje bezpiecznym fallbackiem.
// ============================================================

export interface LiveData {
  venues: Venue[];
  events: EventItem[];
  offers: Offer[];
  organizers: Record<string, Organizer>;
}

let LIVE_VENUES: Venue[] = [];
let LIVE_EVENTS: EventItem[] = [];
let LIVE_OFFERS: Offer[] = [];
let LIVE_ORGS: Record<string, Organizer> = {};
let LIVE_ON = false;

/** Podmienia aktywny zbiór danych na realne lokale (OSM). null/pusty → powrót do seeda. */
export function registerLiveData(d: LiveData | null) {
  if (d && d.venues.length) {
    LIVE_VENUES = d.venues;
    LIVE_EVENTS = d.events;
    LIVE_OFFERS = d.offers;
    LIVE_ORGS = d.organizers;
    LIVE_ON = true;
  } else {
    LIVE_VENUES = [];
    LIVE_EVENTS = [];
    LIVE_OFFERS = [];
    LIVE_ORGS = {};
    LIVE_ON = false;
  }
}

export const isLiveActive = () => LIVE_ON;

// Lokale dodane przez właściciela w panelu („Dodaj lokal") — rejestrowane z AppContext.
let OWNER_VENUES: Venue[] = [];
export function registerOwnerVenues(v: Venue[]) { OWNER_VENUES = v; }

// Promocje i oferty Lokalio dodane przez właściciela — rejestrowane z AppContext, by rozwiązywały się też na profilu lokalu.
let OWNER_OFFERS: Offer[] = [];
export function registerOwnerOffers(o: Offer[]) { OWNER_OFFERS = o; }

// Wydarzenia dodane przez właściciela — rejestrowane z AppContext, by `eventById`/`eventsForVenue`/karuzela mapy je rozwiązywały.
let OWNER_EVENTS: EventItem[] = [];
export function registerOwnerEvents(e: EventItem[]) { OWNER_EVENTS = e; }

// Publiczny kanał: wydarzenia opublikowane w Supabase — widoczne dla WSZYSTKICH (nie tylko właściciela).
let PUBLISHED_EVENTS: EventItem[] = [];
let PUBLISHED_ORGS: Record<string, Organizer> = {};
export function registerPublishedEvents(e: EventItem[], orgs: Record<string, Organizer>) { PUBLISHED_EVENTS = e; PUBLISHED_ORGS = orgs; }

// ─────────────────────────────────────────────────────────────────────────────
// DEMO (TYLKO PREZENTACJA): jedno wydarzenie „za ~90 min" tuż obok użytkownika,
// żeby sekcja „W okolicy teraz" (Home: ≤2 km + start ≤4 h) była zawsze widoczna w
// akcji — nawet poza godzinami, w których seed/live ma coś tak blisko i tak wcześnie.
//
// USUNIĘCIE PRZY REALNYCH DANYCH: ustaw DEMO_NEARBY_EVENT = false (jedno miejsce).
// Wstrzyknięcie żyje w AppContext (efekt registerDemoEvents + dołączenie do `events`).
export const DEMO_NEARBY_EVENT = true;
let DEMO_EVENTS: EventItem[] = [];
export function registerDemoEvents(e: EventItem[]) { DEMO_EVENTS = e; }
export function makeDemoNearbyEvent(coords: LatLng): EventItem {
  const start = new Date(Date.now() + 90 * 60 * 1000); // start za ~90 min od „teraz"
  const p = (n: number) => String(n).padStart(2, '0');
  const iso = `${start.getFullYear()}-${p(start.getMonth() + 1)}-${p(start.getDate())}T${p(start.getHours())}:${p(start.getMinutes())}`;
  return {
    id: 'demo-nearby',
    title: 'Potańcówka na rynku',
    category: 'social',
    organizerId: '',
    place: 'Tuż obok Ciebie',
    coords: { lat: coords.lat + 0.003, lng: coords.lng }, // ~330 m od użytkownika (mieści się w 2 km)
    dateIso: iso,
    free: true,
    priceLabel: 'Wstęp wolny',
    description: 'Spontaniczna potańcówka tuż obok — wpadnij na chwilę!',
    emoji: '💃',
    gradient: ['#FF8275', '#FF5A4D'],
    tags: ['Demo'],
    source: 'instytucja',
  };
}

// Aktywny zbiór do przeglądania / agenta / „podobnych": realne dane gdy włączone, inaczej seed.
export const activeVenues = (): Venue[] => [...OWNER_VENUES, ...(LIVE_ON ? LIVE_VENUES : VENUES)];
export const activeEvents = (): EventItem[] => [...DEMO_EVENTS, ...OWNER_EVENTS, ...PUBLISHED_EVENTS, ...(LIVE_ON ? LIVE_EVENTS : EVENTS)];
export const activeOffers = (): Offer[] => [...OWNER_OFFERS, ...(LIVE_ON ? LIVE_OFFERS : OFFERS)];

// ============================================================
// Lookupy — rozwiązują po id zarówno dane live, jak i seed (live ma pierwszeństwo).
// ============================================================

const allVenues = () => [...OWNER_VENUES, ...(LIVE_ON ? [...LIVE_VENUES, ...VENUES] : VENUES)];
const allEvents = () => [...DEMO_EVENTS, ...OWNER_EVENTS, ...PUBLISHED_EVENTS, ...(LIVE_ON ? [...LIVE_EVENTS, ...EVENTS] : EVENTS)];
const allOffers = () => [...OWNER_OFFERS, ...(LIVE_ON ? [...LIVE_OFFERS, ...OFFERS] : OFFERS)];

export const venueById = (id?: string) => allVenues().find((v) => v.id === id);
export const eventById = (id?: string) => allEvents().find((e) => e.id === id);
export const offerById = (id?: string) => allOffers().find((o) => o.id === id);
export const organizerById = (id?: string) => (id ? (PUBLISHED_ORGS[id] ?? LIVE_ORGS[id] ?? ORGANIZERS[id]) : undefined);
export const offersForVenue = (venueId: string) => allOffers().filter((o) => o.venueId === venueId && !o.ended);
export const venueForOrganizer = (orgId: string) => allVenues().find((v) => v.organizerId === orgId);
export const eventsForVenue = (venueId: string) => allEvents().filter((e) => e.venueId === venueId && !e.ended);
export const eventsForOrganizer = (orgId: string) => allEvents().filter((e) => e.organizerId === orgId && !e.ended);
export const friendsAtVenue = (venueId: string) => FRIENDS.filter((f) => f.checkedInVenueId === venueId);

// Filtry „po mieście" — fallback (seed). W trybie live AppContext używa activeVenues itd.
export const eventsForCity = (cityId: string) => EVENTS.filter((e) => cityIdOf(e.coords) === cityId);
// Opublikowane wydarzenia (publiczny kanał) w danym mieście — dokładane zawsze, niezależnie od trybu live/seed.
export const publishedEventsForCity = (cityId: string) => PUBLISHED_EVENTS.filter((e) => cityIdOf(e.coords) === cityId);
export const venuesForCity = (cityId: string) => VENUES.filter((v) => cityIdOf(v.coords) === cityId);
export const offersForCity = (cityId: string) =>
  OFFERS.filter((o) => {
    const v = VENUES.find((x) => x.id === o.venueId);
    return v ? cityIdOf(v.coords) === cityId : false;
  });

// ============================================================
// Domyślny użytkownik (uzupełniany w onboardingu)
// ============================================================

export function makeDefaultUser(partial: Partial<User>): User {
  return {
    name: 'Gość',
    age: 25,
    gender: 'inna',
    district: cityById(DEFAULT_CITY_ID).districts[0]?.district ?? '',
    coords: cityById(DEFAULT_CITY_ID).center,
    preferredCategories: [],
    points: 0,
    savedEventIds: [],
    attendingEventIds: [],
    savedVenueIds: [],
    savedOfferIds: [],
    followedOrganizerIds: [],
    friendIds: ['f1', 'f2', 'f4'],
    checkedInVenueId: null,
    checkedInAt: null,
    usesRealLocation: false,
    ...partial,
  };
}
