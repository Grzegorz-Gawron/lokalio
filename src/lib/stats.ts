import { hashId } from './photos';
import type { Offer } from '../types';

// Jedno źródło prawdy dla licznika „zainteresowanych" w całej aplikacji (demo; w produkcji
// liczone z realnych zapisów/polubień). Ten sam wzór na kaflu, ekranie szczegółów i statystyce lokalu,
// żeby ta sama oferta/wydarzenie pokazywały tę samą liczbę wszędzie.
export const interestOf = (id: string) => 6 + (hashId(id + '★') % 30);

// Ilu ludzi interesuje się promocjami i ofertami danego lokalu — suma po jego aktywnych ofertach.
export const venueOfferInterest = (offers: Offer[]) =>
  offers.reduce((sum, o) => sum + interestOf(o.id), 0);

// Deterministyczne statystyki pozycji (demo; w produkcji liczone z realnych zdarzeń) — wspólne dla panelu i doradcy AI.
export const statViews = (id: string) => 200 + (hashId(id + 'v') % 1800);
export const statInterest = (id: string) => 12 + (hashId(id + 'i') % 160);
export const statUsed = (id: string) => 3 + (hashId(id + 'u') % 90);
export const statAttend = (id: string) => 8 + (hashId(id + 'a') % 220);
