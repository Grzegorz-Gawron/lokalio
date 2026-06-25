import { ChevronLeft, BadgeCheck, Users, MapPin, Phone, Globe, Navigation, Pencil, Clock } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { organizerById, eventsForOrganizer, venueForOrganizer } from '../data/seed';
import { VenueCard } from '../components/cards';
import { FeedTile, TileGrid, useTileBuilders } from '../components/FeedTile';
import { CATEGORY_META } from '../theme';
import { photoUrl } from '../lib/photos';
import { cx, CategoryTag, EmptyState } from '../components/ui';
import { fmtDays } from './VenueDetail';
import type { Organizer } from '../types';

export function OrganizerScreen({ id }: { id: string }) {
  const org = organizerById(id);
  if (!org) return null;
  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-cream pb-6">
      <OrganizerScreenContent org={org} />
    </div>
  );
}

// Treść ekranu organizatora — współdzielona przez ekran konsumencki i podgląd w panelu firmowym.
export function OrganizerScreenContent({ org, preview, onEdit }: { org: Organizer; preview?: boolean; onEdit?: () => void }) {
  const { back, isFollowing, toggleFollow } = useApp();
  const { eventTile, distOf } = useTileBuilders();
  const events = eventsForOrganizer(org.id);
  const venue = org.kind === 'lokal' ? venueForOrganizer(org.id) : undefined;
  const following = isFollowing(org.id);
  const orgFollowers = org.followers + (following ? 1 : 0); // +1 gdy sam obserwujesz — spójnie z ekranem lokalu
  const photo = org.photo || photoUrl(org.categories[0] ?? 'culture', org.id, 900, 420);
  // Pełny adres w dwóch liniach (ulica / miasto).
  const orgAddr = org.address ?? '';
  const ai = orgAddr.indexOf(',');
  const addrL1 = ai > 0 ? orgAddr.slice(0, ai).trim() : orgAddr;
  const addrL2 = ai > 0 ? orgAddr.slice(ai + 1).trim() : '';

  return (
    <>
      {/* Zdjęcie u góry */}
      <div className="relative h-44">
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/55" />
        {!preview && <button onClick={back} className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md active:scale-90"><ChevronLeft size={22} /></button>}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="min-w-0">
            <h1 className="flex items-center gap-1.5 text-[22px] font-extrabold leading-tight tracking-tight text-white drop-shadow-md">
              {org.name} {org.verified && <BadgeCheck size={18} className="text-white" />}
            </h1>
            <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-white/85">
              <Users size={13} /> {orgFollowers > 0 ? `${orgFollowers} obserwujących · ` : ''}{org.kind === 'instytucja' ? 'Instytucja' : 'Lokal'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3">
        {/* Kategorie + obserwuj */}
        {org.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {org.categories.map((c) => (
              <CategoryTag key={c} label={CATEGORY_META[c].label} color={CATEGORY_META[c].color} soft={CATEGORY_META[c].soft} emoji={CATEGORY_META[c].emoji} />
            ))}
          </div>
        )}
        {preview ? (
          <button
            onClick={onEdit}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3 text-[15px] font-bold text-white shadow-coral transition active:scale-[0.98]"
          >
            <Pencil size={17} /> Edytuj profil
          </button>
        ) : (
          <button
            onClick={() => toggleFollow(org.id)}
            className={cx('mt-3 w-full rounded-2xl py-3 text-[15px] font-bold transition active:scale-[0.98]', following ? 'bg-black/5 text-ink/70' : 'bg-coral text-white shadow-coral')}
          >
            {following ? '🔔 Obserwujesz' : 'Obserwuj — powiadomimy o nowościach'}
          </button>
        )}

        {/* Adres — pełny, w dwóch liniach */}
        {org.address && (
          <div className="mt-4 flex items-center gap-3 rounded-card bg-paper p-3.5 shadow-card">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral"><MapPin size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink/45">Adres</p>
              <p className="text-[14px] font-semibold leading-snug text-ink">{addrL1}</p>
              {addrL2 && <p className="text-[13px] text-ink/70">{addrL2}</p>}
            </div>
            <button
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(org.address!)}`, '_blank')}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-coral/30 bg-coral/5 px-3 py-2 text-[12.5px] font-bold text-coral active:scale-95"
            >
              <Navigation size={14} /> Prowadź
            </button>
          </div>
        )}

        {/* Godziny otwarcia — pod adresem (jak na ekranie lokalu) */}
        {org.hours && org.hours.length > 0 && (
          <div className="mt-3 rounded-card bg-paper p-4 shadow-card">
            <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-bold text-ink"><Clock size={16} className="text-coral" /> Godziny otwarcia</h2>
            <div className="space-y-1.5">
              {org.hours.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-[13.5px]">
                  <span className="font-semibold text-ink/75">{fmtDays(h.days)}</span>
                  <span className="font-bold tabular-nums text-ink">{h.from}–{h.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Szybkie akcje (zamiast pola Kontakt — mamy ikony) */}
        {(org.phone || org.website) && (
          <div className="mt-3 flex gap-2">
            {org.phone && (
              <a href={`tel:${org.phone}`} className="flex flex-1 flex-col items-center gap-1 rounded-card bg-paper py-2.5 shadow-card active:scale-95">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-coral/10 text-coral"><Phone size={17} /></span>
                <span className="text-[10.5px] font-semibold text-ink/70">Zadzwoń</span>
              </a>
            )}
            {org.website && (
              <a href={`https://${org.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="flex flex-1 flex-col items-center gap-1 rounded-card bg-paper py-2.5 shadow-card active:scale-95">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-coral/10 text-coral"><Globe size={17} /></span>
                <span className="text-[10.5px] font-semibold text-ink/70">Strona</span>
              </a>
            )}
          </div>
        )}

        {/* Opis działalności */}
        {org.bio && (
          <div className="mt-3 rounded-card bg-paper p-4 shadow-card">
            <h2 className="mb-1.5 text-[14px] font-bold text-ink">O nas</h2>
            <p className="text-[14px] leading-relaxed text-ink/75">{org.bio}</p>
          </div>
        )}

        {/* Lokal (gdy organizator to lokal — fallback) */}
        {!preview && venue && (
          <div className="mt-5">
            <h2 className="mb-3 text-[16px] font-bold text-ink">📍 Lokal</h2>
            <VenueCard venue={venue} />
          </div>
        )}

        {/* Wydarzenia organizatora */}
        {!preview && (
          <div className="mt-6">
            <h2 className="mb-3 text-[16px] font-bold text-ink">📅 Wydarzenia</h2>
            {events.length ? (
              <TileGrid>
                {events.map((e) => <FeedTile key={e.id} item={eventTile(e)} dist={distOf(e.coords)} />)}
              </TileGrid>
            ) : (
              <EmptyState emoji="📭" title="Brak nadchodzących wydarzeń" />
            )}
          </div>
        )}
      </div>
    </>
  );
}
