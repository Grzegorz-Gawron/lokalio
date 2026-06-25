import type { CategoryKey, LatLng } from './types';

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; emoji: string; color: string; soft: string }
> = {
  concert: { label: 'Koncerty', emoji: '🎵', color: '#FF5A4D', soft: '#FFE8E5' },
  sport: { label: 'Sport', emoji: '⚽', color: '#3FAE83', soft: '#E6F4EE' },
  culture: { label: 'Kultura', emoji: '🎨', color: '#7A5C99', soft: '#EEE8F4' },
  social: { label: 'Spotkania', emoji: '👥', color: '#8C5A1F', soft: '#F3E9DC' },
  party: { label: 'Imprezy', emoji: '🍸', color: '#2D5DAA', soft: '#E1E9F6' },
  gastro: { label: 'Jedzenie', emoji: '🍽️', color: '#E0892B', soft: '#FBEAD6' },
};

export const CATEGORY_ORDER: CategoryKey[] = [
  'concert',
  'culture',
  'gastro',
  'party',
  'social',
  'sport',
];

export const CITY: { name: string; center: LatLng } = {
  name: 'Kraków',
  center: { lat: 50.0617, lng: 19.9373 }, // Rynek Główny
};

export const DISTANCE_STEPS = [1, 2, 5, 10, 25] as const;

// Bony: zasięg zaczyna się już od 100 m (lokalne promocje tuż obok).
export const VOUCHER_DISTANCE_STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25] as const;
