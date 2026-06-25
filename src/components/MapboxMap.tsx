import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { MapMarker } from './LeafletMap';
import type { LatLng } from '../types';

// Styl mapy zależny od motywu — nasze piny na pierwszym planie.
const styleUrl = (dark?: boolean) => (dark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11');

// Kolor tła kart w trybie ciemnym (--c-paper = rgb(27 36 56)).
const PAPER_DARK = '#1b2438';

// W trybie ciemnym standardowa mapa ma ledwo widoczne, ciemne ulice oraz granatowo-czarne tło.
// Ustawiamy tło mapy na kolor tła kart i przemalowujemy ulice na jasnoszare/białe,
// żeby siatka ulic była wyraźnie czytelna i mapa wtapiała się w resztę UI.
function styleDark(map: mapboxgl.Map) {
  for (const l of map.getStyle().layers ?? []) {
    // Tło + powierzchnia lądu w kolorze kart.
    if (l.type === 'background' || /^(land|landcover|landuse)$/i.test(l.id)) {
      try { map.setPaintProperty(l.id, l.type === 'background' ? 'background-color' : 'fill-color', PAPER_DARK); } catch { /* ignore */ }
      continue;
    }
    if (l.type !== 'line') continue;
    if (!/road|street|bridge|tunnel/i.test(l.id)) continue;
    // główne trasy jaśniejsze, mniejsze ulice nieco ciemniejszy szary
    const major = /motorway|trunk|primary|secondary/i.test(l.id);
    try { map.setPaintProperty(l.id, 'line-color', major ? '#e6e9ef' : '#aab0bd'); } catch { /* ignore */ }
  }
}
const SRC = 'lokalio-places';
const USER_SRC = 'user-loc';

function userPoint(c: LatLng): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] }, properties: {} }] };
}

// Pojedynczy znacznik = kółko w kolorze kategorii z emoji (renderowane na canvasie → ikona warstwy).
function pinImage(emoji: string, color: string): { data: ImageData; pr: number } {
  const pr = 2;
  const size = 40; // logiczna średnica z obwódką
  const W = size * pr;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = W;
  const ctx = c.getContext('2d')!;
  const cx = W / 2;
  const cy = W / 2;
  const r = (size / 2 - 2) * pr;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 3 * pr;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.font = `${19 * pr}px "Segoe UI Emoji","Noto Color Emoji","Apple Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, cx, cy + pr);
  return { data: ctx.getImageData(0, 0, W, W), pr };
}

function ensureImages(map: mapboxgl.Map, markers: MapMarker[]) {
  for (const m of markers) {
    const id = 'pin-' + m.id;
    if (!map.hasImage(id)) {
      const img = pinImage(m.emoji, m.color);
      map.addImage(id, img.data, { pixelRatio: img.pr });
    }
  }
}

function featureCollection(markers: MapMarker[]) {
  return {
    type: 'FeatureCollection',
    features: markers.map((m) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.coords.lng, m.coords.lat] },
      properties: { id: m.id, icon: 'pin-' + m.id },
    })),
  } as GeoJSON.FeatureCollection;
}

// Zaznaczenie: aktywny większy i pełny, reszta mniejsza i przygaszona; bez wyboru — wszystko normalnie.
function sizeExpr(selId?: string): mapboxgl.ExpressionSpecification | number {
  return selId ? ['case', ['==', ['get', 'id'], selId], 1.28, 0.85] : 1;
}
function opacityExpr(selId?: string): mapboxgl.ExpressionSpecification | number {
  return selId ? ['case', ['==', ['get', 'id'], selId], 1, 0.55] : 1;
}

export function MapboxMap({
  markers,
  userCoords,
  selectedId,
  onSelect,
  token,
  dark,
}: {
  markers: MapMarker[];
  userCoords: LatLng;
  selectedId?: string;
  onSelect?: (m: MapMarker) => void;
  radiusKm?: number;
  token: string;
  dark?: boolean;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const selRef = useRef(selectedId);
  selRef.current = selectedId;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // init
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: elRef.current,
      style: styleUrl(dark),
      center: [userCoords.lng, userCoords.lat],
      zoom: 14.5,
      attributionControl: true,
    });

    map.on('load', () => {
      // „Czysto" — chowamy etykiety POI/transportu Mapboxa.
      try {
        for (const l of map.getStyle().layers ?? []) {
          if (/poi|transit/i.test(l.id)) map.setLayoutProperty(l.id, 'visibility', 'none');
        }
      } catch {
        /* ignore */
      }

      // Ciemny motyw → tło w kolorze kart + jasnoszara siatka ulic.
      if (dark) styleDark(map);

      // Kropka „Ty" jako warstwa mapy (pod klastrem) — żeby liczba w klastrze była zawsze widoczna.
      map.addSource(USER_SRC, { type: 'geojson', data: userPoint(userCoords) });
      map.addLayer({ id: 'user-halo', type: 'circle', source: USER_SRC, paint: { 'circle-radius': 13, 'circle-color': '#185FA5', 'circle-opacity': 0.16 } });
      map.addLayer({ id: 'user-dot', type: 'circle', source: USER_SRC, paint: { 'circle-radius': 6, 'circle-color': '#185FA5', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' } });

      ensureImages(map, markersRef.current);
      map.addSource(SRC, {
        type: 'geojson',
        data: featureCollection(markersRef.current),
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 15,
      });

      // Klaster — kółko z liczbą (rośnie z liczbą zdarzeń).
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SRC,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#FF5A4D',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
          'circle-radius': ['step', ['get', 'point_count'], 22, 10, 28, 25, 36],
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SRC,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 16,
        },
        paint: { 'text-color': '#ffffff' },
      });

      // Pojedyncze znaczniki — kółko z emoji.
      map.addLayer({
        id: 'unclustered',
        type: 'symbol',
        source: SRC,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-allow-overlap': true,
          'icon-anchor': 'center',
          'icon-size': sizeExpr(selRef.current),
        },
        paint: { 'icon-opacity': opacityExpr(selRef.current) },
      });
      // Koralowy ring wokół aktywnego pinu (pod ikoną).
      map.addLayer(
        {
          id: 'active-ring',
          type: 'circle',
          source: SRC,
          filter: ['==', ['get', 'id'], selRef.current ?? '__none__'],
          paint: {
            'circle-radius': 26,
            'circle-color': 'rgba(255,90,77,0.10)',
            'circle-stroke-color': '#FF5A4D',
            'circle-stroke-width': 3,
          },
        },
        'unclustered',
      );

      // klik w klaster → rozwiń (przybliż)
      map.on('click', 'clusters', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
        if (!f) return;
        const cid = f.properties!.cluster_id;
        (map.getSource(SRC) as mapboxgl.GeoJSONSource).getClusterExpansionZoom(cid, (err, zoom) => {
          if (err || zoom == null) return;
          map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: Math.min(zoom, 17) });
        });
      });
      // klik w pojedynczy → zaznacz (karta)
      map.on('click', 'unclustered', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['unclustered'] })[0];
        if (!f) return;
        const m = markersRef.current.find((x) => x.id === f.properties!.id);
        if (m) onSelectRef.current?.(m);
      });
      for (const lyr of ['clusters', 'unclustered']) {
        map.on('mouseenter', lyr, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', lyr, () => { map.getCanvas().style.cursor = ''; });
      }

      loadedRef.current = true;
      map.resize();
    });

    mapRef.current = map;

    const t = window.setTimeout(() => map.resize(), 80);
    const onResize = () => map.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // zmiana zestawu znaczników (filtry) → odśwież źródło
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    ensureImages(map, markers);
    (map.getSource(SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(featureCollection(markers));
  }, [markers]);

  // recenter na zmianę lokalizacji użytkownika
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (loadedRef.current) (map.getSource(USER_SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(userPoint(userCoords));
    map.easeTo({ center: [userCoords.lng, userCoords.lat], duration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCoords.lat, userCoords.lng]);

  // zaznaczenie → powiększ pin + przesuń mapę
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (loadedRef.current && map.getLayer('unclustered')) {
      map.setLayoutProperty('unclustered', 'icon-size', sizeExpr(selectedId));
      map.setPaintProperty('unclustered', 'icon-opacity', opacityExpr(selectedId));
    }
    if (loadedRef.current && map.getLayer('active-ring')) {
      map.setFilter('active-ring', ['==', ['get', 'id'], selectedId ?? '__none__']);
    }
    if (selectedId) {
      const m = markers.find((x) => x.id === selectedId);
      if (m) map.easeTo({ center: [m.coords.lng, m.coords.lat], zoom: Math.max(map.getZoom(), 15), duration: 400 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={elRef} className="h-full w-full" />;
}
