import { useState } from 'react';
import { ChevronLeft, Share2, MapPin, Lock, Navigation, Phone, Globe, Utensils, LocateFixed, BadgeCheck, Users, Clock, Ticket, CalendarDays, Pencil } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { CATEGORY_META } from '../theme';
import type { Venue } from '../types';

const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
export function fmtDays(days: number[]): string {
  if (!days.length) return '';
  const s = [...days].sort((a, b) => a - b);
  const contiguous = s.every((d, i) => i === 0 || d === s[i - 1] + 1);
  if (contiguous && s.length > 1) return `${DAYS[s[0]]}–${DAYS[s[s.length - 1]]}`;
  return s.map((d) => DAYS[d]).join(', ');
}
const SOCIAL_META = [
  { key: 'facebook', label: 'Facebook', base: 'https://facebook.com/' },
  { key: 'instagram', label: 'Instagram', base: 'https://instagram.com/' },
  { key: 'twitter', label: 'X', base: 'https://x.com/' },
  { key: 'linkedin', label: 'LinkedIn', base: 'https://linkedin.com/in/' },
  { key: 'youtube', label: 'YouTube', base: 'https://youtube.com/' },
  { key: 'tiktok', label: 'TikTok', base: 'https://tiktok.com/@' },
] as const;
import { haversineKm, formatDistance } from '../lib/geo';
import { openDirections } from '../lib/maps';
import { hashId, photoUrl } from '../lib/photos';
import { venueOfferInterest } from '../lib/stats';
import { venueById, offersForVenue, eventsForVenue, organizerById } from '../data/seed';
import { StaticMap } from '../components/StaticMap';
import { FeedTile, TileGrid, OfferAction, useTileBuilders } from '../components/FeedTile';
import { cx, CategoryTag, Sheet } from '../components/ui';

// Polska odmiana liczebników (1 / 2–4 / 5+).
const plFew = (n: number) => n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
const plOffers = (n: number) => (n === 1 ? 'oferta' : plFew(n) ? 'oferty' : 'ofert');
const plEvents = (n: number) => (n === 1 ? 'wydarzenie' : plFew(n) ? 'wydarzenia' : 'wydarzeń');

export function VenueDetail({ id }: { id: string }) {
  const venue = venueById(id);
  if (!venue) return null;
  return (
    <div className="relative h-full overflow-y-auto no-scrollbar bg-cream">
      <VenueDetailContent venue={venue} />
    </div>
  );
}

// Treść ekranu lokalu — współdzielona przez ekran konsumencki i podgląd w panelu firmowym.
// preview=true: bez przycisków wstecz/udostępnij i meldunku, zamiast „Obserwuj" pokazuje „Edytuj profil",
// chowa listy promocji/ofert/wydarzeń (zarządzane w osobnych zakładkach panelu).
export function VenueDetailContent({ venue, preview, onEdit }: { venue: Venue; preview?: boolean; onEdit?: () => void }) {
  const { user, back, checkIn, liveCount, isFollowing, toggleFollow, isSavedOffer, redeemedOfferIds, openShare, showToast, useMyLocation, locating } = useApp();
  const { eventTile, offerTile } = useTileBuilders();
  const [openStat, setOpenStat] = useState<'ruch' | 'dzisiaj' | 'promo' | 'obserwuje' | null>(null);
  const [geoPromptOpen, setGeoPromptOpen] = useState(false);
  if (!user) return null;

  const meta = CATEGORY_META[venue.category];
  const photo = venue.photo || photoUrl(venue.category, venue.id, 900, 420);
  const km = haversineKm(user.coords, venue.coords);
  const count = liveCount(venue);
  const offers = offersForVenue(venue.id).filter((o) => !redeemedOfferIds.includes(o.id)); // zrealizowane chowamy — są tylko w „Moje oferty"
  const events = eventsForVenue(venue.id);
  const org = organizerById(venue.organizerId);
  const followId = org?.id ?? venue.id; // lokale właściciela nie mają organizatora — obserwujemy sam lokal
  const following = isFollowing(followId);
  const checkedInHere = user.checkedInVenueId === venue.id;
  const promos = offers.filter((o) => o.kind !== 'bon');
  const lokalioOffers = offers.filter((o) => o.kind === 'bon');
  const hasFollowerOffers = lokalioOffers.some((o) => o.requireFollow);
  const ci = venue.checkin;
  const MIN_DEMO = 5; // próg k-anonimowości — poniżej nie pokazujemy demografii (ochrona tożsamości)
  const showDemo = count >= MIN_DEMO;
  const tooFar = km > 0.15; // meldunek tylko gdy realnie w lokalu (≈150 m) — integralność danych „live"

  // Statystyki „w pigułce" (na górze karty lokalu). +1 gdy sam obserwujesz — licznik reaguje na Twoją akcję.
  const followers = (org?.followers ?? 0) + (following ? 1 : 0);
  const h = hashId(venue.id);
  const trafficLabel = count >= 18 ? 'Duży ruch' : count >= 8 ? 'Średni ruch' : 'Spokojnie';
  const trafficEmoji = count >= 18 ? '🔥' : count >= 8 ? '⚡' : '🌿';
  const trendPct = ci.trend === 'up' ? 10 + (h % 40) : ci.trend === 'down' ? 5 + (h % 25) : 0;
  const trendText = ci.trend === 'up' ? `+${trendPct}% vs wczoraj` : ci.trend === 'down' ? `−${trendPct}% vs wczoraj` : 'bez zmian';
  const trendTint = ci.trend === 'up' ? 'text-success' : ci.trend === 'down' ? 'text-coral' : 'text-ink/45';
  const todayCount = count * 6 + (hashId(venue.id + 'today') % 30) + 10;

  // Ilu ludzi interesuje się promocjami i ofertami tego lokalu (suma po aktywnych ofertach; +1 za każdą ofertę, którą sam zapiszesz).
  const promoInterest = venueOfferInterest(offers) + offers.filter((o) => isSavedOffer(o.id)).length;

  // Statystyki — pomijamy te z wartością 0 (np. nowy lokal: 0 ruchu, 0 obserwujących, 0 ofert).
  const statCards = [
    count > 0 && { key: 'ruch' as const, emoji: trafficEmoji, value: `${count}/h`, label: trafficLabel, sub: trendText, subTint: trendTint },
    todayCount > 0 && { key: 'dzisiaj' as const, emoji: '👥', value: `${todayCount}`, label: 'osób dzisiaj', sub: venue.openUntil ? `do ${venue.openUntil.replace(/^do\s*/, '')}` : undefined, subTint: 'text-ink/45' },
    promoInterest > 0 && { key: 'promo' as const, emoji: '❤️', value: `${promoInterest}`, label: 'zainteresowanych', sub: 'ofertami', subTint: 'text-ink/45' },
    followers > 0 && { key: 'obserwuje' as const, emoji: '👁️', value: `${followers}`, label: 'obserwuje', sub: 'ten lokal', subTint: 'text-ink/45' },
  ].filter(Boolean) as { key: 'ruch' | 'dzisiaj' | 'promo' | 'obserwuje'; emoji: string; value: string; label: string; sub?: string; subTint?: string }[];

  // Akcje: Telefon · Strona · Menu (telefon/www tylko gdy znane z OSM).
  const actions: { icon: typeof Navigation; label: string; href?: string; onClick?: () => void }[] = [];
  if (venue.phone) actions.push({ icon: Phone, label: 'Zadzwoń', href: `tel:${venue.phone}` });
  if (venue.website) actions.push({ icon: Globe, label: 'Strona', href: venue.website });
  actions.push(
    venue.menu
      ? { icon: Utensils, label: 'Menu', href: venue.menu }
      : { icon: Utensils, label: 'Menu', onClick: () => showToast('Menu lokalu pojawi się wkrótce', '🍽️') },
  );

  return (
    <>
      {/* Zdjęcie u góry — jak na ekranie instytucji */}
      <div className="relative h-52">
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/55" />
        {!preview && (
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <GlassBtn onClick={back}><ChevronLeft size={22} /></GlassBtn>
            <GlassBtn onClick={() => openShare(venue.name)}><Share2 size={19} className="text-coral" /></GlassBtn>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="min-w-0">
            <h1 className="flex items-center gap-1.5 text-[22px] font-extrabold leading-tight tracking-tight text-white drop-shadow-md">
              {venue.name} {org?.verified && <BadgeCheck size={18} className="text-white" />}
            </h1>
            <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-white/85">
              <Users size={13} /> {followers} obserwujących · Lokal
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-10 pt-3">
        {/* Kategoria + obserwuj */}
        <div className="flex flex-wrap items-center gap-2">
          <CategoryTag label={meta.label} color={meta.color} soft={meta.soft} emoji={meta.emoji} />
          {venue.venueType && <span className="rounded-full bg-black/5 px-2.5 py-1 text-[12px] font-bold text-ink/60">{venue.venueType}</span>}
          {offers.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-2.5 py-1 text-[12px] font-bold text-coral"><Ticket size={12} /> {offers.length} {plOffers(offers.length)}</span>}
          {events.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2.5 py-1 text-[12px] font-bold text-info"><CalendarDays size={12} /> {events.length} {plEvents(events.length)}</span>}
        </div>
        {preview ? (
          <button
            onClick={onEdit}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3 text-[15px] font-bold text-white shadow-coral transition active:scale-[0.98]"
          >
            <Pencil size={17} /> Edytuj profil
          </button>
        ) : (
          <button
            onClick={() => toggleFollow(followId)}
            className={cx('mt-3 w-full rounded-2xl py-3 text-[15px] font-bold transition active:scale-[0.98]', following ? 'bg-black/5 text-ink/70' : 'bg-coral text-white shadow-coral')}
          >
            {following ? '🔔 Obserwujesz' : 'Obserwuj — powiadomimy o nowościach'}
          </button>
        )}

        {/* Adres — pełny, w dwóch liniach */}
        <div className="mt-4 flex items-center gap-3 rounded-card bg-paper p-3.5 shadow-card">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral"><MapPin size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink/45">Adres</p>
            <p className="text-[14px] font-semibold leading-snug text-ink">{venue.address}{venue.addrLine2 ? `, ${venue.addrLine2}` : ''}</p>
            <p className="text-[13px] text-ink/70">{[venue.postal, venue.city ?? venue.district, venue.region].filter(Boolean).join(' ')}</p>
          </div>
          <button
            onClick={() => openDirections(venue.coords)}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-coral/30 bg-coral/5 px-3 py-2 text-[12.5px] font-bold text-coral active:scale-95"
          >
            <Navigation size={14} /> Prowadź
          </button>
        </div>

        {/* Godziny otwarcia — pod adresem */}
        {venue.hours && venue.hours.length > 0 && (
          <div className="mt-3 rounded-card bg-paper p-4 shadow-card">
            <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-bold text-ink"><Clock size={16} className="text-coral" /> Godziny otwarcia</h2>
            <div className="space-y-1.5">
              {venue.hours.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-[13.5px]">
                  <span className="font-semibold text-ink/75">{fmtDays(h.days)}</span>
                  <span className="font-bold tabular-nums text-ink">{h.from}–{h.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statystyki w pigułce — tapnij, by rozwinąć; pomijamy zerowe */}
        {statCards.length > 0 && (
          <div className={cx('mt-4 grid gap-2', statCards.length === 1 ? 'grid-cols-1' : statCards.length === 2 || statCards.length === 4 ? 'grid-cols-2' : 'grid-cols-3')}>
            {statCards.map((s) => (
              <StatCard key={s.key} emoji={s.emoji} value={s.value} label={s.label} sub={s.sub} subTint={s.subTint} active={openStat === s.key} onClick={() => setOpenStat((o) => (o === s.key ? null : s.key))} />
            ))}
          </div>
        )}

        {/* Szybkie akcje */}
        <div className="mt-2.5 flex gap-2">
          {actions.map((a) => <ActionBtn key={a.label} icon={a.icon} label={a.label} href={a.href} onClick={a.onClick} />)}
        </div>

        {/* Szczegóły statystyki — rozwijane po tapnięciu karty */}
        {openStat && (
          <div className="mt-3 overflow-hidden rounded-card bg-paper p-4 shadow-card">
            {openStat === 'ruch' && (
              <>
                <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  Na żywo
                  <span className="ml-auto text-[11.5px] font-medium text-subtle">{ci.peak}</span>
                </p>
                {/* Demografia — anonimowo, z progiem k-anonimowości */}
                {showDemo ? (
                  <div className="mt-4">
                    <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink/50">Kto tu teraz jest (anonimowo)</p>
                    <div className="space-y-1.5">
                      <AgeBar label="18–25" pct={ci.age.y18_25} />
                      <AgeBar label="26–35" pct={ci.age.y26_35} />
                      <AgeBar label="36+" pct={ci.age.y36p} />
                    </div>
                    <div className="mt-3">
                      <div className="flex h-3 w-full overflow-hidden rounded-full">
                        <div className="h-full bg-coral" style={{ width: `${ci.gender.k}%` }} />
                        <div className="h-full bg-info" style={{ width: `${ci.gender.m}%` }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[11.5px] font-semibold">
                        <span className="text-coral">♀ {ci.gender.k}%</span>
                        <span className="text-info">{ci.gender.m}% ♂</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-black/[0.04] p-3">
                    <Lock size={16} className="shrink-0 text-ink/40" />
                    <p className="text-[12px] leading-snug text-ink/60">
                      Na razie kameralnie. Szczegóły demograficzne pokażemy, gdy będzie tu więcej osób — chronimy anonimowość.
                    </p>
                  </div>
                )}
              </>
            )}
            {openStat === 'dzisiaj' && (
              <p className="text-[13.5px] leading-relaxed text-ink/75">
                Dzisiaj zameldowało się tu około <span className="font-bold text-ink">{todayCount}</span> osób. {ci.peak}. Ruch dziś:{' '}
                <span className={cx('font-bold', trendTint)}>{trendText}</span>.
              </p>
            )}
            {openStat === 'promo' && (
              <p className="text-[13.5px] leading-relaxed text-ink/75">
                <span className="font-bold text-ink">{promoInterest}</span> osób zapisało sobie promocje i oferty tego lokalu — dostaną przypomnienie, zanim oferta się skończy.
              </p>
            )}
            {openStat === 'obserwuje' && (
              <p className="text-[13.5px] leading-relaxed text-ink/75">
                <span className="font-bold text-ink">{followers}</span> osób obserwuje ten lokal — jako pierwsi dostają powiadomienia o nowych wydarzeniach i promocjach.
              </p>
            )}
          </div>
        )}

        {/* Meldowanie — dostępne dopiero po włączeniu lokalizacji (GPS), i tylko gdy realnie w lokalu (anty-fałszywe meldunki). */}
        {!preview && (!user.usesRealLocation ? (
          <button
            onClick={() => setGeoPromptOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-3.5 text-[15px] font-bold text-white transition active:scale-[0.98]"
          >
            <MapPin size={18} /> Melduję się tutaj (+15 pkt)
          </button>
        ) : tooFar ? (
          <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-black/5 py-3.5 text-[13.5px] font-bold text-ink/45">
            <MapPin size={17} /> Podejdź bliżej, by się zameldować ({formatDistance(km)} stąd)
          </div>
        ) : (
          <button
            onClick={() => checkIn(venue.id)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-3.5 text-[15px] font-bold text-white transition active:scale-[0.98]"
          >
            <MapPin size={18} /> Melduję się tutaj (+15 pkt)
          </button>
        ))}

        <p className="mt-4 text-[14.5px] leading-relaxed text-ink/80">{venue.description}</p>

        {/* Galeria zdjęć */}
        {venue.gallery && venue.gallery.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2.5 text-[15px] font-bold text-ink">📸 Zdjęcia lokalu</h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
              {venue.gallery.map((src, i) => (
                <img key={i} src={src} alt="" loading="lazy" className="h-28 w-28 shrink-0 rounded-card object-cover shadow-card" />
              ))}
            </div>
          </div>
        )}

        {/* Sieci społecznościowe */}
        {venue.socials && Object.values(venue.socials).some(Boolean) && (
          <div className="mt-4 rounded-card bg-paper p-4 shadow-card">
            <h2 className="mb-2.5 text-[15px] font-bold text-ink">Sieci społecznościowe</h2>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_META.filter((m) => venue.socials?.[m.key]).map((m) => (
                <a key={m.key} href={m.base + venue.socials![m.key]} target="_blank" rel="noopener noreferrer" className="rounded-full bg-coral/10 px-3 py-1.5 text-[12.5px] font-bold text-coral active:scale-95">{m.label}</a>
              ))}
            </div>
          </div>
        )}

        {/* Promocje ogólne */}
        {!preview && promos.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-[16px] font-bold text-ink">🏷️ Promocje</h2>
            <TileGrid>
              {promos.map((o) => <FeedTile key={o.id} item={offerTile(o)} action={<OfferAction offer={o} />} />)}
            </TileGrid>
          </div>
        )}

        {/* Oferty Lokalio — tylko w aplikacji, za meldunek lub dla obserwujących */}
        {!preview && lokalioOffers.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-1 text-[16px] font-bold text-ink">🎁 Oferty Lokalio</h2>
            <p className="mb-3 text-[12.5px] leading-snug text-subtle">Dostępne tylko w aplikacji — część za zameldowanie w lokalu lub dla obserwujących.</p>
            {hasFollowerOffers && !following && (
              <button
                onClick={() => org && toggleFollow(org.id)}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#F0457E]/30 bg-[#F0457E]/8 py-2.5 text-[13px] font-bold text-[#F0457E] active:scale-[0.98]"
              >
                ❤️ Obserwuj, by dostawać oferty tylko dla obserwujących
              </button>
            )}
            <TileGrid>
              {lokalioOffers.map((o) => {
                const lockC = !!o.requireCheckin && !checkedInHere;
                const lockF = !!o.requireFollow && !following;
                const locked = lockC || lockF;
                return (
                  <FeedTile
                    key={o.id}
                    item={offerTile(o)}
                    action={locked
                      ? <span className="flex w-full items-center justify-center gap-1 rounded-full bg-ink/8 py-1.5 text-[11px] font-bold text-ink/55"><Lock size={11} /> {lockC ? 'Zamelduj się' : 'Dla obserwujących'}</span>
                      : <OfferAction offer={o} />}
                  />
                );
              })}
            </TileGrid>
          </div>
        )}

        {/* Wydarzenia w lokalu */}
        {!preview && events.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-[16px] font-bold text-ink">📅 Wydarzenia tutaj</h2>
            <TileGrid>
              {events.map((e) => <FeedTile key={e.id} item={eventTile(e)} />)}
            </TileGrid>
          </div>
        )}

        {/* Statyczna mapka lokalu */}
        <div className="mt-6 h-44 overflow-hidden rounded-card shadow-card">
          <StaticMap coords={venue.coords} color={venue.color} emoji={venue.emoji} label={venue.name} userCoords={user.coords} />
        </div>
        <button
          onClick={() => openDirections(venue.coords)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-coral/30 bg-coral/5 py-3 text-[14px] font-bold text-coral active:scale-[0.98]"
        >
          <Navigation size={17} /> Nawiguj w Google Maps
        </button>
      </div>

      {/* Okno: włącz lokalizację, by się zameldować */}
      {!preview && (
      <Sheet open={geoPromptOpen} onClose={() => setGeoPromptOpen(false)} title="Zamelduj się">
        <div className="pb-2 text-center">
          <div className="text-4xl">📍</div>
          <p className="mx-auto mt-3 max-w-[280px] text-[13.5px] leading-relaxed text-ink/70">
            Aby zameldować się w <span className="font-semibold text-ink">{venue.name}</span>, włącz lokalizację (GPS) — sprawdzamy, czy naprawdę tu jesteś.
          </p>
          <button
            onClick={() => { useMyLocation(); setGeoPromptOpen(false); }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3.5 text-[15px] font-bold text-white shadow-coral active:scale-[0.98]"
          >
            <LocateFixed size={18} className={locating ? 'animate-spin' : ''} /> Włącz lokalizację
          </button>
          <button onClick={() => setGeoPromptOpen(false)} className="mt-2 w-full py-2 text-[13px] font-semibold text-ink/50 active:opacity-70">
            Nie teraz
          </button>
        </div>
      </Sheet>
      )}
    </>
  );
}

function StatCard({ emoji, value, label, sub, subTint, active, onClick }: { emoji: string; value: string; label: string; sub?: string; subTint?: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cx('rounded-card bg-paper p-2.5 text-left shadow-card transition active:scale-95', active && 'ring-2 ring-coral')}>
      <div className="text-[18px] leading-none">{emoji}</div>
      <p className="mt-1.5 text-[16px] font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[11px] font-semibold leading-tight text-ink/55">{label}</p>
      {sub && <p className={cx('mt-0.5 text-[10.5px] font-bold leading-tight', subTint ?? 'text-ink/45')}>{sub}</p>}
    </button>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon: typeof Navigation;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const cls = 'flex flex-1 flex-col items-center gap-1 rounded-card bg-paper py-2.5 shadow-card active:scale-95';
  const inner = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-coral/10 text-coral"><Icon size={17} /></span>
      <span className="text-[10.5px] font-semibold text-ink/70">{label}</span>
    </>
  );
  return href ? (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={cls}>{inner}</a>
  ) : (
    <button onClick={onClick} className={cls}>{inner}</button>
  );
}

function GlassBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-full bg-paper/85 text-ink shadow-card backdrop-blur-md active:scale-90">
      {children}
    </button>
  );
}

function AgeBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[11.5px] font-semibold text-ink/60">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/8">
        <div className="h-full rounded-full bg-ink/70" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[11.5px] font-semibold tabular-nums text-ink/60">{pct}%</span>
    </div>
  );
}
