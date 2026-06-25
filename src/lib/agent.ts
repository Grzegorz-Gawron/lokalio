import { activeEvents, activeVenues } from '../data/seed';
import { cityIdOf } from '../data/cities';
import { haversineKm, formatDistance } from './geo';
import { relativeDay } from './format';
import type { CategoryKey, User } from '../types';

export interface Mood {
  key: string;
  label: string;
  emoji: string;
  cats: CategoryKey[];
  venueCats: CategoryKey[];
  venueTags?: string[];
  freeOnly?: boolean;
  reply: string;
}

export const MOODS: Mood[] = [
  {
    key: 'gastro',
    label: 'Coś zjeść',
    emoji: '🍽️',
    cats: ['gastro'],
    venueCats: ['gastro'],
    reply: 'Głodny? Mam kilka miejsc w okolicy, gdzie zjesz dobrze i blisko:',
  },
  {
    key: 'coffee',
    label: 'Kawa i spokój',
    emoji: '☕',
    cats: ['social'],
    venueCats: ['gastro'],
    venueTags: ['Kawiarnia', 'Ciche', 'Klimat', 'Księgarnia'],
    reply: 'Na spokojną kawę i chwilę wytchnienia polecam:',
  },
  {
    key: 'party',
    label: 'Impreza',
    emoji: '🍸',
    cats: ['party'],
    venueCats: ['party'],
    reply: 'Idziemy potańczyć! Tu się dziś dzieje najwięcej:',
  },
  {
    key: 'concert',
    label: 'Muzyka na żywo',
    emoji: '🎵',
    cats: ['concert'],
    venueCats: ['party'],
    venueTags: ['Koncerty', 'Jazz'],
    reply: 'Muzyka na żywo? Sprawdź to:',
  },
  {
    key: 'culture',
    label: 'Kultura',
    emoji: '🎨',
    cats: ['culture'],
    venueCats: [],
    reply: 'Coś dla ducha — kultura w zasięgu spaceru:',
  },
  {
    key: 'active',
    label: 'Ruch i sport',
    emoji: '🏃',
    cats: ['sport'],
    venueCats: [],
    reply: 'Trochę ruchu dobrze zrobi. Zobacz:',
  },
  {
    key: 'free',
    label: 'Coś za darmo',
    emoji: '🎁',
    cats: ['concert', 'culture', 'social', 'gastro', 'sport', 'party'],
    venueCats: [],
    freeOnly: true,
    reply: 'Lubię to! Oto najlepsze darmowe rzeczy w okolicy:',
  },
  {
    key: 'near',
    label: 'Cokolwiek blisko',
    emoji: '📍',
    cats: ['concert', 'culture', 'social', 'gastro', 'sport', 'party'],
    venueCats: ['gastro', 'party'],
    reply: 'Skoro masz blisko mieć — to moje typy tuż obok:',
  },
];

const KEYWORDS: [string, RegExp][] = [
  ['gastro', /(jedz|gł?od|zjad|zjeś|zjes|obiad|kolacj|restaur|burger|pizz|hummus|wino|winiar|je[śs][ćc]|brunch|lunch)/i],
  ['coffee', /(kaw|spok[oó]j|chill|cich|relaks|posiedz|herbat|ciast|deser|ksi[ąa]żk)/i],
  ['party', /(imprez|ta[ńn]c|klub|wyj[śs]|drink|baw|pota[ńn]c|napi|alko|koktajl)/i],
  ['concert', /(koncert|muzyk|live|na ?[żz]ywo|jazz|graj|zesp[oó]ł|gra dzi[śs])/i],
  ['culture', /(kultur|sztuk|teatr|muzeum|wystaw|galeri|spektak|film|kino|warsztat)/i],
  ['active', /(sport|bieg|jog|ruch|aktywn|rower|si[łl]own|trening|joga)/i],
  ['free', /(darmo|za free|tani|bud[żz]et|bez kasy|0 ?z[łl]|nie p[łl]ac)/i],
  ['near', /(blisko|obok|niedaleko|w pobli[żz]u|okolic|najbli[żz])/i],
];

/** Rozpoznaje nastrój ze swobodnego tekstu. */
export function interpretText(text: string): string {
  const t = text.toLowerCase();
  for (const [key, rx] of KEYWORDS) {
    if (rx.test(t)) return key;
  }
  return 'near';
}

export interface Suggestion {
  kind: 'event' | 'venue';
  id: string;
  reason: string;
  score: number;
}

// Dopasowanie po SZCZEGÓŁOWEJ kategorii (rodzaj lokalu / kategoria wydarzenia) z tekstu.
// Np. „escape room", „kawiarnia", „kręgielnia", „co dziś dla dzieci?".
const stemsOf = (label: string) =>
  label.toLowerCase().split(/[\s/+]+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 6));
const labelMatches = (label: string | undefined, t: string) => !!label && stemsOf(label).some((s) => t.includes(s));

/** Najpierw szuka po szczegółowej kategorii (venueType / eventCategory); inaczej wraca do nastroju. */
export function recommendFromText(text: string, user: User): { mood: Mood; suggestions: Suggestion[] } {
  const t = ` ${text.toLowerCase()} `;
  const here = user.coords;
  const cityId = cityIdOf(here);
  const adult = user.age >= 18;

  const venueHits: Suggestion[] = activeVenues()
    .filter((v) => cityIdOf(v.coords) === cityId && labelMatches(v.venueType, t))
    .filter((v) => (adult ? true : v.category !== 'party'))
    .map((v) => {
      const d = haversineKm(here, v.coords);
      return { kind: 'venue' as const, id: v.id, reason: `${formatDistance(d)} stąd${v.venueType ? ` · ${v.venueType}` : ''}`, score: 3 + (v.rating - 4) * 0.4 - d * 0.2 };
    });
  const eventHits: Suggestion[] = activeEvents()
    .filter((e) => cityIdOf(e.coords) === cityId && labelMatches(e.eventCategory, t))
    .filter((e) => (e.ageMin ? user.age >= e.ageMin : true))
    .map((e) => {
      const d = haversineKm(here, e.coords);
      return { kind: 'event' as const, id: e.id, reason: `${relativeDay(e.dateIso)} · ${formatDistance(d)} stąd${e.eventCategory ? ` · ${e.eventCategory}` : ''}`, score: 3.2 - d * 0.15 };
    });

  const detailed = [...eventHits, ...venueHits].sort((a, b) => b.score - a.score).slice(0, 3);
  if (detailed.length) {
    return {
      mood: { key: 'detailed', label: '', emoji: '', cats: [], venueCats: [], reply: 'Oto, co pasuje do Twojego zapytania:' },
      suggestions: detailed,
    };
  }
  return recommend(interpretText(text), user);
}

/** Dobiera propozycje pod nastrój, ważąc kategorię i odległość. */
export function recommend(moodKey: string, user: User, max = 3): { mood: Mood; suggestions: Suggestion[] } {
  const mood = MOODS.find((m) => m.key === moodKey) ?? MOODS[MOODS.length - 1];
  const here = user.coords;
  const cityId = cityIdOf(here);
  const adult = user.age >= 18;

  const eventSugg: Suggestion[] = activeEvents().filter((e) => cityIdOf(e.coords) === cityId)
    .filter((e) => mood.cats.includes(e.category))
    .filter((e) => (mood.freeOnly ? e.free : true))
    .filter((e) => (e.ageMin ? user.age >= e.ageMin : true))
    .map((e) => {
      const d = haversineKm(here, e.coords);
      let score = 2 + (e.promoted ? 0.3 : 0) - d * 0.15;
      if (e.free) score += mood.freeOnly ? 1 : 0.25;
      const reason = `${relativeDay(e.dateIso)} · ${formatDistance(d)} stąd${e.free ? ' · za darmo' : ` · ${e.priceLabel}`}`;
      return { kind: 'event' as const, id: e.id, reason, score };
    });

  const venueSugg: Suggestion[] = activeVenues().filter((v) => cityIdOf(v.coords) === cityId)
    .filter((v) => mood.venueCats.includes(v.category))
    .filter((v) => (adult ? true : v.category !== 'party'))
    .map((v) => {
      const d = haversineKm(here, v.coords);
      const tagHit = mood.venueTags ? v.tags.filter((t) => mood.venueTags!.includes(t)).length : 0;
      const score = 1.5 + tagHit * 0.7 + (v.rating - 4) * 0.5 + v.checkin.base * 0.01 - d * 0.2;
      const reason = `${formatDistance(d)} stąd${v.tags[0] ? ` · ${v.tags[0]}` : ''}`;
      return { kind: 'venue' as const, id: v.id, reason, score };
    });

  const all = [...eventSugg, ...venueSugg].sort((a, b) => b.score - a.score).slice(0, max);
  return { mood, suggestions: all };
}
