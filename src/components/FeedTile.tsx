import type { ReactNode } from 'react';
import { Heart, BadgeCheck, ChevronRight, Lock, CalendarDays, MapPin, Footprints, Ticket, Eye } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { CATEGORY_META } from '../theme';
import { photoUrl } from '../lib/photos';
import { interestOf } from '../lib/stats';
import { formatTime, dateChipLabel } from '../lib/format';
import { haversineKm, formatDistance } from '../lib/geo';
import { venueById, offersForVenue, eventsForVenue, organizerById } from '../data/seed';
import type { EventItem, Offer, Venue, Organizer, CategoryKey, LatLng } from '../types';

/**
 * Jeden wspólny kafel treści („Dla Ciebie") używany w całej aplikacji:
 * feed na Home, Bony, listy profilu, sekcje w szczegółach lokalu/wydarzenia,
 * propozycje agenta. Różni się tylko dolną linią meta (zależną od typu).
 */
export interface TileData {
  id: string;
  type: 'event' | 'offer' | 'venue' | 'org';
  cat: CategoryKey;
  emoji: string;
  grad: [string, string];
  tag: string;
  tagColor: string;
  photo: string;
  title: string;
  subtitle: string;
  coords: LatLng;
  iso?: string;
  time?: string;
  free?: boolean;
  price?: string;
  live?: number;
  followers?: number;
  rating?: number;
  interest?: number;
  following?: boolean;
  follow?: () => void;
  offerInfo?: string;
  eventInfo?: string;
  discount?: string;
  valid?: string;
  redeemed?: boolean;
  metaText?: string;
  onClick: () => void;
  saved?: boolean;
  toggle?: () => void;
}

export function FeedTile({ item, dist, action, active }: { item: TileData; dist?: string; action?: ReactNode; active?: boolean }) {
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-card bg-paper shadow-card${active ? ' ring-2 ring-coral' : ''}`}>
      <button onClick={item.onClick} className="block w-full flex-1 text-left active:scale-[0.99]">
        <div className="relative h-[86px]" style={{ background: `linear-gradient(135deg, ${item.grad[0]}, ${item.grad[1]})` }}>
          <img src={item.photo} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[9.5px] font-bold shadow-sm" style={{ color: item.tagColor }}>
            {item.tag}
          </span>
          {item.type === 'venue' && item.live != null ? (
            <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[9.5px] font-bold text-success shadow-sm">
              <Footprints size={9} className="text-success" /> {item.live} w godzinę
            </span>
          ) : item.interest != null ? (
            <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[9.5px] font-bold text-coral shadow-sm">
              <Heart size={9} className="fill-coral text-coral" /> {item.interest} zainteresowanych
            </span>
          ) : null}
          <span className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[12px] shadow-sm">{item.emoji}</span>
          {item.redeemed && (
            <>
              <span className="absolute inset-0 bg-ink/45" />
              <span className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-full bg-ink/85 px-2 py-0.5 text-[9.5px] font-bold text-white shadow-sm">
                <BadgeCheck size={11} /> Zrealizowany
              </span>
            </>
          )}
        </div>
        <div className="p-2.5">
          <p className="line-clamp-2 min-h-[32px] text-[12.5px] font-bold leading-tight tracking-tight text-ink">{item.title}</p>

          {item.type === 'event' ? (
            // Wydarzenie — kompaktowo jak promocje: miejsce · dystans, potem data · godz. · cena.
            <div className="mt-1 space-y-1">
              <p className="flex items-center gap-1 text-[10.5px] text-subtle">
                <MapPin size={11} className="shrink-0 text-ink/40" />
                <span className="truncate">{item.subtitle}{dist ? ` · ${dist}` : ''}</span>
              </p>
              <p className="flex items-center gap-1 text-[10.5px] font-semibold">
                <CalendarDays size={11} className="shrink-0 text-ink/40" />
                <span className="truncate text-ink/70">
                  {item.iso ? `${dateChipLabel(item.iso)} · ` : ''}
                  <span className={item.free ? 'text-success' : 'text-coral'}>{item.free ? 'Za darmo' : item.price}</span>
                </span>
              </p>
            </div>
          ) : item.type === 'venue' ? (
            // Lokal — kompaktowo jak wydarzenia: dzielnica · dystans, potem oferty i wydarzenia.
            <div className="mt-1 space-y-1">
              <p className="flex items-center gap-1 text-[10.5px] text-subtle">
                <MapPin size={11} className="shrink-0 text-ink/40" />
                <span className="truncate">{item.subtitle}{dist ? ` · ${dist}` : ''}</span>
              </p>
              <p className="flex items-center gap-1.5 overflow-hidden text-[10.5px] font-semibold">
                {item.offerInfo && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-coral"><Ticket size={11} /> {item.offerInfo}</span>
                )}
                {item.eventInfo && (
                  <span className="inline-flex items-center gap-0.5 truncate text-ink/60"><CalendarDays size={11} className="shrink-0" /> <span className="truncate">{item.eventInfo}</span></span>
                )}
                {!item.offerInfo && !item.eventInfo && <span className="text-subtle">Zajrzyj po szczegóły</span>}
              </p>
            </div>
          ) : (
            <>
              <p className="mt-0.5 truncate text-[10.5px] text-subtle">{item.subtitle}{dist ? ` · ${dist}` : ''}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] font-semibold">
                {item.type === 'offer' && (
                  <>
                    <span className="text-coral">{item.discount}</span>
                    <span className="truncate text-ink/55">{item.valid}</span>
                  </>
                )}
                {item.type === 'org' && <span className="text-ink/55">{item.metaText}</span>}
              </div>
            </>
          )}
        </div>
      </button>
      {action && <div className="px-2.5 pb-2.5">{action}</div>}
      {item.type === 'venue' ? (
        item.follow && (
          <button
            onClick={(e) => { e.stopPropagation(); item.follow!(); }}
            aria-label="Obserwuj"
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 shadow-sm backdrop-blur active:scale-90"
          >
            <Eye size={14} className={item.following ? 'fill-coral/20 text-coral animate-pop' : 'text-black/40'} />
          </button>
        )
      ) : item.toggle && (
        <button
          onClick={(e) => { e.stopPropagation(); item.toggle!(); }}
          aria-label="Zapisz"
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 shadow-sm backdrop-blur active:scale-90"
        >
          <Heart size={14} className={item.saved ? 'fill-coral text-coral animate-pop' : 'text-black/40'} />
        </button>
      )}
    </div>
  );
}

/** Standardowa siatka kafli 2-kolumnowa. */
export function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>;
}

/** Status bonu pod kaflem — pokazujemy TYLKO gdy aktywny lub wykorzystany. Tap karty otwiera ekran oferty. */
export function OfferAction({ offer }: { offer: Offer }) {
  const { activeVoucherFor, navigate, redeemedOfferIds } = useApp();
  const usedUp = redeemedOfferIds.includes(offer.id);
  const active = activeVoucherFor(offer.id);

  if (usedUp) {
    return (
      <span className="flex w-full items-center justify-center gap-1 rounded-full bg-ink/8 py-1.5 text-[11.5px] font-bold text-ink/45">
        <BadgeCheck size={12} /> Zrealizowany
      </span>
    );
  }
  if (active) {
    return (
      <button
        onClick={() => navigate({ name: 'voucher-active', id: offer.id })}
        className="flex w-full items-center justify-center gap-0.5 rounded-full bg-success py-1.5 text-[11.5px] font-bold text-white active:scale-95"
      >
        Aktywny <ChevronRight size={12} />
      </button>
    );
  }
  return null;
}

// Polska odmiana: 1 oferta / 2–4 oferty / 5+ ofert.
function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (n === 1) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** Budowniczy danych kafla z obiektów domeny — jedno źródło wyglądu dla całej aplikacji. */
export function useTileBuilders() {
  const {
    user, currentCity, navigate, liveCount,
    isSavedEvent, toggleSaveEvent, isSavedVenue, toggleSaveVenue, isSavedOffer, toggleSaveOffer,
    isFollowing, toggleFollow, redeemedOfferIds,
  } = useApp();
  const here = user?.coords ?? currentCity.center;
  const distOf = (c: LatLng) => formatDistance(haversineKm(here, c));

  const eventTile = (e: EventItem): TileData => {
    const saved = isSavedEvent(e.id);
    return {
      id: 'e-' + e.id, type: 'event', cat: e.category, emoji: e.emoji, grad: e.gradient,
      tag: 'Wydarzenie', tagColor: '#7A5C99',
      photo: e.photo || photoUrl(e.category, e.id, 200, 200),
      title: e.title, subtitle: e.place, coords: e.coords,
      iso: e.dateIso, time: formatTime(e.dateIso), free: e.free, price: e.priceLabel,
      interest: interestOf(e.id) + (saved ? 1 : 0), // +1 gdy sam zapiszesz — jak na ekranie szczegółów
      onClick: () => navigate({ name: 'event', id: e.id }),
      saved, toggle: () => toggleSaveEvent(e.id),
    };
  };

  const offerTile = (o: Offer): TileData => {
    const v = venueById(o.venueId);
    const saved = isSavedOffer(o.id);
    return {
      id: 'o-' + o.id, type: 'offer', cat: v?.category ?? 'gastro', emoji: o.emoji, grad: [o.color, o.color],
      tag: o.kind === 'bon' ? 'Oferta Lokalio' : 'Promocja', tagColor: '#FF5A4D',
      photo: o.photo || photoUrl(v?.category ?? 'gastro', o.id, 200, 200),
      title: o.title, subtitle: o.subtitle, coords: v?.coords ?? currentCity.center,
      discount: o.discountLabel, valid: o.validLabel, interest: interestOf(o.id) + (saved ? 1 : 0), // +1 gdy sam zapiszesz
      redeemed: redeemedOfferIds.includes(o.id),
      onClick: () => navigate({ name: 'offer', id: o.id }),
      saved, toggle: () => toggleSaveOffer(o.id),
    };
  };

  const venueTile = (v: Venue, opts?: { subtitle?: string }): TileData => {
    const vOffers = offersForVenue(v.id).filter((o) => !redeemedOfferIds.includes(o.id)); // licznik ofert bez zrealizowanych
    const vEvents = eventsForVenue(v.id);
    // Oferty i wydarzenia — zawsze jako licznik: „1 oferta" / „3 oferty", „1 wydarzenie" / „2 wydarzenia".
    const offerInfo = vOffers.length === 0 ? undefined
      : `${vOffers.length} ${plural(vOffers.length, 'oferta', 'oferty', 'ofert')}`;
    const eventInfo = vEvents.length === 0 ? undefined
      : `${vEvents.length} ${plural(vEvents.length, 'wydarzenie', 'wydarzenia', 'wydarzeń')}`;
    const org = v.organizerId;
    return {
      id: 'v-' + v.id, type: 'venue', cat: v.category, emoji: v.emoji, grad: [v.color, v.color],
      tag: CATEGORY_META[v.category].label, tagColor: CATEGORY_META[v.category].color,
      photo: photoUrl(v.category, v.id, 200, 200),
      title: v.name, subtitle: opts?.subtitle ?? v.district, coords: v.coords,
      live: liveCount(v), followers: org ? organizerById(org)?.followers : undefined, offerInfo, eventInfo,
      following: org ? isFollowing(org) : false,
      follow: org ? () => toggleFollow(org) : undefined,
      onClick: () => navigate({ name: 'venue', id: v.id }),
      saved: isSavedVenue(v.id), toggle: () => toggleSaveVenue(v.id),
    };
  };

  const orgTile = (o: Organizer): TileData => {
    const cat = o.categories[0] ?? 'social';
    const color = CATEGORY_META[cat].color;
    return {
      id: 'org-' + o.id, type: 'org', cat, emoji: o.emoji, grad: [color, color + 'bb'],
      tag: o.kind === 'instytucja' ? 'Instytucja' : 'Lokal', tagColor: '#FF5A4D',
      photo: photoUrl(cat, o.id, 200, 200),
      title: o.name, subtitle: o.kind === 'instytucja' ? 'Instytucja' : 'Lokal',
      coords: currentCity.center,
      metaText: `${o.followers} obserwujących`,
      onClick: () => navigate({ name: 'organizer', id: o.id }),
    };
  };

  return { distOf, eventTile, offerTile, venueTile, orgTile };
}
