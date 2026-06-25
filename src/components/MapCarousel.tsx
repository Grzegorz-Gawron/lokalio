import { useEffect, useRef } from 'react';
import { X, Navigation, MapPin, CalendarDays, Ticket, Heart, Footprints } from 'lucide-react';
import { cx } from './ui';
import { openDirections } from '../lib/maps';
import { dateChipLabel } from '../lib/format';
import type { TileData } from './FeedTile';

export interface MapCarItem {
  id: string; // id markera (= selectedId), stabilne dla synchronizacji
  tile: TileData;
  dist: string;
}

// Pozioma karta (zdjęcie z lewej, tekst, przycisk nawigacji z prawej) — dane jak kafel „Dla Ciebie".
// Pierwsze tapnięcie niezaznaczonej karty → zaznacza (mapa centruje marker); tap zaznaczonej → szczegóły.
function HCard({ tile, dist, active, onSelect }: { tile: TileData; dist: string; active: boolean; onSelect: () => void }) {
  return (
    <div
      className={cx(
        'relative flex items-stretch gap-2 rounded-card bg-paper p-2 shadow-float transition',
        active ? 'ring-2 ring-coral' : '',
      )}
    >
      <button onClick={() => (active ? tile.onClick() : onSelect())} className="flex min-w-0 flex-1 items-stretch gap-2.5 text-left">
        <span
          className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-2xl"
          style={{ background: `linear-gradient(135deg, ${tile.grad[0]}, ${tile.grad[1]})` }}
        >
          <img
            src={tile.photo}
            alt=""
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute left-1 top-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-bold shadow-sm" style={{ color: tile.tagColor }}>
            {tile.tag}
          </span>
          {tile.type === 'venue' && tile.live != null ? (
            <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-success shadow-sm">
              <Footprints size={8} className="text-success" /> {tile.live} w godzinę
            </span>
          ) : tile.interest != null ? (
            <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-coral shadow-sm">
              <Heart size={8} className="fill-coral text-coral" /> {tile.interest}
            </span>
          ) : null}
          <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[11px] shadow-sm">{tile.emoji}</span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="line-clamp-2 text-[13.5px] font-bold leading-tight text-ink">{tile.title}</p>

          {tile.type === 'event' ? (
            <div className="mt-1 space-y-1">
              <p className="flex items-center gap-1 text-[11px] text-subtle">
                <MapPin size={11} className="shrink-0 text-ink/40" />
                <span className="truncate">{tile.subtitle} · {dist}</span>
              </p>
              <p className="flex items-center gap-1 text-[11px] font-semibold">
                <CalendarDays size={11} className="shrink-0 text-ink/40" />
                <span className="truncate text-ink/70">
                  {tile.iso ? `${dateChipLabel(tile.iso)} · ` : ''}
                  <span className={tile.free ? 'text-success' : 'text-coral'}>{tile.free ? 'Za darmo' : tile.price}</span>
                </span>
              </p>
            </div>
          ) : tile.type === 'venue' ? (
            <div className="mt-1 space-y-1">
              <p className="flex items-center gap-1 text-[11px] text-subtle">
                <MapPin size={11} className="shrink-0 text-ink/40" />
                <span className="truncate">{tile.subtitle} · {dist}</span>
              </p>
              <p className="flex items-center gap-1.5 overflow-hidden text-[11px] font-semibold">
                {tile.offerInfo && <span className="inline-flex shrink-0 items-center gap-0.5 text-coral"><Ticket size={11} /> {tile.offerInfo}</span>}
                {tile.eventInfo && <span className="inline-flex items-center gap-0.5 truncate text-ink/60"><CalendarDays size={11} className="shrink-0" /> <span className="truncate">{tile.eventInfo}</span></span>}
                {!tile.offerInfo && !tile.eventInfo && <span className="text-subtle">Zajrzyj po szczegóły</span>}
              </p>
            </div>
          ) : (
            <>
              <p className="mt-0.5 truncate text-[11px] text-subtle">{tile.subtitle} · {dist}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold">
                {tile.type === 'offer' && (
                  <>
                    <span className="text-coral">{tile.discount}</span>
                    <span className="truncate text-ink/55">{tile.valid}</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); openDirections(tile.coords); }}
        aria-label="Nawiguj w Google Maps"
        className="flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-full bg-coral text-white shadow-coral active:scale-90"
      >
        <Navigation size={18} />
      </button>
    </div>
  );
}

/**
 * Pozioma karuzela kart zsynchronizowana dwukierunkowo z markerami mapy (wzorzec Google Maps).
 * Boczny padding 11% pozwala wyśrodkować (i zaznaczyć) także pierwszą i ostatnią kartę.
 */
export function MapCarousel({
  items,
  activeId,
  onActiveChange,
  onClose,
}: {
  items: MapCarItem[];
  activeId?: string;
  onActiveChange?: (id: string) => void;
  onClose?: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const programmaticRef = useRef(false);
  const progTimer = useRef<number | undefined>(undefined);

  const centeredId = (): string | undefined => {
    const c = scrollerRef.current;
    if (!c) return undefined;
    const cr = c.getBoundingClientRect();
    const center = cr.left + cr.width / 2;
    let best: string | undefined;
    let bd = Infinity;
    for (const child of Array.from(c.children) as HTMLElement[]) {
      const r = child.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - center);
      if (d < bd) { bd = d; best = child.dataset.cardId; }
    }
    return best;
  };

  // karuzela → mapa: po zatrzymaniu scrolla aktywuj wyśrodkowaną kartę
  useEffect(() => {
    const c = scrollerRef.current;
    if (!c) return;
    let t: number;
    const onScroll = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        if (programmaticRef.current) return;
        const id = centeredId();
        if (id && id !== activeId) onActiveChange?.(id);
      }, 130);
    };
    c.addEventListener('scroll', onScroll, { passive: true });
    return () => { c.removeEventListener('scroll', onScroll); window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, onActiveChange, items.length]);

  // mapa → karuzela: zewnętrzna zmiana activeId → przewiń do karty (chyba że już wyśrodkowana)
  useEffect(() => {
    const c = scrollerRef.current;
    if (!c || !activeId) return;
    const el = c.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(activeId)}"]`);
    if (!el) return;
    const cr = c.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const delta = er.left + er.width / 2 - (cr.left + cr.width / 2);
    if (Math.abs(delta) < 8) return;
    programmaticRef.current = true;
    c.scrollTo({ left: c.scrollLeft + delta, behavior: 'smooth' });
    window.clearTimeout(progTimer.current);
    progTimer.current = window.setTimeout(() => { programmaticRef.current = false; }, 450);
  }, [activeId]);

  if (!items.length) return null;
  return (
    <div data-swipe-ignore className="absolute inset-x-0 bottom-0 z-[500] pb-3">
      {onClose && (
        <div className="mb-1.5 flex justify-end px-4">
          <button
            onClick={onClose}
            aria-label="Zamknij listę"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-paper/95 text-ink/70 shadow-card backdrop-blur active:scale-90"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div ref={scrollerRef} className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth px-[3%] no-scrollbar">
        {items.map(({ id, tile, dist }) => (
          <div key={id} data-card-id={id} className="w-[94%] shrink-0 snap-center snap-always">
            <HCard tile={tile} dist={dist} active={id === activeId} onSelect={() => onActiveChange?.(id)} />
          </div>
        ))}
      </div>
    </div>
  );
}
