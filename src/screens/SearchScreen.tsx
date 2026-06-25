import { useMemo, useRef, useState, useEffect } from 'react';
import { ChevronLeft, Search, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { CATEGORY_META } from '../theme';
import { cx } from '../components/ui';

// Normalizacja: małe litery + bez polskich znaków, by „cafe" znalazło „Café", a „wydarzenie" „wydarzeń".
function norm(s: string): string {
  return (s || '').toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[źż]/g, 'z');
}

interface Hit { id: string; route: 'event' | 'venue' | 'offer'; refId: string; title: string; subtitle: string; emoji: string; color: string; }

export function SearchScreen() {
  const { back, navigate, events, offers, venues } = useApp();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const nq = norm(q.trim());

  const { vHits, eHits, oHits } = useMemo(() => {
    if (nq.length < 2) return { vHits: [] as Hit[], eHits: [] as Hit[], oHits: [] as Hit[] };
    const venById = new Map(venues.map((v) => [v.id, v]));
    const match = (parts: (string | undefined)[]) => norm(parts.filter(Boolean).join(' ')).includes(nq);

    const vHits: Hit[] = venues
      .filter((v) => match([v.name, CATEGORY_META[v.category]?.label, v.district, v.venueType, ...(v.tags || [])]))
      .slice(0, 8)
      .map((v) => ({ id: 'v-' + v.id, route: 'venue', refId: v.id, title: v.name, subtitle: `${CATEGORY_META[v.category]?.label ?? 'Lokal'} · ${v.district}`, emoji: v.emoji, color: v.color }));

    const eHits: Hit[] = events
      .filter((e) => match([e.title, e.eventCategory, CATEGORY_META[e.category]?.label, e.place, ...(e.tags || [])]))
      .slice(0, 8)
      .map((e) => ({ id: 'e-' + e.id, route: 'event', refId: e.id, title: e.title, subtitle: e.place, emoji: e.emoji, color: e.gradient?.[0] ?? '#FF5A4D' }));

    const oHits: Hit[] = offers
      .filter((o) => match([o.title, o.subtitle, o.discountLabel, o.promoCategory, CATEGORY_META[venById.get(o.venueId)?.category ?? 'gastro']?.label]))
      .slice(0, 8)
      .map((o) => ({ id: 'o-' + o.id, route: 'offer', refId: o.id, title: o.title, subtitle: `${o.subtitle} · ${o.discountLabel}`, emoji: o.emoji, color: o.color }));

    return { vHits, eHits, oHits };
  }, [nq, events, offers, venues]);

  const total = vHits.length + eHits.length + oHits.length;

  const Row = ({ h }: { h: Hit }) => (
    <button onClick={() => navigate({ name: h.route, id: h.refId })} className="flex w-full items-center gap-3 rounded-card bg-paper p-3 text-left shadow-card active:scale-[0.99]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: h.color + '22' }}>{h.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-ink">{h.title}</p>
        <p className="truncate text-[12px] text-subtle">{h.subtitle}</p>
      </div>
    </button>
  );

  const Section = ({ label, hits }: { label: string; hits: Hit[] }) =>
    hits.length === 0 ? null : (
      <div>
        <p className="mb-2 px-1 text-[12px] font-bold uppercase tracking-wide text-ink/50">{label} · {hits.length}</p>
        <div className="space-y-2">{hits.map((h) => <Row key={h.id} h={h} />)}</div>
      </div>
    );

  return (
    <div className="flex h-full flex-col bg-cream">
      <div className="flex items-center gap-2 px-4 pb-3 pt-5">
        <button onClick={back} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 active:scale-90">
          <ChevronLeft size={22} />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-paper px-3.5 py-2.5 shadow-sm">
          <Search size={17} className="shrink-0 text-coral" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj lokali, wydarzeń, promocji…"
            className="min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink/35"
          />
          {q && <button onClick={() => setQ('')} aria-label="Wyczyść" className="shrink-0 text-ink/30 active:scale-90"><X size={17} /></button>}
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-6 no-scrollbar">
        {nq.length < 2 ? (
          <p className="px-1 pt-6 text-center text-[13px] text-subtle">Wpisz nazwę lokalu, wydarzenia, kategorię albo dzielnicę.</p>
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-2 pt-12 text-center">
            <span className={cx('flex h-12 w-12 items-center justify-center rounded-full bg-coral/10 text-coral')}><Search size={22} /></span>
            <p className="text-[14px] font-bold text-ink">Brak wyników dla „{q.trim()}"</p>
            <p className="text-[12.5px] text-subtle">Spróbuj innej nazwy lub kategorii.</p>
          </div>
        ) : (
          <>
            <Section label="Lokale" hits={vHits} />
            <Section label="Wydarzenia" hits={eHits} />
            <Section label="Promocje i oferty" hits={oHits} />
          </>
        )}
      </div>
    </div>
  );
}
