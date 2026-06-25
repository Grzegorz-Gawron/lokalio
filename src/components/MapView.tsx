import { lazy, Suspense } from 'react';
import { LeafletMap, type MapMarker } from './LeafletMap';
import { useApp } from '../store/AppContext';
import type { LatLng } from '../types';

export type { MapMarker };

// Token publiczny Mapboxa (Vite env). Brak tokenu → mapa działa po staremu na Leaflet (bezpieczny fallback).
const TOKEN = (((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_MAPBOX_TOKEN) ?? '').trim();

// Ciężka biblioteka mapbox-gl ładuje się tylko, gdy token jest ustawiony (osobny chunk).
const MapboxMap = lazy(() => import('./MapboxMap').then((m) => ({ default: m.MapboxMap })));

export interface MapViewProps {
  markers: MapMarker[];
  userCoords: LatLng;
  selectedId?: string;
  onSelect?: (m: MapMarker) => void;
  radiusKm?: number;
}

export function MapView(props: MapViewProps) {
  const { theme } = useApp();
  if (TOKEN) {
    return (
      <Suspense fallback={<div className="h-full w-full bg-muted/40" />}>
        {/* key={theme} wymusza remount mapy ze stylem zależnym od motywu (jasny/ciemny) */}
        <MapboxMap key={theme} {...props} token={TOKEN} dark={theme === 'dark'} />
      </Suspense>
    );
  }
  return <LeafletMap {...props} />;
}
