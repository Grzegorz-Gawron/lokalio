import { useEffect, useMemo, useState } from 'react';
import { Clock, ChevronRight, Search, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { FeedTile, TileGrid, OfferAction, useTileBuilders } from '../components/FeedTile';
import { Segmented, EmptyState, cx } from '../components/ui';
import { offerById, venueById } from '../data/seed';
import { CATEGORY_META } from '../theme';
import { haversineKm } from '../lib/geo';
import { mmss } from '../lib/format';
import type { ActiveVoucher, OfferKind } from '../types';

/** Normalizacja do wyszukiwania/parsowania: małe litery, bez polskich znaków. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/[źż]/g, 'z');
}

/** Synonimy/koncepty dla wyszukiwarki bonów (klucze i wartości znormalizowane — bez pl znaków). */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  alkohol: ['alkohol', 'wino', 'piwo', 'drink', 'koktajl', 'nalewka', 'whisky', 'bar', 'pub', 'aperol', 'prosecco', 'szampan', 'cydr', 'kieliszek'],
  alko: ['wino', 'piwo', 'drink', 'koktajl', 'nalewka', 'bar', 'pub'],
  drinki: ['drink', 'koktajl', 'bar'],
  piwo: ['piwo', 'browar', 'pub', 'lager', 'ipa'],
  wino: ['wino', 'winiarni', 'kieliszek', 'degustacj'],
  kawa: ['kawa', 'kawiarni', 'espresso', 'latte', 'cappuccino'],
  jedzenie: ['jedzenie', 'lunch', 'obiad', 'danie', 'kuchni', 'restauracj', 'bistro', 'zupa', 'burger', 'pizza', 'falafel', 'hummus'],
  slodkie: ['slodk', 'ciasto', 'deser', 'lody', 'tort', 'gofr', 'czekolad'],
  wege: ['wege', 'wegetarian', 'wegan', 'vegan', 'falafel', 'hummus'],
  impreza: ['impreza', 'klub', 'party', 'dj', 'parkiet', 'taniec'],
};

/** Czy „stóg" (znormalizowane dane oferty + lokalu) pasuje do tokenu zapytania — wprost lub przez synonim. */
function matchesQuery(haystack: string, token: string): boolean {
  if (haystack.includes(token)) return true;
  for (const [key, words] of Object.entries(SEARCH_SYNONYMS)) {
    if ((key.startsWith(token) || token.startsWith(key)) && words.some((w) => haystack.includes(w))) {
      return true;
    }
  }
  return false;
}

export function VouchersScreen() {
  const { user, offers, activeVouchers, redeemedOfferIds, points, isSavedOffer } = useApp();
  const { offerTile, distOf } = useTileBuilders();
  const [tab, setTab] = useState<'all' | OfferKind | 'saved'>('all');
  const [query, setQuery] = useState('');
  if (!user) return null;
  const here = user.coords;

  const list = useMemo(() => {
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    return offers
      .map((o) => ({ o, v: venueById(o.venueId) }))
      .filter(({ o, v }) => {
        // Zrealizowane bony/promocje ZOSTAJĄ na liście (z oznaczeniem „Zrealizowany"), bez możliwości ponownej aktywacji.
        if (tab === 'saved') { if (!isSavedOffer(o.id)) return false; }
        else if (tab !== 'all' && o.kind !== tab) return false;
        if (tokens.length) {
          const hay = norm(
            [
              o.title, o.subtitle, o.discountLabel, o.description, o.terms.join(' '), o.validLabel,
              v?.name ?? '', v?.district ?? '', (v?.tags ?? []).join(' '),
              v ? CATEGORY_META[v.category].label : '', v?.description ?? '',
            ].join(' '),
          );
          if (!tokens.every((t) => matchesQuery(hay, t))) return false;
        }
        return true;
      })
      .map(({ o, v }) => ({ o, d: v ? haversineKm(here, v.coords) : 0 }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers, tab, query, redeemedOfferIds, here.lat, here.lng]);

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-6">
      <div className="bg-gradient-to-b from-coral/10 to-transparent px-4 pb-3 pt-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Promocje i oferty</h1>
            <p className="text-[14px] text-subtle">Aktywuj i pokaż obsłudze w lokalu.</p>
          </div>
          <span className="rounded-full bg-coral px-3 py-1.5 text-[13px] font-bold text-white shadow-coral">⭐ {points} pkt</span>
        </div>
      </div>

      {activeVouchers.length > 0 && (
        <div className="px-4 pt-2">
          <h2 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-ink">⏳ Aktywne</h2>
          <div className="space-y-2.5">
            {activeVouchers.map((av) => (
              <ActiveRow key={av.offerId} av={av} />
            ))}
          </div>
        </div>
      )}

      {/* Filtry */}
      <div className="sticky top-0 z-10 space-y-2.5 bg-cream/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2 rounded-full bg-paper px-3.5 py-2.5 shadow-sm">
          <Search size={16} className="text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj: nazwa, lokal, np. alkohol, kawa…"
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink/35"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-ink/40"><X size={16} /></button>
          )}
        </div>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'all', label: 'Wszystko' }, { value: 'promo', label: 'Promocje' }, { value: 'bon', label: 'Oferty Lokalio' }, { value: 'saved', label: 'Zapisane' }]} />
      </div>

      <div className="px-4">
        {list.length ? (
          <TileGrid>
            {list.map((o) => {
              const item = offerTile(o);
              return <FeedTile key={o.id} item={item} dist={distOf(item.coords)} action={<OfferAction offer={o} />} />;
            })}
          </TileGrid>
        ) : (
          <EmptyState emoji="🎟️" title="Brak ofert dla tych filtrów" subtitle="Zmień filtry albo zwiększ zasięg." />
        )}
      </div>
    </div>
  );
}

function ActiveRow({ av }: { av: ActiveVoucher }) {
  const { navigate } = useApp();
  const offer = offerById(av.offerId);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (!offer) return null;
  const remaining = Math.max(0, av.durationSec - Math.floor((now - av.activatedAt) / 1000));
  const pct = remaining / av.durationSec;

  return (
    <button onClick={() => navigate({ name: 'voucher-active', id: offer.id })} className="flex w-full items-center gap-3 overflow-hidden rounded-card bg-paper p-3 text-left shadow-card active:scale-[0.99]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl text-white" style={{ background: offer.color }}>{offer.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-ink">{offer.title}</p>
        <p className="truncate text-[12px] text-subtle">{offer.subtitle}</p>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/8">
          <div className={cx('h-full rounded-full transition-all', remaining ? 'bg-success' : 'bg-danger')} style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className={cx('inline-flex items-center gap-1 text-[14px] font-bold tabular-nums', remaining ? 'text-success' : 'text-danger')}>
          <Clock size={13} /> {mmss(remaining)}
        </span>
        <ChevronRight size={16} className="text-ink/30" />
      </div>
    </button>
  );
}
