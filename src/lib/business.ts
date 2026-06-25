// Model kont firmowych w „Panelu firmowym" (Lokal / Organizator).
// Współdzielone przez rejestrację, panele, ikony na mapie i filtrowanie AI.

import type { CategoryKey } from '../types';

export type AccountType = 'lokal' | 'organizer';

export type OrganizerCategoryKey =
  | 'city_office'
  | 'commune_office'
  | 'cultural_institution'
  | 'sports_club'
  | 'association'
  | 'school'
  | 'dance_school'
  | 'concert_organizer'
  | 'event_organizer'
  | 'foundation'
  | 'other';

// Grupa decyduje o ikonie na mapie (#5) i koszyku filtrów AI (#6).
export type BusinessGroup = 'lokal' | 'public' | 'culture' | 'sport' | 'education' | 'organizer';

export interface OrganizerCategoryDef {
  key: OrganizerCategoryKey;
  emoji: string;
  label: string;
  group: BusinessGroup;
}

export const ORGANIZER_CATEGORIES: OrganizerCategoryDef[] = [
  { key: 'city_office', emoji: '🏢', label: 'Urząd miasta', group: 'public' },
  { key: 'commune_office', emoji: '🏘️', label: 'Urząd gminy', group: 'public' },
  { key: 'cultural_institution', emoji: '🏛️', label: 'Instytucja kultury', group: 'culture' },
  { key: 'sports_club', emoji: '⚽', label: 'Klub sportowy', group: 'sport' },
  { key: 'association', emoji: '🎭', label: 'Stowarzyszenie', group: 'organizer' },
  { key: 'school', emoji: '🎓', label: 'Szkoła', group: 'education' },
  { key: 'dance_school', emoji: '🩰', label: 'Szkoła tańca', group: 'education' },
  { key: 'concert_organizer', emoji: '🎵', label: 'Organizator koncertów', group: 'culture' },
  { key: 'event_organizer', emoji: '🎪', label: 'Organizator wydarzeń', group: 'organizer' },
  { key: 'foundation', emoji: '🤝', label: 'Fundacja', group: 'organizer' },
  { key: 'other', emoji: '📍', label: 'Inne', group: 'organizer' },
];

export const organizerCategoryByKey = (k?: string): OrganizerCategoryDef | undefined =>
  ORGANIZER_CATEGORIES.find((c) => c.key === k);

// Ikona pinów na mapie wg grupy konta (#5).
export const MAP_ICON: Record<BusinessGroup, string> = {
  lokal: '🍴',
  public: '🏛️',
  culture: '🎭',
  sport: '⚽',
  education: '🎓',
  organizer: '🎪',
};

// Funkcje panelu wg typu konta — używane w hubie panelu (i rozwijane w #3/#4).
export interface PanelFn {
  key: string;
  label: string;
  sub: string;
  soon?: boolean;
}

export const LOKAL_PANEL_FNS: PanelFn[] = [
  { key: 'advisor', label: 'Doradca AI', sub: 'Wskazówki jak zwiększyć ruch i zarobek' },
  { key: 'profile', label: 'Profil lokalu', sub: 'Zdjęcia, opis, kontakt, godziny' },
  { key: 'promos', label: 'Promocje', sub: 'Rabaty i happy hours' },
  { key: 'vouchers', label: 'Oferty Lokalio', sub: 'Za meldunek lub dla obserwujących' },
  { key: 'events', label: 'Wydarzenia', sub: 'Wydarzenia w Twoim lokalu' },
  { key: 'gallery', label: 'Galeria', sub: 'Zdjęcia lokalu' },
  { key: 'stats', label: 'Statystyki', sub: 'Ruch, meldunki, zasięg' },
  { key: 'team', label: 'Zespół', sub: 'Osoby i role (Administrator)' },
];

// Role w koncie firmowym i ich uprawnienia (które funkcje panelu widzą).
export type TeamRole = 'admin' | 'moderator';
// Moderator: tylko treści. Administrator: wszystko.
export const MODERATOR_FNS = ['promos', 'vouchers', 'events', 'gallery'];
export const fnsForRole = (fns: PanelFn[], role: TeamRole): PanelFn[] =>
  role === 'admin' ? fns : fns.filter((f) => MODERATOR_FNS.includes(f.key));

export const ORGANIZER_PANEL_FNS: PanelFn[] = [
  { key: 'advisor', label: 'Doradca AI', sub: 'Wskazówki jak zwiększyć frekwencję' },
  { key: 'profile', label: 'Profil organizatora', sub: 'Dane, adres, godziny, social' },
  { key: 'events', label: 'Wydarzenia', sub: 'Twoje wydarzenia i terminy' },
  { key: 'tickets', label: 'Bilety', sub: 'Sprzedaż biletów', soon: true },
  { key: 'stats', label: 'Statystyki', sub: 'Zainteresowanie i zasięg' },
  { key: 'gallery', label: 'Galeria', sub: 'Zdjęcia z wydarzeń' },
  { key: 'team', label: 'Zespół', sub: 'Osoby i role (Administrator)' },
];

// Pogrupowane, szczegółowe kategorie wydarzeń. `cat` = główna kategoria aplikacji
// (kolor/ikona/feed); szczegółowa pozycja służy filtrom i dopasowaniu (np. AI „co dla dzieci?").
export interface EventGroup { emoji: string; label: string; cat: CategoryKey; items: string[]; }
export const EVENT_GROUPS: EventGroup[] = [
  { emoji: '🎵', label: 'Muzyka', cat: 'concert', items: ['Koncert', 'DJ / impreza taneczna', 'Karaoke / open mic'] },
  { emoji: '🎭', label: 'Kultura i sztuka', cat: 'culture', items: ['Wystawa', 'Teatr / spektakl', 'Pokaz filmowy', 'Spotkanie autorskie'] },
  { emoji: '🍽️', label: 'Jedzenie i picie', cat: 'gastro', items: ['Degustacja', 'Warsztaty kulinarne', 'Wieczór tematyczny'] },
  { emoji: '⚽', label: 'Sport i aktywność', cat: 'sport', items: ['Zawody / turniej', 'Bieg', 'Trening otwarty / zajęcia', 'Transmisja sportowa'] },
  { emoji: '👨‍👩‍👧', label: 'Dla dzieci i rodzin', cat: 'social', items: ['Warsztaty dla dzieci', 'Spektakl dla dzieci', 'Piknik rodzinny'] },
  { emoji: '🎓', label: 'Edukacja i rozwój', cat: 'culture', items: ['Warsztaty / szkolenie', 'Wykład / prelekcja', 'Meetup / konferencja'] },
  { emoji: '🎉', label: 'Rozrywka i nocne życie', cat: 'party', items: ['Impreza tematyczna', 'Stand-up', 'Kabaret', 'Quiz / gra towarzyska'] },
  { emoji: '🤝', label: 'Lokalne i społeczność', cat: 'social', items: ['Święto miejskie', 'Jarmark / kiermasz', 'Akcja charytatywna'] },
];
export const DEFAULT_EVENT_CAT = EVENT_GROUPS[0].items[0];
// Szczegółowa pozycja → główna kategoria aplikacji (kolor/ikona).
export const eventMainCat = (item?: string): CategoryKey =>
  EVENT_GROUPS.find((g) => g.items.includes(item ?? ''))?.cat ?? 'social';

// Pogrupowane, szczegółowe kategorie lokali („Rodzaj lokalu"). `cat` = główna kategoria aplikacji.
export const VENUE_GROUPS: { emoji: string; label: string; cat: CategoryKey; items: string[] }[] = [
  { emoji: '🍽️', label: 'Gastronomia', cat: 'gastro', items: ['Restauracja', 'Kawiarnia', 'Lodziarnia', 'Bar', 'Pub', 'Bistro / fast food', 'Winiarnia / koktajlbar'] },
  { emoji: '🎉', label: 'Nocne życie', cat: 'party', items: ['Klub / dyskoteka', 'Klub muzyczny', 'Karaoke', 'Klub komediowy'] },
  { emoji: '🎯', label: 'Aktywności i gry', cat: 'social', items: ['Kręgielnia', 'Bilard', 'Escape room', 'Park trampolin', 'Sala zabaw', 'Laser tag / paintball'] },
  { emoji: '🏋️', label: 'Sport i wellness', cat: 'sport', items: ['Siłownia / fitness', 'Basen', 'Ścianka wspinaczkowa', 'Spa / sauna'] },
  { emoji: '🎭', label: 'Kultura', cat: 'culture', items: ['Kino', 'Teatr / scena', 'Galeria / muzeum', 'Centrum kultury'] },
];
export const DEFAULT_VENUE_CAT = VENUE_GROUPS[0].items[0];
export const venueMainCat = (item?: string): CategoryKey =>
  VENUE_GROUPS.find((g) => g.items.includes(item ?? ''))?.cat ?? 'gastro';

// Pogrupowane kategorie ofert/promocji („Kategoria"). `cat` = główna kategoria aplikacji (kolor pinezki + filtr na mapie).
// Bez typów dostępu (za meldunek / dla obserwujących) — te ustawia się osobnymi przełącznikami w Ofertach Lokalio.
export interface OfferGroup { emoji: string; label: string; cat: CategoryKey; items: string[]; }
export const OFFER_GROUPS: OfferGroup[] = [
  { emoji: '🍽️', label: 'Jedzenie', cat: 'gastro', items: ['Rabat na jedzenie', 'Drugie danie gratis', 'Zestaw / lunch w cenie', 'Kawa lub deser gratis'] },
  { emoji: '🍸', label: 'Napoje i klub', cat: 'party', items: ['Happy Hours', '2+1 na drinki', 'Drink gratis', 'Wejściówka do klubu'] },
  { emoji: '🎵', label: 'Koncerty', cat: 'concert', items: ['Zniżka na bilet na koncert', 'Wejściówka last minute'] },
  { emoji: '🎨', label: 'Kultura', cat: 'culture', items: ['Zniżka na bilet (kino / teatr / wystawa)', 'Karnet kulturalny'] },
  { emoji: '⚽', label: 'Sport', cat: 'sport', items: ['Zniżka na wejście lub karnet', 'Pierwszy trening gratis'] },
  { emoji: '👥', label: 'Grupy i okazje', cat: 'social', items: ['Rabat dla grup', 'Oferta rodzinna', 'Rabat urodzinowy'] },
];
export const DEFAULT_OFFER_CAT = OFFER_GROUPS[0].items[0];
export const offerMainCat = (item?: string): CategoryKey =>
  OFFER_GROUPS.find((g) => g.items.includes(item ?? ''))?.cat ?? 'gastro';

// Współdzielone listy do formularzy profilu.
export const SOCIALS: { key: string; label: string; placeholder: string }[] = [
  { key: 'facebook', label: 'Facebook', placeholder: 'nazwa-profilu' },
  { key: 'instagram', label: 'Instagram', placeholder: 'username' },
  { key: 'twitter', label: 'X (Twitter)', placeholder: 'username' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'username' },
  { key: 'youtube', label: 'YouTube', placeholder: 'kanał' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'username' },
];
export const COUNTRIES = ['Polska', 'Niemcy', 'Czechy', 'Słowacja', 'Ukraina', 'Inny'];
