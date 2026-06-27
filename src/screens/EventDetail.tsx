import { ChevronLeft, Share2, Heart, MapPin, Clock, BadgeCheck, Footprints, ArrowRight, Navigation, ExternalLink, Ticket, Users, Check } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { CATEGORY_META } from '../theme';
import { photoUrl, hashId } from '../lib/photos';
import { interestOf } from '../lib/stats';
import { haversineKm, formatDistance, walkMinutes } from '../lib/geo';
import { fullDateLabel } from '../lib/format';
import { openEventDirections } from '../lib/maps';
import { organizerById, venueById, eventById, activeEvents } from '../data/seed';
import { cityIdOf } from '../data/cities';
import { StaticMap } from '../components/StaticMap';
import { FeedTile, useTileBuilders } from '../components/FeedTile';
import { cx } from '../components/ui';
import type { EventItem } from '../types';

const toHref = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export function EventDetail({ id }: { id: string }) {
  const { user, events, back, isAttendingEvent, toggleAttendEvent } = useApp();
  const event = events.find((e) => e.id === id) ?? eventById(id);
  if (!user || !event) return null;
  const attending = isAttendingEvent(event.id);

  return (
    <div className="flex h-full flex-col bg-cream">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <EventDetailContent event={event} onBack={back} />
      </div>

      {/* Stopka CTA */}
      <div className="safe-bottom shrink-0 border-t border-black/5 bg-paper/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => toggleAttendEvent(event.id)}
          className={cx('flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold text-white transition active:scale-[0.98]', attending ? 'bg-success' : 'bg-coral shadow-coral')}
        >
          {attending ? <><Check size={19} /> Weźmiesz udział</> : <><Users size={19} /> Wezmę udział</>}
        </button>
      </div>
    </div>
  );
}

/**
 * Treść ekranu wydarzenia — współdzielona przez ekran klienta i podgląd w panelu firmowym.
 * `preview` ukrywa elementy zależne od kontekstu (akcje, nawigacja, podobne, miejsce).
 */
export function EventDetailContent({ event, preview = false, onBack }: { event: EventItem; preview?: boolean; onBack?: () => void }) {
  const { user, navigate, isSavedEvent, toggleSaveEvent, isAttendingEvent, isFollowing, toggleFollow, openShare, currentCity } = useApp();
  const { eventTile, distOf } = useTileBuilders();
  const meta = CATEGORY_META[event.category];
  const org = organizerById(event.organizerId);
  const venue = venueById(event.venueId);
  const km = user ? haversineKm(user.coords, event.coords) : 0;
  const saved = isSavedEvent(event.id);
  const attending = isAttendingEvent(event.id);
  const photo = event.photo || photoUrl(event.category, event.id, 1000, 600);
  const interested = interestOf(event.id) + (saved ? 1 : 0);
  const attendingCount = 4 + (hashId(event.id + 'att') % 40) + (attending ? 1 : 0);
  const eventCity = cityIdOf(event.coords);
  const similar = activeEvents().filter(
    (e) => e.category === event.category && e.id !== event.id && cityIdOf(e.coords) === eventCity,
  ).slice(0, 5);
  const noop = () => {};
  // Gospodarz wydarzenia: organizator, a gdy się nie rozwiązuje (wydarzenia właściciela) — sam lokal.
  const host = org
    ? { id: org.id, name: org.name, photo: photoUrl(org.categories[0] ?? 'culture', org.id, 120, 120), verified: org.verified, kindLabel: org.kind === 'instytucja' ? 'Instytucja' : 'Lokal', followers: org.followers + (isFollowing(org.id) ? 1 : 0) }
    : venue
      ? { id: venue.id, name: venue.name, photo: venue.photo || photoUrl(venue.category, venue.id, 120, 120), verified: false, kindLabel: 'Lokal', followers: isFollowing(venue.id) ? 1 : 0 }
      : null;
  const openHost = () => (venue ? navigate({ name: 'venue', id: venue.id }) : org ? navigate({ name: 'organizer', id: org.id }) : undefined);
  // „Miejsce wydarzenia" pokazujemy tylko, gdy różni się od lokalu/organizatora (gospodarza).
  const locationDiffers = !venue || event.place !== venue.name;
  // Pełny adres do meta (gdy znamy lokal) — inaczej sama nazwa miejsca.
  const placeFull = venue && venue.address ? `${venue.address}${venue.district ? `, ${venue.district}` : ''}` : event.place;

  return (
    <div className="bg-cream">
      {/* Hero — informacje nałożone na grafikę */}
      <div className="relative h-64">
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/45" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <GlassBtn onClick={onBack ?? noop}><ChevronLeft size={22} /></GlassBtn>
          {!preview && (
            <div className="flex gap-2">
              <GlassBtn onClick={() => openShare(event.title)}><Share2 size={19} /></GlassBtn>
              <GlassBtn onClick={() => toggleSaveEvent(event.id)}>
                <Heart size={19} className={cx(saved ? 'fill-coral text-coral' : 'text-white')} />
              </GlassBtn>
            </div>
          )}
        </div>
        {event.promoted && (
          <span className="absolute left-3 top-16 rounded-full bg-coral px-2.5 py-1 text-[11px] font-bold text-white shadow-coral">🔥 Promowane</span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h1 className="text-[23px] font-extrabold leading-tight tracking-tight drop-shadow-md">{event.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {event.free
              ? <span className="rounded-full bg-success px-2.5 py-1 text-[11.5px] font-bold text-white">Wstęp wolny</span>
              : <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-bold text-coral">{event.priceLabel}</span>}
            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-bold text-white backdrop-blur">{meta.emoji} {meta.label}</span>
            {event.ageMin && <span className="rounded-full bg-black/40 px-2 py-1 text-[11px] font-bold text-white backdrop-blur">{event.ageMin}+</span>}
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 pt-4">
        {/* Zainteresowanie / udział — chowamy w podglądzie (panel ma własne statystyki; nieopublikowane wydarzenie nie ma danych) */}
        {!preview && (
          <div className="grid grid-cols-2 gap-2.5">
            <EvStat icon={Heart} tint="#F0457E" value={interested} label="zainteresowanych" />
            <EvStat icon={Users} tint="#3FAE83" value={attendingCount} label="weźmie udział" />
          </div>
        )}

        {/* Organizator / gospodarz */}
        {host && (
          <div
            role={preview ? undefined : 'button'}
            onClick={preview ? undefined : openHost}
            className={cx('mt-3 flex w-full items-center gap-3 rounded-card bg-paper p-3 text-left shadow-card', !preview && 'cursor-pointer')}
          >
            <img src={host.photo} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-[14px] font-bold text-ink">
                {host.name} {host.verified && <BadgeCheck size={14} className="text-info" />}
              </p>
              <p className="text-[12px] text-subtle">{host.kindLabel}{host.followers > 0 ? ` · ${host.followers} obserwujących` : ''}</p>
            </div>
            {!preview && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleFollow(host.id); }}
                className={cx('rounded-full px-3.5 py-2 text-[12px] font-bold active:scale-95', isFollowing(host.id) ? 'bg-black/5 text-ink/70' : 'bg-coral text-white')}
              >
                {isFollowing(host.id) ? 'Obserwujesz' : 'Obserwuj'}
              </button>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="mt-4 space-y-2.5 rounded-card bg-paper p-4 shadow-card">
          <MetaRow icon={Clock} text={fullDateLabel(event.dateIso)} />
          <MetaRow icon={MapPin} text={placeFull} />
          {!preview && <MetaRow icon={Footprints} text={`${formatDistance(km)} stąd · ok. ${walkMinutes(km)} min spacerem`} />}
          <MetaRow icon={Heart} text={event.priceLabel} accent />
        </div>

        {/* Opis wydarzenia */}
        <div className="mt-4 rounded-card bg-paper p-4 shadow-card">
          <h2 className="mb-1.5 text-[14px] font-bold text-ink">Opis wydarzenia</h2>
          <p className="text-[14px] leading-relaxed text-ink/75">{event.description}</p>
          {event.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {event.tags.map((t) => (
                <span key={t} className="rounded-full bg-black/5 px-3 py-1 text-[12px] font-medium text-ink/60">#{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Linki do wydarzenia / biletu */}
        {(event.eventUrl || event.ticketUrl) && (
          <div className="mt-4 flex gap-2">
            {event.eventUrl && <a href={preview ? undefined : toHref(event.eventUrl)} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-black/10 bg-paper py-3 text-[14px] font-bold text-ink/75 shadow-card active:scale-[0.98]"><ExternalLink size={16} /> Strona wydarzenia</a>}
            {event.ticketUrl && <a href={preview ? undefined : toHref(event.ticketUrl)} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-coral py-3 text-[14px] font-bold text-white shadow-coral active:scale-[0.98]"><Ticket size={16} /> Kup bilet</a>}
          </div>
        )}

        {/* Mapka miejsca */}
        <div className="mt-5 h-44 overflow-hidden rounded-card shadow-card">
          <StaticMap coords={event.coords} color={meta.color} emoji={event.emoji} label={event.place} userCoords={user?.coords} />
        </div>
        {!preview && (
          <button
            onClick={() => openEventDirections(event, currentCity.name)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-coral/30 bg-coral/5 py-3 text-[14px] font-bold text-coral active:scale-[0.98]"
          >
            <Navigation size={17} /> Nawiguj w Google Maps
          </button>
        )}

        {/* Miejsce wydarzenia — tylko gdy różni się od gospodarza; styl jak „Lokalizacja" na ekranie oferty */}
        {!preview && locationDiffers && (
          <div className="mt-6">
            <h2 className="mb-3 text-[16px] font-bold text-ink">📍 Miejsce wydarzenia</h2>
            <div className="flex items-center gap-2 rounded-card bg-paper p-3 shadow-card">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral"><MapPin size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-snug text-ink">{event.place}</p>
              </div>
              <button onClick={() => openEventDirections(event, currentCity.name)} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-coral/30 bg-coral/5 px-3 py-2 text-[12.5px] font-bold text-coral active:scale-95"><Navigation size={14} /> Prowadź</button>
            </div>
          </div>
        )}

        {/* Podobne — tylko w aplikacji */}
        {!preview && similar.length > 0 && (
          <div className="mt-7">
            <h2 className="mb-3 flex items-center justify-between text-[16px] font-bold text-ink">
              Podobne wydarzenia <ArrowRight size={16} className="text-ink/30" />
            </h2>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
              {similar.map((e) => (
                <div key={e.id} className="w-[176px] shrink-0">
                  <FeedTile item={eventTile(e)} dist={distOf(e.coords)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GlassBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md active:scale-90">
      {children}
    </button>
  );
}

function EvStat({ icon: Icon, tint, value, label }: { icon: typeof Users; tint: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-card bg-paper p-3 shadow-card">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${tint}1f`, color: tint }}><Icon size={17} /></span>
      <div className="min-w-0">
        <p className="text-[17px] font-extrabold leading-none text-ink">{value}</p>
        <p className="mt-0.5 text-[11px] font-medium leading-tight text-subtle">{label}</p>
      </div>
    </div>
  );
}

function MetaRow({ icon: Icon, text, accent }: { icon: typeof Clock; text: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={17} className={accent ? 'text-coral' : 'text-ink/40'} />
      <span className={cx('text-[14px]', accent ? 'font-bold text-coral' : 'font-medium text-ink/80')}>{text}</span>
    </div>
  );
}
