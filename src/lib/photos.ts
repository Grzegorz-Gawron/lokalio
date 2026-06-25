import type { CategoryKey } from '../types';

/** Deterministyczny hash id → stabilny wybór zdjęcia/agregatu w demo. */
export function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Zdjęcia poglądowe per kategoria (Unsplash). Gdy się nie załadują — pod spodem jest gradient + emoji.
const PHOTOS: Record<CategoryKey, string[]> = {
  gastro: ['1517248135467-4c7edcad34c4', '1414235077428-338989a2e8c0', '1555396273-367ea4eb4db5', '1546069901-ba9599a7e63c', '1510812431401-41d2bd2722f3'],
  concert: ['1470229722913-7c0e2dbbafd3', '1493225457124-a3eb161ffa5f', '1429962714451-bb934ecdc4ec'],
  culture: ['1481627834876-b7833e8f5570', '1460661419201-fd4cecdf8a8b', '1533174072545-7a4b6ad7a6c3'],
  party: ['1514933651103-005eec06c04b', '1507924538820-ede94a04019d', '1566417713940-fe7c737a9ef2'],
  social: ['1501339847302-ac426a4a7cbb', '1495474472287-4d71bcdd2085', '1572116469696-31de0f17cc34'],
  sport: ['1486218119243-13883505764c', '1572116469696-31de0f17cc34'],
};

export function photoUrl(cat: CategoryKey, id: string, w: number, h: number): string {
  const pool = PHOTOS[cat] ?? PHOTOS.gastro;
  const pid = pool[hashId(id) % pool.length];
  return `https://images.unsplash.com/photo-${pid}?w=${w}&h=${h}&fit=crop&crop=entropy&auto=format&q=60`;
}
