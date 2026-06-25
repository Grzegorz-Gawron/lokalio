import { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Target } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { MapView, type MapMarker } from '../components/MapView';
import { MapCarousel, type MapCarItem } from '../components/MapCarousel';
import { useTileBuilders } from '../components/FeedTile';
import { LocationSheet } from '../components/LocationSheet';
import { CATEGORY_META, CATEGORY_ORDER } from '../theme';
import { haversineKm, formatDistance, formatRadius, nextRadius } from '../lib/geo';
import { dateChipLabel, isToday, DATE_OPTS, matchesDate } from '../lib/format';
import { eventById, venueById, offerById } from '../data/seed';
import { offerMainCat } from '../lib/business';
import { hashId } from '../lib/photos';
import { FilterChip, OptionChip } from '../components/ui';
import type { CategoryKey, LatLng } from '../types';

// Kolejność „spaceru": start od pinezki najbliższej użytkownikowi, a każda następna
// to najbliższa pinezka względem poprzedniej (najbliższy sąsiad). Dzięki temu
// przesuwanie karuzeli przechodzi między sąsiadującymi pinezkami, a nie skacze po mapie.
function orderByProximity(list: MapMarker[], here: LatLng): MapMarker[] {
  if (list.length <= 2) return [...list].sort((a, b) => haversineKm(here, a.coords) - haversineKm(here, b.coords));
  const remaining = [...list].sort((a, b) => haversineKm(here, a.coords) - haversineKm(here, b.coords));
  const path: MapMarker[] = [remaining.shift()!];
  while (remaining.length) {
    const last = path[path.length - 1].coords;
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(last, remaining[i].coords);
      if (d < bestD) { bestD = d; bestI = i; }
    }
    path.push(remaining.splice(bestI, 1)[0]);
  }
  return path;
}

export function MapScreen() {
  const { user, events, offers, venues, currentCity, navigate, locating, setCity, mapFocus, setMapFocus, radiusKm, setRadiusKm, showToast } = useApp();
  // Wejście z karuzeli „Na dziś" pokazuje tylko jej pozycje; przy wyjściu z mapy czyścimy skupienie.
  useEffect(() => () => setMapFocus(null), [setMapFocus]);
  // Mapa: trzy typy treści — Wydarzenia (z datą/popularne/kategoriami) / Promocje / Lokale.
  const [tab, setTab] = useState<'events' | 'offers' | 'venues'>('events');
  const [dateSel, setDateSel] = useState<string | null>(null); // null = domyślnie dzisiejsze wydarzenia
  const [eventCat, setEventCat] = useState<CategoryKey | 'all' | 'free' | 'popular'>('all');
  const [placeCat, setPlaceCat] = useState<CategoryKey | 'all'>('all'); // kategoria dla zakładek Lokale i Promocje
  const [menu, setMenu] = useState<'events' | 'offers' | 'venues' | null>(null);
  const [dateOpen, setDateOpen] = useState(false); // podlista „Data" w rozwijanej liście wydarzeń
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [locOpen, setLocOpen] = useState(false);
  const [carouselClosed, setCarouselClosed] = useState(false);
  const { eventTile, offerTile, venueTile, distOf } = useTileBuilders();
  if (!user) return null;
  const here = user.coords;

  const markers = useMemo(() => {
    const out: MapMarker[] = [];
    if (mapFocus) {
      // Skupienie z karuzeli „Na dziś" — pokazujemy WYŁĄCZNIE wskazane pozycje (dowolny typ), z pominięciem zakładek/filtrów.
      for (const it of mapFocus.items) {
        if (it.kind === 'event') {
          const e = eventById(it.id);
          if (e) out.push({ id: e.id, kind: 'event', coords: e.coords, emoji: e.emoji, color: CATEGORY_META[e.category].color, label: e.title });
        } else if (it.kind === 'offer') {
          const o = offerById(it.id);
          const v = o ? venueById(o.venueId) : undefined;
          if (o && v) { const ocat = o.promoCategory ? offerMainCat(o.promoCategory) : v.category; out.push({ id: o.id, kind: 'offer', coords: v.coords, emoji: o.emoji, color: CATEGORY_META[ocat].color, label: o.title }); }
        } else {
          const v = venueById(it.id);
          if (v) out.push({ id: v.id, kind: 'venue', coords: v.coords, emoji: v.emoji, color: CATEGORY_META[v.category].color, label: v.name });
        }
      }
      return orderByProximity(out, here);
    }
    if (tab === 'events') {
      // bez daty i bez „Popularne" → domyślnie dzisiejsze wydarzenia (widok „teraz")
      const dateOk = (iso: string) => (dateSel ? matchesDate(iso, dateSel) : eventCat === 'popular' ? true : isToday(iso));
      let evs = events.filter((e) => dateOk(e.dateIso));
      if (eventCat === 'free') evs = evs.filter((e) => e.free);
      else if (eventCat !== 'all' && eventCat !== 'popular') evs = evs.filter((e) => e.category === eventCat);
      if (eventCat === 'popular') evs = [...evs].sort((a, b) => hashId(b.id + '★') - hashId(a.id + '★')).slice(0, 15);
      evs.forEach((e) => out.push({ id: e.id, kind: 'event', coords: e.coords, emoji: e.emoji, color: CATEGORY_META[e.category].color, label: e.title }));
    } else if (tab === 'offers') {
      offers.forEach((o) => {
        const v = venueById(o.venueId);
        if (!v) return;
        // kategoria oferty z formularza (a gdy brak — z lokalu) → kolor pinezki i filtr
        const ocat = o.promoCategory ? offerMainCat(o.promoCategory) : v.category;
        if (placeCat !== 'all' && ocat !== placeCat) return;
        out.push({ id: o.id, kind: 'offer', coords: v.coords, emoji: o.emoji, color: CATEGORY_META[ocat].color, label: o.title });
      });
    } else if (tab === 'venues') {
      venues.forEach((v) => {
        if (placeCat !== 'all' && v.category !== placeCat) return;
        out.push({ id: v.id, kind: 'venue', coords: v.coords, emoji: v.emoji, color: CATEGORY_META[v.category].color, label: v.name });
      });
    }
    // kolejność „spaceru" — najbliższy sąsiad (karuzela 1:1 z markerami, bez skakania po mapie)
    return orderByProximity(out, here);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, offers, venues, tab, dateSel, eventCat, placeCat, mapFocus, here.lat, here.lng]);

  // Kategorie obecne w bieżącej zakładce (Lokale/Promocje) — pokazujemy tylko NIEPUSTE (np. „Koncerty" znika z Lokali, gdy nie ma lokali koncertowych).
  const availableCats = useMemo<CategoryKey[]>(() => {
    if (tab === 'venues') {
      const s = new Set(venues.map((v) => v.category));
      return CATEGORY_ORDER.filter((c) => s.has(c));
    }
    if (tab === 'offers') {
      const s = new Set<CategoryKey>();
      offers.forEach((o) => { const v = venueById(o.venueId); if (v) s.add(o.promoCategory ? offerMainCat(o.promoCategory) : v.category); });
      return CATEGORY_ORDER.filter((c) => s.has(c));
    }
    return [...CATEGORY_ORDER];
  }, [tab, venues, offers]);
  // Gdy wybrana kategoria zniknie z listy (zmiana zakładki/danych) — wróć do „Wszystkie".
  useEffect(() => {
    if (placeCat !== 'all' && !availableCats.includes(placeCat)) setPlaceCat('all');
  }, [availableCats, placeCat]);

  // Karty karuzeli = dokładnie markery na mapie (1:1), jako ten sam kafel co w „Dla Ciebie".
  const tileItems = useMemo<MapCarItem[]>(
    () =>
      markers
        .map((m) => {
          const e = m.kind === 'event' ? eventById(m.id) : undefined;
          const o = m.kind === 'offer' ? offerById(m.id) : undefined;
          const v = m.kind === 'venue' ? venueById(m.id) : undefined;
          const tile = e ? eventTile(e) : o ? offerTile(o) : v ? venueTile(v) : null;
          return tile ? { id: m.id, tile, dist: distOf(tile.coords) } : null;
        })
        .filter((x): x is MapCarItem => x !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markers, here.lat, here.lng, user.checkedInVenueId, user.savedEventIds, user.savedOfferIds, user.savedVenueIds, user.followedOrganizerIds],
  );

  // Stan początkowy / po refiltrze: pierwszy marker (i karta) aktywny.
  useEffect(() => {
    if (markers.length && !markers.some((m) => m.id === selectedId)) setSelectedId(markers[0].id);
  }, [markers, selectedId]);

  return (
    <div className="relative h-full w-full">
      <MapView markers={markers} userCoords={here} selectedId={selectedId} radiusKm={radiusKm} onSelect={(m) => { setSelectedId(m.id); setCarouselClosed(false); }} />

      {/* Górne filtry — Wydarzenia (data/popularne/kategorie) / Promocje / Lokale */}
      <div data-swipe-ignore className="pointer-events-none absolute inset-x-0 top-0 z-[500] space-y-2 p-3">
        {mapFocus && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-paper px-3 py-2 shadow-float">
            <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-ink">📍 {mapFocus.title} · {markers.length} na mapie</span>
            <button onClick={() => setMapFocus(null)} className="shrink-0 rounded-full bg-coral px-3 py-1 text-[12px] font-bold text-white shadow-coral active:scale-95">Pokaż wszystko</button>
          </div>
        )}
        {!mapFocus && (
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 no-scrollbar">
            <FilterChip
              active={tab === 'events'}
              chevron
              open={menu === 'events'}
              onClick={() => { setCarouselClosed(false); if (tab !== 'events') { setTab('events'); setMenu('events'); } else { setMenu(menu === 'events' ? null : 'events'); } }}
            >
              {tab === 'events'
                ? eventCat === 'popular'
                  ? 'Popularne'
                  : dateSel
                    ? (DATE_OPTS.find((o) => o.k === dateSel)?.l ?? 'Wydarzenia')
                    : eventCat === 'free'
                      ? 'Darmowe'
                      : eventCat !== 'all'
                        ? CATEGORY_META[eventCat].label
                        : 'Wydarzenia'
                : 'Wydarzenia'}
            </FilterChip>
            <FilterChip
              active={tab === 'offers'}
              chevron
              open={menu === 'offers'}
              onClick={() => { setCarouselClosed(false); if (tab !== 'offers') { setTab('offers'); setMenu('offers'); } else { setMenu(menu === 'offers' ? null : 'offers'); } }}
            >
              {tab === 'offers' && placeCat !== 'all' ? CATEGORY_META[placeCat].label : 'Promocje'}
            </FilterChip>
            <FilterChip
              active={tab === 'venues'}
              chevron
              open={menu === 'venues'}
              onClick={() => { setCarouselClosed(false); if (tab !== 'venues') { setTab('venues'); setMenu('venues'); } else { setMenu(menu === 'venues' ? null : 'venues'); } }}
            >
              {tab === 'venues' && placeCat !== 'all' ? CATEGORY_META[placeCat].label : 'Lokale'}
            </FilterChip>
          </div>
        </div>
        )}
        {(menu === 'offers' || menu === 'venues') && (
          <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <OptionChip active={placeCat === 'all'} onClick={() => setPlaceCat('all')}>Wszystkie</OptionChip>
            {availableCats.map((c) => (
              <OptionChip key={c} active={placeCat === c} onClick={() => setPlaceCat(placeCat === c ? 'all' : c)}>
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </OptionChip>
            ))}
          </div>
        )}
        {menu === 'events' && (
          <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <OptionChip active={eventCat === 'all' && !dateSel} onClick={() => { setEventCat('all'); setDateSel(null); setDateOpen(false); }}>Wszystkie</OptionChip>
            <OptionChip active={eventCat === 'popular'} onClick={() => setEventCat(eventCat === 'popular' ? 'all' : 'popular')}>🔥 Popularne</OptionChip>
            <OptionChip active={!!dateSel || dateOpen} onClick={() => setDateOpen((o) => !o)}>
              {dateSel ? (DATE_OPTS.find((o) => o.k === dateSel)?.l ?? 'Data') : 'Data'} {dateOpen ? '▴' : '▾'}
            </OptionChip>
            <OptionChip active={eventCat === 'free'} onClick={() => setEventCat(eventCat === 'free' ? 'all' : 'free')}>🆓 Darmowe</OptionChip>
            {CATEGORY_ORDER.map((c) => (
              <OptionChip key={c} active={eventCat === c} onClick={() => setEventCat(eventCat === c ? 'all' : c)}>
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </OptionChip>
            ))}
          </div>
        )}
        {menu === 'events' && dateOpen && (
          <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {DATE_OPTS.map((o) => (
              <OptionChip key={o.k} active={dateSel === o.k} onClick={() => setDateSel(dateSel === o.k ? null : o.k)}>{o.l}</OptionChip>
            ))}
          </div>
        )}
      </div>

      {/* Promień wyszukiwania — szybki chip (cykl 5→15→30→50 km); dotyk dopasowuje okrąg na mapie */}
      {!locOpen && (
        <button
          onClick={() => { const r = nextRadius(radiusKm); setRadiusKm(r); showToast(`Zasięg wyszukiwania: ${formatRadius(r)}`, '🎯'); }}
          aria-label={`Promień wyszukiwania: ${formatRadius(radiusKm)}`}
          className="absolute bottom-[252px] right-3 z-[500] inline-flex items-center gap-1.5 rounded-full bg-paper py-2 pl-2.5 pr-3 text-[12.5px] font-extrabold text-ink shadow-float active:scale-95"
        >
          <Target size={15} className="text-coral" /> {formatRadius(radiusKm)}
        </button>
      )}

      {/* Moja lokalizacja — chowa się razem z karuzelą, gdy otwarty panel lokalizacji */}
      {!locOpen && (
        <button
          onClick={() => setLocOpen(true)}
          aria-label="Moja lokalizacja"
          className="absolute bottom-[200px] right-3 z-[500] flex h-11 w-11 items-center justify-center rounded-full bg-paper text-coral shadow-float active:scale-90"
        >
          <LocateFixed size={19} className={locating ? 'animate-spin' : ''} />
        </button>
      )}

      {/* Karuzela kart (kafle „Dla Ciebie") zsynchronizowana z markerami — ukryta gdy otwarty panel lokalizacji */}
      {!carouselClosed && !locOpen && (
        <MapCarousel
          items={tileItems}
          activeId={selectedId}
          onActiveChange={setSelectedId}
          onClose={() => setCarouselClosed(true)}
        />
      )}
      {carouselClosed && !locOpen && markers.length > 0 && (
        <button
          onClick={() => setCarouselClosed(false)}
          className="absolute bottom-3 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[13px] font-bold text-white shadow-float active:scale-95"
        >
          Pokaż listę
        </button>
      )}

      {markers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center p-8">
          <div className="pointer-events-auto rounded-card bg-paper/95 p-5 text-center shadow-float backdrop-blur">
            <div className="mb-2 text-4xl">🧭</div>
            <p className="text-[14px] font-bold text-ink">Brak miejsc na mapie</p>
            <p className="mt-1 text-[12.5px] text-subtle">Zmień filtry, miasto albo wróć do centrum.</p>
            <button onClick={() => setCity(currentCity.id)} className="mt-3 rounded-full bg-coral px-4 py-2 text-[13px] font-bold text-white shadow-coral active:scale-95">
              Pokaż {currentCity.name}
            </button>
          </div>
        </div>
      )}

      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
    </div>
  );
}
