import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { LatLng } from '../types';

// Mała mapka podglądowa z jedną pinezką (Leaflet + CARTO — bez tokenu, działa lokalnie i na produkcji).
// Pinezkę można przeciągnąć, by ręcznie poprawić lokalizację (onChange).

const PIN = L.divIcon({
  className: 'lokalio-minipin',
  html: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#FF5A4D;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.35)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

export function MiniMap({ coords, onChange }: { coords: LatLng; onChange?: (c: LatLng) => void }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false, // nie przejmuj scrolla formularza
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const marker = L.marker([coords.lat, coords.lng], { draggable: !!onChangeRef.current, icon: PIN, autoPan: true });
    marker.on('dragend', () => {
      const ll = marker.getLatLng();
      onChangeRef.current?.({ lat: ll.lat, lng: ll.lng });
    });
    marker.addTo(map);
    markerRef.current = marker;
    mapRef.current = map;

    const t = window.setTimeout(() => map.invalidateSize(), 60);
    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nowe współrzędne z zewnątrz (po geokodowaniu) → przesuń pinezkę i widok.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLatLng([coords.lat, coords.lng]);
    map.setView([coords.lat, coords.lng], map.getZoom(), { animate: true });
  }, [coords.lat, coords.lng]);

  return <div ref={elRef} className="h-full w-full" />;
}
