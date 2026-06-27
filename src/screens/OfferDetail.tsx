import { ChevronLeft, ChevronRight, Share2, Heart, MapPin, Users, Clock, Ticket, Navigation, Lock, Eye, BadgeCheck, CalendarDays, Tag, Info } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { offerById, venueById, organizerById, offersForVenue, eventsForVenue } from '../data/seed';
import { haversineKm, formatDistance } from '../lib/geo';
import { openVenueDirections } from '../lib/maps';
import { hashId, photoUrl } from '../lib/photos';
import { interestOf } from '../lib/stats';
import { StaticMap } from '../components/StaticMap';
import { cx } from '../components/ui';
import type { Offer, Venue, LatLng } from '../types';

export function OfferDetail({ id }: { id: string }) {
  const { user, offers, account, back, navigate, setTab, openShare, isSavedOffer, toggleSaveOffer, activeVoucherFor, activateVoucher, redeemedOfferIds, showToast, isFollowing, toggleFollow, currentCity } = useApp();
  const offer = offers.find((o) => o.id === id) ?? offerById(id);

  if (!user || !offer) return null;

  const venue = venueById(offer.venueId);
  const org = venue ? organizerById(venue.organizerId) : undefined;
  const km = venue ? haversineKm(user.coords, venue.coords) : undefined;
  const saved = isSavedOffer(offer.id);
  const active = activeVoucherFor(offer.id);

  const kindLabel = offer.kind === 'bon' ? 'ofertę' : 'promocję';
  const ended = offer.ended === true;
  const redeemed = redeemedOfferIds.includes(offer.id);
  const blockedYoung = offer.ageMin != null && user.age < offer.ageMin;
  // Z Ofert Lokalio (kind === 'bon') mogą skorzystać TYLKO zalogowani. Zadania (meldunek/obserwacja) dochodzą PO zalogowaniu.
  const needsLogin = offer.kind === 'bon' && !account;
  const checkedInHere = user.checkedInVenueId === offer.venueId;
  const followingVenue = org ? isFollowing(org.id) : false;
  const lockedCheckin = !!offer.requireCheckin && !checkedInHere && !active && !redeemed;
  const lockedFollow = !!offer.requireFollow && !followingVenue && !active && !redeemed;

  const onActivate = () => {
    if (ended || redeemed) return;
    if (active) { navigate({ name: 'voucher-active', id: offer.id }); return; }
    if (blockedYoung) { showToast(`Ta ${kindLabel} jest tylko dla ${offer.ageMin}+`, '🔞'); return; }
    if (needsLogin) { setTab('profile'); return; }
    if (lockedFollow) { if (org) toggleFollow(org.id); showToast('Obserwujesz lokal — oferta odblokowana ❤️', '❤️'); return; }
    if (lockedCheckin) { showToast('Zamelduj się w lokalu, aby odblokować', '📍'); navigate({ name: 'venue', id: offer.venueId }); return; }
    activateVoucher(offer.id);
    navigate({ name: 'voucher-active', id: offer.id });
  };

  return (
    <div className="flex h-full flex-col bg-cream">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <OfferDetailContent
          offer={offer} venue={venue} km={km} saved={saved} following={followingVenue} checkedInHere={checkedInHere} redeemed={redeemed} userCoords={user.coords} cityName={currentCity.name}
          onBack={back} onSave={() => toggleSaveOffer(offer.id)} onShare={() => openShare(offer.title)}
          onOpenVenue={venue ? () => navigate({ name: 'venue', id: venue.id }) : undefined}
        />
      </div>

      {/* CTA — aktywacja / informacja o realizacji */}
      <div className="safe-bottom shrink-0 border-t border-black/5 bg-paper/95 px-4 py-3 backdrop-blur">
        {ended ? (
          <div className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-ink/8 py-3.5 text-center font-extrabold text-ink/55">
            <Lock size={20} />
            <div className="leading-tight">
              <p className="text-[16px]">{offer.kind === 'bon' ? 'Oferta zakończona' : 'Promocja zakończona'}</p>
              <p className="text-[11.5px] font-medium text-ink/45">Ta oferta nie jest już dostępna</p>
            </div>
          </div>
        ) : redeemed ? (
          <div className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-success/12 py-3.5 text-center font-extrabold text-success">
            <BadgeCheck size={22} />
            <div className="leading-tight">
              <p className="text-[16px]">Zrealizowano</p>
              <p className="text-[11.5px] font-medium text-success/80">Ta oferta została już wykorzystana</p>
            </div>
          </div>
        ) : (
          <button
            onClick={onActivate}
            className={cx(
              'flex w-full items-center justify-center gap-2.5 rounded-2xl py-3.5 font-extrabold text-white transition active:scale-[0.98]',
              blockedYoung ? 'bg-ink/30' : needsLogin ? 'bg-coral shadow-coral' : lockedFollow ? 'bg-[#F0457E] shadow-coral' : lockedCheckin ? 'bg-success' : 'bg-coral shadow-coral',
            )}
          >
            {needsLogin || lockedCheckin || lockedFollow ? <Lock size={20} /> : <Ticket size={22} />}
            <div className="text-center leading-tight">
              <p className="text-[16px]">
                {active ? `Pokaż aktywną ${kindLabel}` : blockedYoung ? `Tylko ${offer.ageMin}+` : needsLogin ? 'Zaloguj się' : lockedFollow ? 'Obserwuj, by odblokować' : lockedCheckin ? 'Zamelduj się, aby odblokować' : `Aktywuj ${kindLabel}`}
              </p>
              <p className="text-[11.5px] font-medium text-white/85">
                {active ? 'Oferta jest aktywna' : needsLogin ? `${offer.kind === 'bon' ? 'Oferty' : 'Promocje'} po zalogowaniu` : lockedFollow ? 'Oferta tylko dla obserwujących lokal' : lockedCheckin ? 'Wymaga meldunku w lokalu (GPS)' : 'Pokaż telefon przy kasie'}
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// Polska odmiana liczebników (1 / 2–4 / 5+).
const plFew = (n: number) => n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
const plOffers = (n: number) => (n === 1 ? 'oferta' : plFew(n) ? 'oferty' : 'ofert');
const plEvents = (n: number) => (n === 1 ? 'wydarzenie' : plFew(n) ? 'wydarzenia' : 'wydarzeń');

// Plakietki: za co / dla kogo oferta — wyliczane z danych formularza.
function accessBadges(offer: Offer): { label: string; cls: string }[] {
  const items: { label: string; cls: string }[] = [];
  if (!offer.requireCheckin && !offer.requireFollow) {
    items.push(offer.kind === 'bon'
      ? { label: 'Dostępna w aplikacji', cls: 'bg-ink/8 text-ink/65' }
      : { label: 'Promocja publiczna', cls: 'bg-success/14 text-success' });
  }
  if (offer.requireCheckin) items.push({ label: '📍 Za meldunek', cls: 'bg-coral/12 text-coral' });
  if (offer.requireFollow) items.push({ label: '❤️ Dla obserwujących', cls: 'bg-[#F0457E]/12 text-[#F0457E]' });
  if (offer.ageMin) items.push({ label: `${offer.ageMin}+`, cls: 'bg-ink/8 text-ink/70' });
  return items;
}

/**
 * Treść ekranu promocji/oferty — współdzielona przez ekran klienta i podgląd w panelu.
 * `preview` ukrywa elementy zależne od kontekstu (odległość, „Prowadź").
 */
export function OfferDetailContent({ offer, venue, preview = false, km, saved = false, following = false, checkedInHere = false, redeemed = false, userCoords, cityName, onBack, onSave, onShare, onOpenVenue }: {
  offer: Offer;
  venue?: Venue;
  preview?: boolean;
  km?: number;
  saved?: boolean;
  following?: boolean;
  checkedInHere?: boolean;
  redeemed?: boolean;
  userCoords?: LatLng;
  cityName?: string; // fallback miasta dla nawigacji „Prowadź"
  onBack?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onOpenVenue?: () => void;
}) {
  const org = venue ? organizerById(venue.organizerId) : undefined;
  const photo = offer.photo || photoUrl(venue?.category ?? 'gastro', offer.id, 1000, 600);
  const interested = interestOf(offer.id) + (saved ? 1 : 0);
  const followers = (org?.followers ?? 0) + (following ? 1 : 0); // ten sam wzór co na ekranie lokalu (+1 gdy obserwujesz)
  const usedCount = 40 + (hashId(offer.id + 'used') % 180) + (redeemed ? 1 : 0); // +1 gdy sam zrealizujesz
  const liveHour = (venue?.checkin.base ?? (8 + (hashId(offer.id + 'l') % 40))) + (checkedInHere ? 1 : 0); // +1 gdy zameldowany — jak „ruch" na ekranie lokalu
  const thumbs: (string | number)[] = venue?.gallery && venue.gallery.length ? venue.gallery.slice(0, 4) : [0, 1, 2, 3];
  const offerCount = venue ? offersForVenue(venue.id).length : 0;
  const eventCount = venue ? eventsForVenue(venue.id).length : 0;
  const badges = accessBadges(offer);
  const noop = () => {};

  return (
    <div className="bg-cream">
      {/* Hero — informacje nałożone na grafikę */}
      <div className="relative">
        <img src={photo} alt="" className="h-60 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/45" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <GlassBtn onClick={onBack ?? noop}><ChevronLeft size={22} /></GlassBtn>
          <div className="flex gap-2">
            <GlassBtn onClick={onSave ?? noop}><Heart size={18} className={saved ? 'fill-coral text-coral' : ''} /></GlassBtn>
            <GlassBtn onClick={onShare ?? noop}><Share2 size={18} /></GlassBtn>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <span className="inline-block rounded-xl bg-white/95 px-3 py-1.5 text-[22px] font-extrabold leading-none text-coral shadow-md">{offer.discountLabel}</span>
          <h1 className="mt-2.5 text-[22px] font-extrabold leading-tight drop-shadow-md">{offer.title}</h1>
          <p className="mt-1 text-[13px] font-bold opacity-95 drop-shadow">{org?.name ?? venue?.name ?? offer.subtitle}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold opacity-95 drop-shadow"><Clock size={13} /> {offer.validLabel}</p>
        </div>
      </div>

      <div className="px-4 pb-5">
        {/* Plakietki dostępu + ocena / odległość */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {badges.map((b, i) => <span key={i} className={cx('rounded-full px-2.5 py-1 text-[11.5px] font-bold', b.cls)}>{b.label}</span>)}
          {!preview && km != null && <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[11.5px] font-bold text-ink/70 shadow-card"><MapPin size={11} /> {formatDistance(km)} od Ciebie</span>}
        </div>

        {/* Opis */}
        {offer.description && <p className="mt-3.5 text-[14px] leading-relaxed text-ink/80">{offer.description}</p>}

        {/* Szczegóły */}
        {offer.terms.length > 0 && (
          <Section title="Szczegóły">
            <div className="grid grid-cols-3 gap-2">
              {offer.terms.slice(0, 3).map((t, i) => (
                <div key={i} className="rounded-card bg-paper p-3 shadow-card">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral/10 text-coral">{[<CalendarDays size={15} />, <Tag size={15} />, <Info size={15} />][i] ?? <Info size={15} />}</span>
                  <p className="mt-2 text-[11.5px] font-medium leading-snug text-ink/75">{t}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Popularność — chowamy w podglądzie (panel firmowy ma własne statystyki; nieopublikowana oferta nie ma realnych danych) */}
        {!preview && (
          <Section title="Popularność">
            <div className="grid grid-cols-2 gap-2">
              <Stat icon={Heart} tint="#F0457E" value={interested} label="zainteresowanych" />
              <Stat icon={Eye} tint="#FF5A4D" value={followers} label="osób obserwuje lokal" />
              <Stat icon={Ticket} tint="#7A5C99" value={usedCount} label="osoby skorzystały" />
              <Stat icon={Users} tint="#3FAE83" value={liveHour} label="meldunków / godz." />
            </div>
          </Section>
        )}

        {/* Zdjęcia lokalu */}
        <Section title="Zdjęcia lokalu">
          <div className="flex gap-2">
            {thumbs.map((g, i) => (
              <span key={i} className="relative h-20 flex-1 overflow-hidden rounded-2xl bg-muted/40">
                <img src={typeof g === 'string' ? g : photoUrl(venue?.category ?? 'gastro', offer.id + '-' + i, 200, 200)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="absolute inset-0 h-full w-full object-cover" />
              </span>
            ))}
          </div>
        </Section>

        {/* Lokalizacja */}
        {venue && (
          <Section title="Lokalizacja">
            <div className="flex items-center gap-2 rounded-card bg-paper p-3 shadow-card">
              <button onClick={onOpenVenue ?? noop} disabled={!onOpenVenue} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default active:opacity-80">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral"><MapPin size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-ink">{venue.name}</p>
                  <p className="truncate text-[12px] text-subtle">{venue.address}, {venue.district}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-bold text-coral">
                    <span>🎟️ {offerCount} {plOffers(offerCount)}</span>
                    <span className="text-info">📅 {eventCount} {plEvents(eventCount)}</span>
                  </p>
                </div>
                {onOpenVenue && <ChevronRight size={18} className="shrink-0 text-ink/30" />}
              </button>
              {!preview && <button onClick={() => openVenueDirections(venue, cityName)} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-coral/30 bg-coral/5 px-3 py-2 text-[12.5px] font-bold text-coral active:scale-95"><Navigation size={14} /> Prowadź</button>}
            </div>
            <div className="mt-2 h-28 overflow-hidden rounded-card shadow-card">
              <StaticMap coords={venue.coords} color={venue.color} emoji={venue.emoji} label={venue.name} userCoords={userCoords} />
            </div>
          </Section>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h2 className="mb-2 text-[15px] font-bold text-ink">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ icon: Icon, tint, value, label }: { icon: typeof Users; tint: string; value: number; label: string }) {
  return (
    <div className="rounded-card bg-paper p-3 shadow-card">
      <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `${tint}1f`, color: tint }}><Icon size={15} /></span>
      <p className="mt-1.5 text-[18px] font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-0.5 text-[10.5px] font-medium leading-tight text-subtle">{label}</p>
    </div>
  );
}
