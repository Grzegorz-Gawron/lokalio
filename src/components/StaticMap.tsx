import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Navigation } from 'lucide-react';
import type { LatLng } from '../types';
import { useApp } from '../store/AppContext';
import { MapView, type MapMarker } from './MapView';
import { openDirections } from '../lib/maps';

const TOKEN = (((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_MAPBOX_TOKEN) ?? '').trim();

/**
 * Statyczna mapka (obrazek z pinem) — lekka, bez ładowania GL JS w karcie.
 * Tap → modal z interaktywną mapą. Fallback (brak tokenu): interaktywna MapView od razu.
 */
export function StaticMap({
  coords,
  color = 'FF5A4D',
  emoji,
  label,
  zoom = 15,
  userCoords,
}: {
  coords: LatLng;
  color?: string;
  emoji?: string;
  label?: string;
  zoom?: number;
  userCoords?: LatLng;
}) {
  const { theme } = useApp();
  const [open, setOpen] = useState(false);
  const hexColor = color.startsWith('#') ? color : `#${color}`;
  const marker: MapMarker = { id: 'loc', kind: 'event', coords, emoji: emoji ?? '📍', color: hexColor, label: label ?? '' };

  // Brak tokenu → od razu interaktywna mapa (Leaflet), bez modala.
  if (!TOKEN) {
    return <MapView markers={[marker]} userCoords={userCoords ?? coords} />;
  }

  const col = color.replace('#', '');
  const c = `${coords.lng.toFixed(5)},${coords.lat.toFixed(5)}`;
  const styleId = theme === 'dark' ? 'dark-v11' : 'light-v11';
  const url = `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/pin-l+${col}(${c})/${c},${zoom},0/600x300@2x?access_token=${TOKEN}`;

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Powiększ mapę" className="block h-full w-full active:opacity-90">
        <img src={url} alt={label ?? 'Mapa miejsca'} loading="lazy" className="h-full w-full object-cover" />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[1000] flex justify-center bg-ink/50 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
            <div className="relative h-full w-full max-w-app overflow-hidden bg-cream" onClick={(e) => e.stopPropagation()}>
              <MapView markers={[marker]} userCoords={userCoords ?? coords} selectedId="loc" />
              <button
                onClick={() => setOpen(false)}
                aria-label="Zamknij mapę"
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink shadow-float active:scale-90"
              >
                <X size={20} />
              </button>
              <button
                onClick={() => openDirections(coords)}
                className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-coral px-5 py-3 text-[14px] font-bold text-white shadow-coral active:scale-95"
              >
                <Navigation size={17} /> Nawiguj
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
