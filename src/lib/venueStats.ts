import type { Venue, CategoryKey, CheckinAgg } from '../types';
import { hashId } from './photos';

// Jeden, spójny silnik statystyk lokalu (deterministyczny per id+kategoria; demo, w produkcji z realnych zdarzeń).
// Czytają z niego: ekran „Statystyki" w panelu ORAZ Doradca AI — te same liczby wszędzie.

const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

export interface DayStat { label: string; value: number }
export interface HourStat { hour: number; value: number }
export interface VenueStats {
  views7d: number; views30d: number;
  checkinsToday: number; checkins7d: number;
  newFollowers7d: number; usedOffers7d: number;
  age: { y18_25: number; y26_35: number; y36p: number }; // %
  gender: { k: number; m: number }; // %
  byDay: DayStat[]; // 7 dni (Pn..Nd) — meldunki
  byHour: HourStat[]; // 10:00–23:00 — krzywa ruchu
  peakHour: number; peakLabel: string;
  slowestDay: number; busiestDay: number; // 0=Pn..6=Nd
  slowestDayLabel: string; busiestDayLabel: string;
  trend7dPct: number; // +/- vs poprzedni tydzień
}

// Profile demograficzne i rytm wg kategorii (suma wieku ~100). Bazowo różne grupy chodzą do różnych miejsc.
const PROFILE: Record<CategoryKey, { age: [number, number, number]; genderK: number; peak: number; weekendHeavy: boolean }> = {
  party: { age: [58, 32, 10], genderK: 49, peak: 22, weekendHeavy: true },
  concert: { age: [46, 38, 16], genderK: 50, peak: 20, weekendHeavy: true },
  gastro: { age: [26, 44, 30], genderK: 53, peak: 13, weekendHeavy: false },
  culture: { age: [22, 38, 40], genderK: 56, peak: 18, weekendHeavy: false },
  social: { age: [34, 41, 25], genderK: 51, peak: 17, weekendHeavy: false },
  sport: { age: [38, 46, 16], genderK: 44, peak: 18, weekendHeavy: true },
};

// deterministyczny „szum" w [-r, r]
const jit = (seed: string, r: number) => (hashId(seed) % (2 * r + 1)) - r;

interface Profile { age: { y18_25: number; y26_35: number; y36p: number }; gender: { k: number; m: number }; peakHour: number; baseInt: number; weekendHeavy: boolean }

function profileFor(id: string, category: CategoryKey): Profile {
  const p = PROFILE[category] ?? PROFILE.gastro;
  let a1 = Math.max(6, p.age[0] + jit(id + 'a1', 8));
  let a2 = Math.max(6, p.age[1] + jit(id + 'a2', 8));
  let a3 = Math.max(6, p.age[2] + jit(id + 'a3', 6));
  const sum = a1 + a2 + a3;
  const y18_25 = Math.round((a1 / sum) * 100);
  const y26_35 = Math.round((a2 / sum) * 100);
  const age = { y18_25, y26_35, y36p: 100 - y18_25 - y26_35 };
  const k = Math.min(74, Math.max(26, p.genderK + jit(id + 'g', 9)));
  const peakHour = Math.min(23, Math.max(10, p.peak + jit(id + 'pk', 2)));
  const baseInt = 5 + (hashId(id + 'base') % 26);
  return { age, gender: { k, m: 100 - k }, peakHour, baseInt, weekendHeavy: p.weekendHeavy };
}

// CheckinAgg dla lokalu (używane też przez makeOwnerVenue — by ekran lokalu i statystyki były spójne).
export function venueProfileCheckin(id: string, category: CategoryKey): CheckinAgg {
  const pr = profileFor(id, category);
  const trendN = hashId(id + 'tr') % 3;
  return {
    base: pr.baseInt,
    trend: trendN === 0 ? 'up' : trendN === 1 ? 'down' : 'flat',
    age: pr.age,
    gender: pr.gender,
    peak: `Najwięcej ludzi ok. ${pr.peakHour}:00`,
  };
}

export function venueStats(venue: Venue): VenueStats {
  const id = venue.id;
  const pr = profileFor(id, venue.category);

  const peakHour = pr.peakHour;
  const peakLabel = `Najwięcej ludzi ok. ${peakHour}:00`;

  // krzywa godzinowa 10–23 (rozkład gaussowski wokół godziny szczytu)
  const byHour: HourStat[] = [];
  for (let hr = 10; hr <= 23; hr++) {
    const d = hr - peakHour;
    const g = Math.exp(-(d * d) / 7);
    byHour.push({ hour: hr, value: Math.round(pr.baseInt * g * (2 + (hashId(id + 'h' + hr) % 4))) });
  }

  // 7 dni — najsłabszy dzień (Pn–Pt), weekend cięższy/lżejszy wg kategorii
  const slowestDay = hashId(id + 'slow') % 5;
  const busiestDay = pr.weekendHeavy ? (hashId(id + 'busy') % 2 === 0 ? 4 : 5) : 2 + (hashId(id + 'busy') % 3);
  const byDay: DayStat[] = DAYS.map((label, i) => {
    let v = pr.baseInt * (9 + (hashId(id + 'd' + i) % 8));
    if (i === slowestDay) v *= 0.55;
    if (i === 5 || i === 6) v *= pr.weekendHeavy ? 1.55 : 0.8;
    return { label, value: Math.round(v) };
  });

  const checkins7d = byDay.reduce((s, d) => s + d.value, 0);
  const todayIdx = (new Date().getDay() + 6) % 7; // Pn=0
  const checkinsToday = byDay[todayIdx].value;
  const views7d = checkins7d * (7 + (hashId(id + 'v') % 6));
  const views30d = Math.round(views7d * (3.6 + (hashId(id + 'v30') % 10) / 10));
  const newFollowers7d = 4 + (hashId(id + 'nf') % 40);
  const usedOffers7d = 6 + (hashId(id + 'uo') % 50);
  const trend7dPct = (hashId(id + 'trd') % 41) - 12; // -12..+28

  return {
    views7d, views30d, checkinsToday, checkins7d, newFollowers7d, usedOffers7d,
    age: pr.age, gender: pr.gender, byDay, byHour, peakHour, peakLabel,
    slowestDay, busiestDay, slowestDayLabel: DAYS[slowestDay], busiestDayLabel: DAYS[busiestDay], trend7dPct,
  };
}
