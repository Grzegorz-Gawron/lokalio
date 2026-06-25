import { Ticket } from 'lucide-react';
import type { Venue } from '../types';
import { useApp } from '../store/AppContext';
import { haversineKm, formatDistance } from '../lib/geo';
import { offersForVenue } from '../data/seed';
import { photoUrl } from '../lib/photos';
import { LivePill } from './ui';

// Kafle treści (wydarzenie/bon/lokal w siatce) → components/FeedTile.tsx.
// Tu został tylko poziomy wiersz lokalu używany w szczegółach („Miejsce wydarzenia", „Lokal").
export function VenueCard({ venue }: { venue: Venue }) {
  const { user, navigate, liveCount } = useApp();
  const dist = user ? formatDistance(haversineKm(user.coords, venue.coords)) : '';
  const offers = offersForVenue(venue.id);
  const photo = venue.photo || photoUrl(venue.category, venue.id, 200, 200);
  const open = () => navigate({ name: 'venue', id: venue.id });

  return (
    <button onClick={open} className="flex w-full gap-3 rounded-card bg-paper p-2.5 text-left shadow-card active:scale-[0.99]">
      <img src={photo} alt="" className="h-[88px] w-[88px] shrink-0 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1 py-0.5">
        <h3 className="truncate text-[15px] font-bold tracking-tight text-ink">{venue.name}</h3>
        <p className="truncate text-[12.5px] text-subtle">
          {venue.district} · {dist}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <LivePill count={liveCount(venue)} small />
          {offers.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-2 py-0.5 text-[11px] font-bold text-coral">
              <Ticket size={11} /> {offers.length === 1 ? '1 oferta' : `${offers.length} oferty`}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
