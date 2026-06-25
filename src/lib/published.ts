import { supabase } from './supabase';
import type { EventItem, Organizer, CategoryKey } from '../types';
import { CATEGORY_META } from '../theme';

// Publiczny kanał treści: wydarzenia opublikowane w Supabase (tabele events/organizers — publicznie czytelne).
// Widoczne dla WSZYSTKICH użytkowników (w odróżnieniu od treści właściciela, które są prywatne per-konto).

interface OrgRow {
  id: string; slug: string; name: string; avatar_emoji: string | null; avatar_url: string | null;
  verified: boolean; bio: string | null; contact_phone: string | null; contact_web: string | null;
  categories: string[] | null; followers_count: number | null;
}
interface EventRow {
  id: string; title: string; description: string | null; organizer_id: string; category: string;
  date_at: string; venue_name: string; venue_address: string | null; lat: number | null; lng: number | null;
  price_text: string | null; is_free: boolean; promoted: boolean; city: string; tags: string[] | null; image_url: string | null;
  organizers: OrgRow | null;
}

const SANDOMIERZ = { lat: 50.6789, lng: 21.7497 };

// timestamptz → lokalne „YYYY-MM-DDTHH:mm" (format dateIso w aplikacji jest naiwny/lokalny).
function toLocalIso(ts: string): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Etykieta miejsca: nazwa + ulica, bez dublowania nazwy i bez końcówki z miastem (miasto dokłada już kafel).
function placeOf(name: string, address: string | null, city: string): string {
  const a = (address || '').trim();
  if (!a) return name;
  const noCity = a.replace(new RegExp('\\s*,?\\s*' + city + '\\s*$', 'i'), '').trim();
  if (!noCity || noCity.toLowerCase() === name.toLowerCase()) return name;
  if (noCity.toLowerCase().startsWith(name.toLowerCase())) return noCity;
  return `${name}, ${noCity}`;
}

function mapOrg(r: OrgRow, oid: string): Organizer {
  return {
    id: oid,
    name: r.name,
    kind: 'instytucja',
    emoji: r.avatar_emoji || '🎭',
    verified: !!r.verified,
    followers: r.followers_count ?? 0,
    bio: r.bio ?? '',
    categories: (r.categories ?? []) as CategoryKey[],
    photo: r.avatar_url ?? undefined,
    phone: r.contact_phone ?? undefined,
    website: r.contact_web ?? undefined,
  };
}

export async function loadPublishedEvents(): Promise<{ events: EventItem[]; orgs: Record<string, Organizer> }> {
  if (!supabase) return { events: [], orgs: {} };
  try {
    // Tylko nadchodzące (z zapasem 1 dnia na strefy czasowe) — minione wydarzenia nie zaśmiecają list.
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('events')
      .select('*, organizers(*)')
      .gte('date_at', cutoff)
      .order('date_at', { ascending: true })
      .limit(200);
    if (error || !data) return { events: [], orgs: {} };
    const events: EventItem[] = [];
    const orgs: Record<string, Organizer> = {};
    for (const r of data as EventRow[]) {
      const cat = (['concert', 'sport', 'culture', 'social', 'party'].includes(r.category) ? r.category : 'culture') as CategoryKey;
      const meta = CATEGORY_META[cat];
      const oid = 'pub-org-' + r.organizer_id;
      events.push({
        id: 'pub-' + r.id,
        title: r.title,
        category: cat,
        organizerId: oid,
        place: placeOf(r.venue_name, r.venue_address, r.city),
        coords: { lat: r.lat ?? SANDOMIERZ.lat, lng: r.lng ?? SANDOMIERZ.lng },
        dateIso: toLocalIso(r.date_at),
        free: r.is_free,
        priceLabel: r.is_free ? 'Wstęp wolny' : (r.price_text || ''),
        description: r.description ?? '',
        emoji: r.organizers?.avatar_emoji || meta.emoji,
        gradient: [meta.color, meta.color],
        tags: r.tags ?? [],
        promoted: r.promoted || undefined,
        source: 'instytucja',
        photo: r.image_url ?? undefined,
      });
      if (r.organizers && !orgs[oid]) orgs[oid] = mapOrg(r.organizers, oid);
    }
    return { events, orgs };
  } catch {
    return { events: [], orgs: {} };
  }
}
