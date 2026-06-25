import { useMemo, useRef, useState } from 'react';
import { MapPin, ChevronRight, Mic, Sparkles, ArrowUpRight, Search, Target, Clock } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { CATEGORY_META, CATEGORY_ORDER } from '../theme';
import { haversineKm, formatDistance, formatRadius, widerRadius } from '../lib/geo';
import { isToday, DATE_OPTS, matchesDate } from '../lib/format';
import { venueById, organizerById } from '../data/seed';
import { hashId } from '../lib/photos';
import { FeedTile, useTileBuilders, type TileData } from '../components/FeedTile';
import { cx, FilterChip, OptionChip } from '../components/ui';
import { LocationSheet } from '../components/LocationSheet';
import type { CategoryKey, LatLng } from '../types';

// Szybkie wejście do agenta — nastroje.
const MOODS = [
  { label: 'Zjeść coś', emoji: '🍕' },
  { label: 'Posłuchać', emoji: '🎵' },
  { label: 'Spotkać się', emoji: '👥' },
  { label: 'Kultura', emoji: '🎭' },
  { label: 'Zaskocz mnie', emoji: '🎲' },
];

// ——— anonimowe agregaty (w demo deterministyczne; w produkcji liczone z realnych meldunków/zapisów/polubień) ———

// Maskotka Lokalio — prosty, sympatyczny stworek (SVG).
function Mascot({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 5c-13 0-22 9.5-22 24 0 8 3 14 7.5 18 .8.7.5 2-.6 2.4-1.2.4-2 1.6-1.7 2.9.3 1.3 1.6 2 2.9 1.7 2.2-.6 4.3-1.7 6-3.4 2.4 1 5 1.5 7.9 1.5s5.5-.5 7.9-1.5c1.7 1.7 3.8 2.8 6 3.4 1.3.3 2.6-.4 2.9-1.7.3-1.3-.5-2.5-1.7-2.9-1.1-.4-1.4-1.7-.6-2.4C51 43 54 37 54 29 54 14.5 45 5 32 5Z" fill="#fff" />
      <ellipse cx="24.5" cy="30" rx="3.3" ry="4.4" fill="#0F1729" />
      <ellipse cx="39.5" cy="30" rx="3.3" ry="4.4" fill="#0F1729" />
      <circle cx="25.8" cy="28.3" r="1.1" fill="#fff" />
      <circle cx="40.8" cy="28.3" r="1.1" fill="#fff" />
      <circle cx="18.5" cy="37" r="2.6" fill="#FFB5AE" />
      <circle cx="45.5" cy="37" r="2.6" fill="#FFB5AE" />
      <path d="M25 38c2.2 2.6 4.5 3.9 7 3.9s4.8-1.3 7-3.9" stroke="#0F1729" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M32 5c.8-2 1.7-3.4 2.7-4.2.7-.5 1.7.2 1.5 1.1-.3 1.3-.3 2.8.3 4.4" fill="#FF5A4D" />
    </svg>
  );
}
const likesOf = (id: string) => 30 + (hashId(id + '♥') % 140); // ile polubień (sygnał popularności)

// „za 45 min" / „za 2 h 10 min" — ile czasu do startu (sekcja „W okolicy teraz").
function untilLabel(iso?: string): string {
  if (!iso) return '';
  const min = Math.round((+new Date(iso) - Date.now()) / 60000);
  if (min <= 0) return 'zaraz';
  if (min < 60) return `za ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `za ${h} h ${m} min` : `za ${h} h`;
}

export function Home() {
  const { user, events, offers, venues, currentCity, navigate, setTab, setCity, liveCount, liveActive, setArmAgentVoice, setMapFocus, radiusKm, useMyLocation, locating } = useApp();
  const { eventTile, offerTile, venueTile } = useTileBuilders();
  const [locOpen, setLocOpen] = useState(false);
  const [feedTab, setFeedTab] = useState<'all' | 'events' | 'offers'>('all'); // oś TYP
  const [dateFilter, setDateFilter] = useState<string | null>(null); // oś DATA — niezależna, łączy się z typem
  const [eventCat, setEventCat] = useState<CategoryKey | 'all' | 'free'>('all'); // 'free' = kategoria „Darmowe"
  const [menu, setMenu] = useState<'data' | 'events' | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  if (!user) return null;
  const here = user.coords;
  const outOfArea = !liveActive && haversineKm(here, currentCity.center) > 30;
  const distOf = (c: LatLng) => formatDistance(haversineKm(here, c));

  // ——— Auto-poszerzanie promienia ———
  // Gdy w wybranym promieniu jest mało wydarzeń w najbliższym tygodniu (<3), feed po cichu
  // sięga do kolejnego progu, żeby nie świecił pustkami. Wybrany promień (radiusKm) zostaje
  // bez zmian — to tylko zasięg feedu; użytkownik może nadpisać ręcznie chipem/sliderem.
  const MIN_WEEK_EVENTS = 3;
  const { effectiveRadiusKm, autoExpanded } = useMemo(() => {
    const now = Date.now();
    const weekEnd = now + 7 * 86400000;
    const upcoming = events
      .filter((e) => { const t = +new Date(e.dateIso); return t >= now && t <= weekEnd; })
      .map((e) => haversineKm(here, e.coords));
    const countWithin = (km: number) => upcoming.reduce((n, d) => n + (d <= km ? 1 : 0), 0);
    let r = radiusKm;
    while (countWithin(r) < MIN_WEEK_EVENTS) {
      const wider = widerRadius(r);
      if (!wider) break;
      r = wider;
    }
    return { effectiveRadiusKm: r, autoExpanded: r > radiusKm };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, radiusKm, here.lat, here.lng]);

  // ile osób melduje się teraz w okolicy (anonimowo, suma liczników lokali)
  const peopleNow = useMemo(
    () => venues.reduce((s, v) => s + liveCount(v), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [venues, user.checkedInVenueId],
  );

  // ——— Sekcja „W okolicy teraz": blisko (≤2 km) ORAZ start w ciągu najbliższych 4 h ———
  const okolicyTeraz = useMemo(() => {
    const now = Date.now();
    const in4h = now + 4 * 3600 * 1000;
    return events
      .filter((e) => {
        const t = +new Date(e.dateIso);
        return t >= now && t <= in4h && haversineKm(here, e.coords) <= 2;
      })
      .sort((a, b) => +new Date(a.dateIso) - +new Date(b.dateIso)) // najwcześniejsze pierwsze
      .slice(0, 10)
      .map(eventTile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, here.lat, here.lng, user.savedEventIds]);

  // ——— Sekcja 2: Dzieje się teraz (tylko dzisiejsze wydarzenia) ———
  const liveItems = useMemo(() => {
    return events
      .filter((e) => isToday(e.dateIso))
      .sort((a, b) => +new Date(a.dateIso) - +new Date(b.dateIso))
      .slice(0, 6)
      .map(eventTile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, here.lat, here.lng, user.savedEventIds]);

  // ——— Karuzela: Nadchodzące wydarzenia (prawdziwe, opublikowane treści na pierwszym planie) ———
  const nadchodzace = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => +new Date(e.dateIso) >= now - 12 * 3600 * 1000)
      .sort((a, b) => {
        const pa = a.id.startsWith('pub-') ? 0 : 1; // opublikowane (realne) najpierw
        const pb = b.id.startsWith('pub-') ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return +new Date(a.dateIso) - +new Date(b.dateIso);
      })
      .slice(0, 10)
      .map(eventTile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, here.lat, here.lng, user.savedEventIds]);

  // ——— Karuzela: Blisko Ciebie (najbliżej — wydarzenia + promocje i bony) ———
  const blisko = useMemo(() => {
    const wrap: { tile: TileData; d: number }[] = [
      ...events.map((e) => ({ tile: eventTile(e), d: haversineKm(here, e.coords) })),
      ...offers.map((o) => {
        const v = venueById(o.venueId);
        return { tile: offerTile(o), d: haversineKm(here, v?.coords ?? currentCity.center) };
      }),
    ];
    return wrap.sort((a, b) => a.d - b.d).slice(0, 10).map((w) => w.tile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, offers, here.lat, here.lng, user.savedEventIds, user.savedOfferIds]);

  // ——— Karuzela: Popularne (popularność ogólna — lokale wg obserwujących, wydarzenia wg zainteresowania) ———
  // Skala obu typów różna, więc normalizujemy każdy do 0..1, by miks był sprawiedliwy (lokale nie betonują wydarzeń).
  const popularne = useMemo(() => {
    const evRaw = events.map((e) => ({ tile: eventTile(e), v: likesOf(e.id) }));
    const vnRaw = venues.map((v) => ({ tile: venueTile(v), v: organizerById(v.organizerId)?.followers ?? 0 }));
    const evMax = Math.max(1, ...evRaw.map((x) => x.v));
    const vnMax = Math.max(1, ...vnRaw.map((x) => x.v));
    return [
      ...evRaw.map((x) => ({ tile: x.tile, score: x.v / evMax })),
      ...vnRaw.map((x) => ({ tile: x.tile, score: x.v / vnMax })),
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.tile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, venues, here.lat, here.lng, user.savedEventIds, user.savedVenueIds, user.checkedInVenueId, user.followedOrganizerIds]);

  // ——— Karuzela: Lokale w pobliżu (miejsca + ile osób teraz — „żyjące miasto") ———
  const lokale = useMemo(() => {
    return venues
      .map((v) => ({ v, d: haversineKm(here, v.coords) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 10)
      .map(({ v }) => venueTile(v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, here.lat, here.lng, user.checkedInVenueId, user.savedVenueIds]);

  // ——— Sekcja 3: Dla Ciebie (mieszany feed, jednolity układ) ———
  const feedItems = useMemo(() => {
    const items: TileData[] = [
      ...events.map(eventTile),
      ...offers.map(offerTile),
    ];
    const filtered = items.filter((it) => {
      // oś TYP (Wszystko / Wydarzenia / Promocje)
      if (feedTab === 'offers' && it.type !== 'offer') return false;
      if (feedTab === 'events') {
        if (it.type !== 'event') return false;
        if (eventCat === 'free') { if (!it.free) return false; }
        else if (eventCat !== 'all' && it.cat !== eventCat) return false;
      }
      // oś DATA — wydarzenia z tej daty zostają; bony (bez konkretnej daty) przechodzą.
      if (dateFilter && it.type === 'event' && !(it.iso && matchesDate(it.iso, dateFilter))) return false;
      return true;
    });
    return filtered
      .map((it) => ({ it, d: haversineKm(here, it.coords) }))
      .filter((x) => x.d <= effectiveRadiusKm) // odcięcie promieniem (z auto-poszerzaniem, gdy mało wydarzeń)
      .sort((a, b) => a.d - b.d)
      .slice(0, 14)
      .map((x) => x.it);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, offers, feedTab, dateFilter, eventCat, effectiveRadiusKm, here.lat, here.lng, user.savedEventIds, user.savedOfferIds]);

  // „Na mapie" przy karuzeli → mapa pokazuje TYLKO pozycje z tej karuzeli (kind+id bez prefiksu kafla).
  const focusOnMap = (title: string, tiles: TileData[]) => {
    const items = tiles
      .filter((t) => t.type === 'event' || t.type === 'offer' || t.type === 'venue')
      .map((t) => ({ kind: t.type as 'event' | 'offer' | 'venue', id: t.id.slice(2) }));
    setMapFocus({ title, items });
    setTab('map');
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-6">
      {/* Header */}
      <div className="bg-gradient-to-b from-coral/10 to-transparent px-4 pb-2 pt-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">Cześć, {user.name}! 👋</h1>
            <p className="text-[15px] text-subtle">Odkrywaj, co dzieje się teraz w okolicy.</p>
          </div>
          <div className="mt-1 flex shrink-0 items-center gap-2">
            <button onClick={() => navigate({ name: 'search' })} aria-label="Szukaj" className="flex h-9 w-9 items-center justify-center rounded-full bg-paper text-coral shadow-sm active:scale-90">
              <Search size={18} />
            </button>
            <button
              onClick={() => navigate({ name: 'owner' })}
              className="rounded-full bg-paper px-3 py-1.5 text-[12px] font-bold text-coral shadow-sm active:scale-95"
            >
              🏪 Mam lokal
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setLocOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-paper px-3.5 py-2 text-[13px] font-bold text-ink shadow-sm active:scale-95"
          >
            <MapPin size={15} className="text-coral" />
            {user.usesRealLocation ? 'Twoja lokalizacja' : user.district ? `${currentCity.name} · ${user.district}` : currentCity.name}
            <ChevronRight size={14} className="text-ink/30" />
          </button>
          <button
            onClick={() => setTab('map')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-paper px-3.5 py-2 text-[13px] font-bold text-ink shadow-sm active:scale-95"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            {peopleNow} osób w okolicy teraz
          </button>
        </div>
      </div>

      {/* Sekcja 1 — Hero AI */}
      <div className="px-4 pt-2">
        <div className="overflow-hidden rounded-[20px] p-4 text-white shadow-coral" style={{ background: 'linear-gradient(125deg, #FF8275, #FF5A4D 55%, #E84B3F)' }}>
          <div className="flex items-center gap-3">
            <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full bg-white/25 ring-1 ring-white/30">
              <Mascot size={54} className="animate-bob drop-shadow" />
            </span>
            <div className="min-w-0">
              <p className="text-[20px] font-extrabold leading-tight">Co dziś chcesz zrobić?</p>
              <p className="mt-0.5 text-[13px] leading-snug text-white/85">Powiedz, na co masz ochotę — podpowiem.</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 rounded-full bg-paper px-2 py-1.5 shadow-sm">
            <button onClick={() => setTab('agent')} className="flex min-w-0 flex-1 items-center gap-2 rounded-full px-2.5 py-1.5 text-left active:scale-[0.99]">
              <Sparkles size={17} className="shrink-0 text-coral" />
              <span className="flex-1 truncate text-[14px] text-ink/40">Zapytaj Lokalio…</span>
            </button>
            <button onClick={() => { setArmAgentVoice(true); setTab('agent'); }} aria-label="Mów do Lokalio" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral active:scale-90">
              <Mic size={17} />
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {MOODS.map((m) => (
              <button
                key={m.label}
                onClick={() => setTab('agent')}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-paper px-3 py-1.5 text-[12.5px] font-bold text-ink shadow-sm active:scale-95"
              >
                <span>{m.emoji}</span> {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {outOfArea && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3 rounded-card border border-warning/30 bg-warning/10 p-3.5">
            <span className="text-2xl">🧭</span>
            <p className="flex-1 text-[12.5px] text-ink/75">Jesteś poza zasięgiem danych demo. Pilotaż obejmuje Sandomierz i okolice.</p>
            <button onClick={() => setCity(currentCity.id)} className="shrink-0 rounded-full bg-warning px-3 py-2 text-[12px] font-bold text-white active:scale-95">
              Pokaż {currentCity.name}
            </button>
          </div>
        </div>
      )}

      {/* Sekcja „W okolicy teraz" — blisko (≤2 km) i start w ciągu 4 h; sort po czasie */}
      <section className="pt-6">
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="flex items-center gap-2 text-[18px] font-extrabold tracking-tight text-ink">
            <Clock size={18} className="text-coral" /> W okolicy teraz
          </h2>
          {user.usesRealLocation && okolicyTeraz.length > 0 && (
            <button onClick={() => focusOnMap('W okolicy teraz', okolicyTeraz)} className="inline-flex items-center gap-0.5 rounded-full border border-black/10 bg-paper py-1 pl-2.5 pr-2 text-[12.5px] font-bold text-ink/75 shadow-sm active:scale-95">
              Na mapie <ArrowUpRight size={13} className="text-coral" />
            </button>
          )}
        </div>
        {!user.usesRealLocation ? (
          // brak realnej lokalizacji (GPS) — „co dzieje się obok" wymaga Twojego miejsca
          <div className="px-4">
            <div className="flex items-center gap-3 rounded-card border border-coral/15 bg-coral/5 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/12 text-xl">📍</span>
              <p className="flex-1 text-[12.5px] text-ink/75">Włącz lokalizację, żeby zobaczyć, co dzieje się tuż obok Ciebie.</p>
              <button onClick={useMyLocation} className="shrink-0 rounded-full bg-coral px-3.5 py-2 text-[12.5px] font-bold text-white shadow-coral active:scale-95">
                {locating ? '…' : 'Włącz'}
              </button>
            </div>
          </div>
        ) : okolicyTeraz.length > 0 ? (
          // te same kafle co reszta feedu; dolna linia: dystans · „za ile"
          <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar">
            {okolicyTeraz.map((it) => (
              <div key={it.id} className="w-[170px] shrink-0">
                {/* czas do startu PIERWSZY (sedno tej sekcji), potem dystans */}
                <FeedTile item={it} dist={`${untilLabel(it.iso)} · ${distOf(it.coords)}`} />
              </div>
            ))}
          </div>
        ) : (
          // brak wydarzeń tuż obok w tym oknie czasu — nie chowamy sekcji, kierujemy na mapę
          <div className="px-4">
            <button onClick={() => setTab('map')} className="flex w-full items-center gap-3 rounded-card bg-paper p-4 text-left shadow-card active:scale-[0.99]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/5 text-xl">🤫</span>
              <p className="flex-1 text-[12.5px] text-ink/75">Cisza w okolicy. <span className="font-bold text-coral">Zobacz wszystko na mapie →</span></p>
            </button>
          </div>
        )}
      </section>

      {/* Sekcja 2 — Dzieje się teraz */}
      {liveItems.length > 0 && (
        <section className="pt-6">
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 className="flex items-center gap-2 text-[18px] font-extrabold tracking-tight text-ink">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-coral" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coral" />
              </span>
              Dzieje się teraz
            </h2>
            <button onClick={() => focusOnMap('Dzieje się teraz', liveItems)} className="inline-flex items-center gap-0.5 rounded-full border border-black/10 bg-paper py-1 pl-2.5 pr-2 text-[12.5px] font-bold text-ink/75 shadow-sm active:scale-95">
              Na mapie <ArrowUpRight size={13} className="text-coral" />
            </button>
          </div>
          {/* Te same kafle co w „Dla Ciebie", poziome przewijanie. */}
          <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar">
            {liveItems.map((it) => (
              <div key={it.id} className="w-[170px] shrink-0">
                <FeedTile item={it} dist={distOf(it.coords)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Karuzele kuracyjne — „Więcej" włącza pasujący filtr w feedzie poniżej */}
      {nadchodzace.length > 0 && (
        <CarouselSection title="Nadchodzące wydarzenia" emoji="📅" items={nadchodzace} distOf={distOf} action="Na mapie" onAction={() => focusOnMap('Nadchodzące wydarzenia', nadchodzace)} />
      )}
      <CarouselSection title="Blisko Ciebie" emoji="📍" items={blisko} distOf={distOf} action="Na mapie" onAction={() => focusOnMap('Blisko Ciebie', blisko)} />
      <CarouselSection title="Popularne" emoji="🔥" items={popularne} distOf={distOf} action="Na mapie" onAction={() => focusOnMap('Popularne', popularne)} />
      <CarouselSection title="Lokale w pobliżu" emoji="🏪" items={lokale} distOf={distOf} action="Na mapie" onAction={() => focusOnMap('Lokale w pobliżu', lokale)} />

      {/* Sekcja 3 — Dla Ciebie */}
      <section ref={feedRef} className="scroll-mt-2 pt-7">
        <h2 className="mb-3 px-4 text-[18px] font-extrabold tracking-tight text-ink">Dla Ciebie</h2>
        {autoExpanded && (
          <div className="mx-4 mb-3 flex items-center gap-2 rounded-card border border-coral/20 bg-coral/5 p-3 text-[12.5px] text-ink/75">
            <Target size={15} className="shrink-0 text-coral" />
            <span>W bliskiej okolicy mało dziś — pokazujemy też okolice (<b className="text-ink">{formatRadius(effectiveRadiusKm)}</b>).</span>
          </div>
        )}
        <div className="mb-2 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          <FilterChip active={feedTab === 'all' && !dateFilter} onClick={() => { setFeedTab('all'); setDateFilter(null); setEventCat('all'); setMenu(null); }}>Wszystko</FilterChip>
          <FilterChip
            active={!!dateFilter}
            chevron
            open={menu === 'data'}
            onClick={() => setMenu(menu === 'data' ? null : 'data')}
            onClear={dateFilter ? () => { setDateFilter(null); setMenu(null); } : undefined}
          >
            {dateFilter ? (DATE_OPTS.find((o) => o.k === dateFilter)?.l ?? 'Data') : 'Data'}
          </FilterChip>
          <FilterChip
            active={feedTab === 'events'}
            chevron
            open={menu === 'events'}
            onClick={() => { if (feedTab !== 'events') { setFeedTab('events'); setEventCat('all'); setMenu('events'); } else { setMenu(menu === 'events' ? null : 'events'); } }}
            onClear={feedTab === 'events' ? () => { setFeedTab('all'); setEventCat('all'); setMenu(null); } : undefined}
          >
            {feedTab === 'events' && eventCat !== 'all' ? (eventCat === 'free' ? 'Darmowe' : CATEGORY_META[eventCat].label) : 'Wydarzenia'}
          </FilterChip>
          <FilterChip active={feedTab === 'offers'} onClick={() => { setFeedTab(feedTab === 'offers' ? 'all' : 'offers'); setMenu(null); }}>Promocje</FilterChip>
        </div>

        {menu === 'data' && (
          <div className="mb-3 flex gap-2 overflow-x-auto px-4 no-scrollbar">
            {DATE_OPTS.map((o) => (
              <OptionChip key={o.k} active={dateFilter === o.k} onClick={() => { setDateFilter(dateFilter === o.k ? null : o.k); setMenu(null); }}>{o.l}</OptionChip>
            ))}
          </div>
        )}
        {menu === 'events' && (
          <div className="mb-3 flex gap-2 overflow-x-auto px-4 no-scrollbar">
            <OptionChip active={feedTab === 'events' && eventCat === 'all'} onClick={() => { setEventCat('all'); setFeedTab('events'); setMenu(null); }}>Wszystkie</OptionChip>
            <OptionChip active={feedTab === 'events' && eventCat === 'free'} onClick={() => { setEventCat('free'); setFeedTab('events'); setMenu(null); }}>🆓 Darmowe</OptionChip>
            {CATEGORY_ORDER.map((c) => (
              <OptionChip key={c} active={feedTab === 'events' && eventCat === c} onClick={() => { setEventCat(c); setFeedTab('events'); setMenu(null); }}>
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </OptionChip>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5 px-4">
          {feedItems.length ? (
            feedItems.map((it) => <FeedTile key={it.id} item={it} dist={distOf(it.coords)} />)
          ) : (
            <p className="col-span-2 rounded-card bg-paper p-5 text-center text-[13px] text-subtle shadow-card">Brak pozycji dla tego filtra. 🙌</p>
          )}
        </div>
      </section>

      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
    </div>
  );
}

// ——— Karuzela kuracyjna (Blisko Ciebie / Popularne teraz / Lokale w pobliżu) ———
function CarouselSection({ title, emoji, items, distOf, action, onAction }: { title: string; emoji: string; items: TileData[]; distOf: (c: LatLng) => string; action?: string; onAction?: () => void }) {
  if (!items.length) return null;
  return (
    <section className="pt-6">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="flex items-center gap-2 text-[18px] font-extrabold tracking-tight text-ink">
          <span>{emoji}</span> {title}
        </h2>
        {action && (
          <button onClick={onAction} className="inline-flex items-center gap-0.5 rounded-full border border-black/10 bg-paper py-1 pl-2.5 pr-2 text-[12.5px] font-bold text-ink/75 shadow-sm active:scale-95">
            {action} <ArrowUpRight size={13} className="text-coral" />
          </button>
        )}
      </div>
      {/* Te same kafle co w „Dla Ciebie", tylko w poziomym przewijaniu (stała szerokość). */}
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar">
        {items.map((it) => (
          <div key={it.id} className="w-[170px] shrink-0">
            <FeedTile item={it} dist={distOf(it.coords)} />
          </div>
        ))}
      </div>
    </section>
  );
}

