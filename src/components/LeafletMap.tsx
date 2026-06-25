import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { LatLng } from '../types';
import { pinHtml, USER_HTML } from './mapPins';

export interface MapMarker {
  id: string;
  kind: 'event' | 'venue' | 'offer';
  coords: LatLng;
  emoji: string;
  color: string;
  label: string;
}

export function LeafletMap({
  markers,
  userCoords,
  selectedId,
  onSelect,
  radiusKm,
}: {
  markers: MapMarker[];
  userCoords: LatLng;
  selectedId?: string;
  onSelect?: (m: MapMarker) => void;
  radiusKm?: number;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const radiusRef = useRef<L.Circle | null>(null);
  const prevRadiusRef = useRef<number | undefined>(undefined);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // init
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      center: [userCoords.lat, userCoords.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], {
      icon: L.divIcon({ className: 'lokalio-pin', html: USER_HTML, iconSize: [26, 26], iconAnchor: [13, 13] }),
      interactive: false,
      zIndexOffset: -100,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const t = window.setTimeout(() => map.invalidateSize(), 60);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // markers
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markers.forEach((m) => {
      const active = m.id === selectedId;
      const marker = L.marker([m.coords.lat, m.coords.lng], {
        icon: L.divIcon({
          className: 'lokalio-pin',
          html: pinHtml(m.emoji, m.color, active),
          iconSize: [48, 48],
          iconAnchor: [24, 44],
        }),
        zIndexOffset: active ? 1000 : 0,
      });
      marker.on('click', () => onSelectRef.current?.(m));
      marker.addTo(layer);
    });
  }, [markers, selectedId]);

  // radius — okrąg zasięgu rysowany dla każdego progu (5/15/30/50 km)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (radiusRef.current) {
      radiusRef.current.remove();
      radiusRef.current = null;
    }
    if (!radiusKm) { prevRadiusRef.current = radiusKm; return; }
    const circle = L.circle([userCoords.lat, userCoords.lng], {
      radius: radiusKm * 1000,
      color: '#FF5A4D',
      weight: 1.5,
      fillColor: '#FF5A4D',
      fillOpacity: 0.05,
    }).addTo(map);
    radiusRef.current = circle;
    // Po ZMIANIE promienia (chip na mapie) dopasuj widok, by cały okrąg był widoczny —
    // przy 30/50 km inaczej wychodzi poza ekran. Wejście/zmiana lokalizacji nie rusza zoomu
    // (zostawiamy poziom ulic z pinezkami; okrąg „rozwija" dopiero chip).
    if (prevRadiusRef.current !== undefined && prevRadiusRef.current !== radiusKm) {
      map.fitBounds(circle.getBounds(), { padding: [28, 28], maxZoom: 15, animate: true });
    }
    prevRadiusRef.current = radiusKm;
  }, [radiusKm, userCoords.lat, userCoords.lng]);

  // recenter gdy zmieni się lokalizacja użytkownika
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.setLatLng([userCoords.lat, userCoords.lng]);
    map.setView([userCoords.lat, userCoords.lng], map.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCoords.lat, userCoords.lng]);

  // pan to selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const m = markers.find((x) => x.id === selectedId);
    if (m) map.panTo([m.coords.lat, m.coords.lng], { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={elRef} className="h-full w-full" />;
}
