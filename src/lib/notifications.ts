import type { EventItem, Offer, Venue } from '../types';
import { APP_NOW } from './format';
import { hashId } from './photos';

// Kanał powiadomień: nowe wydarzenia i oferty od obserwowanych lokali/organizatorów.
// „Obserwowanie" jest po stronie organizatora (followedOrganizerIds); lokal bez organizatora obserwujemy po jego id.

export const NOTIF_SEEN_KEY = 'lokalio.notifSeen';

export interface NotifItem {
  id: string;
  kind: 'event' | 'offer';
  refId: string; // id wydarzenia / oferty do nawigacji
  title: string;
  subtitle: string;
  discount?: string;
  emoji: string;
  color: string;
  createdAt: number;
}

const DAY = 24 * 3600 * 1000;

// „Kiedy opublikowano": treść właściciela ma znacznik czasu w id (own-e-…, own-o-…);
// pozostała — deterministycznie w ostatnich 14 dniach (stabilne „X dni temu").
function createdAtOf(id: string): number {
  const m = /^own-[eo]-(\d{10,})$/.exec(id);
  if (m) return Number(m[1]);
  return APP_NOW.getTime() - (hashId(id) % (14 * DAY));
}

export function buildNotifications(events: EventItem[], offers: Offer[], venues: Venue[], followedOrgIds: string[]): NotifItem[] {
  if (!followedOrgIds.length) return [];
  const followed = new Set(followedOrgIds);
  const venFollowId = new Map(venues.map((v) => [v.id, v.organizerId || v.id]));
  const items: NotifItem[] = [];

  for (const e of events) {
    if (e.organizerId && followed.has(e.organizerId)) {
      items.push({ id: 'n-e-' + e.id, kind: 'event', refId: e.id, title: e.title, subtitle: e.place, emoji: e.emoji, color: e.gradient?.[0] ?? '#FF5A4D', createdAt: createdAtOf(e.id) });
    }
  }
  for (const o of offers) {
    const fid = venFollowId.get(o.venueId);
    if (fid && followed.has(fid)) {
      items.push({ id: 'n-o-' + o.id, kind: 'offer', refId: o.id, title: o.title, subtitle: o.subtitle, discount: o.discountLabel, emoji: o.emoji, color: o.color, createdAt: createdAtOf(o.id) });
    }
  }
  return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
}

// „5 min temu" / „3 godz. temu" / „wczoraj" / „4 dni temu"
export function notifAgo(ts: number): string {
  const diff = Math.max(0, APP_NOW.getTime() - ts);
  if (diff < 3600 * 1000) return `${Math.max(1, Math.round(diff / 60000))} min temu`;
  if (diff < DAY) return `${Math.round(diff / 3600000)} godz. temu`;
  const d = Math.round(diff / DAY);
  return d <= 1 ? 'wczoraj' : `${d} dni temu`;
}
