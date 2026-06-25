import { activeEvents, activeVenues, venueById, eventById } from '../data/seed';
import { cityIdOf, cityById } from '../data/cities';
import { haversineKm, formatDistance } from './geo';
import { relativeDay, formatTime } from './format';
import { recommendFromText, type Suggestion } from './agent';
import type { User } from '../types';

export interface AgentReply {
  text: string;
  suggestions: Suggestion[];
  source: 'ai' | 'local';
}

function reasonForEventId(id: string, user: User): string {
  const e = eventById(id);
  if (!e) return '';
  const d = haversineKm(user.coords, e.coords);
  return `${relativeDay(e.dateIso)} · ${formatDistance(d)} stąd${e.free ? ' · za darmo' : ` · ${e.priceLabel}`}`;
}
function reasonForVenueId(id: string, user: User): string {
  const v = venueById(id);
  if (!v) return '';
  const d = haversineKm(user.coords, v.coords);
  return `${formatDistance(d)} stąd${v.tags[0] ? ` · ${v.tags[0]}` : ''}`;
}

function mapIds(ids: string[], user: User): Suggestion[] {
  const out: Suggestion[] = [];
  for (const id of ids.slice(0, 3)) {
    if (eventById(id)) out.push({ kind: 'event', id, reason: reasonForEventId(id, user), score: 1 });
    else if (venueById(id)) out.push({ kind: 'venue', id, reason: reasonForVenueId(id, user), score: 1 });
  }
  return out;
}

function buildItems(user: User, cityId: string) {
  const ev = activeEvents().filter((e) => cityIdOf(e.coords) === cityId).map((e) => ({
    id: e.id,
    kind: 'event',
    title: e.title,
    category: e.category,
    eventCategory: e.eventCategory ?? null, // szczegółowa kategoria (np. „Transmisja sportowa", „… dla dzieci")
    tags: e.tags,
    when: `${relativeDay(e.dateIso)} ${formatTime(e.dateIso)}`,
    price: e.free ? 'za darmo' : e.priceLabel,
    ageMin: e.ageMin ?? null,
    dist_m: Math.round(haversineKm(user.coords, e.coords) * 1000),
  }));
  const ve = activeVenues().filter((v) => cityIdOf(v.coords) === cityId).map((v) => ({
    id: v.id,
    kind: 'venue',
    name: v.name,
    category: v.category,
    venueType: v.venueType ?? null, // rodzaj lokalu (np. „Kawiarnia", „Escape room", „Kręgielnia")
    tags: v.tags,
    rating: v.rating,
    dist_m: Math.round(haversineKm(user.coords, v.coords) * 1000),
  }));
  return [...ev, ...ve];
}

/**
 * Główne wejście agenta dla swobodnego tekstu.
 * Próbuje realnego modelu (proxy /api/agent z kluczem). Gdy niedostępny — wbudowana symulacja.
 */
export async function askLokalio(message: string, user: User): Promise<AgentReply> {
  const cityId = cityIdOf(user.coords);
  const city = cityById(cityId);
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, cityName: city.name, items: buildItems(user, cityId) }),
      signal: AbortSignal.timeout(9000),
    });
    if (res.ok) {
      const data = (await res.json()) as { text?: string; suggestionIds?: string[] };
      const suggestions = mapIds(data.suggestionIds ?? [], user);
      if (suggestions.length || data.text) {
        return { text: data.text || 'Oto moje propozycje:', suggestions, source: 'ai' };
      }
    }
  } catch {
    /* brak serwera / klucza / timeout → fallback */
  }
  const { mood, suggestions } = recommendFromText(message, user);
  return { text: mood.reply, suggestions, source: 'local' };
}
