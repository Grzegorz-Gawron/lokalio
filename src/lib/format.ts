// „Teraz" aplikacji — realny czas (start na żywo). Etykiety Dziś/Jutro i daty
// generowanych wydarzeń są względem prawdziwej daty, więc „Dodaj do kalendarza"
// zapisuje poprawny, przyszły termin.
export const APP_NOW = new Date();

// Lokalna data YYYY-MM-DD (do <input type="date">) względem „teraz" aplikacji — bez przesunięć stref (jak przy toISOString).
export const isoDateLocal = (d: Date = APP_NOW): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
// Domyślne daty w formularzach — względem DZISIAJ, nie zakodowane na sztywno (inaczej dodane treści lądują w przeszłości).
export const todayISODate = (): string => isoDateLocal(APP_NOW);
export const isoDatePlus = (days: number): string => isoDateLocal(new Date(APP_NOW.getTime() + days * 86400000));

const WEEKDAYS_SHORT = ['nd', 'pn', 'wt', 'śr', 'czw', 'pt', 'sob'];
const WEEKDAYS_LONG = [
  'niedziela',
  'poniedziałek',
  'wtorek',
  'środa',
  'czwartek',
  'piątek',
  'sobota',
];
const MONTHS = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Dziś", "Jutro", "śr", "12 cze" — względem APP_NOW. */
export function relativeDay(iso: string, now: Date = APP_NOW): string {
  const d = new Date(iso);
  const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86400000);
  if (diffDays === 0) return 'Dziś';
  if (diffDays === 1) return 'Jutro';
  if (diffDays > 1 && diffDays < 7) return cap(WEEKDAYS_LONG[d.getDay()]);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** "Dziś · 19:00" */
export function dateChipLabel(iso: string, now: Date = APP_NOW): string {
  return `${relativeDay(iso, now)} · ${formatTime(iso)}`;
}

/** "poniedziałek, 1 czerwca · 19:00" */
export function fullDateLabel(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} · ${formatTime(iso)}`;
}

export function isSameDay(iso: string, day: Date): boolean {
  return startOfDay(new Date(iso)) === startOfDay(day);
}

export function isToday(iso: string, now: Date = APP_NOW): boolean {
  return isSameDay(iso, now);
}

/** Lista 7 kolejnych dni od APP_NOW (do paska dni). */
export function next7Days(now: Date = APP_NOW): {
  date: Date;
  iso: string;
  dayNum: number;
  weekday: string;
  isToday: boolean;
  isWeekend: boolean;
}[] {
  const out = [];
  const base = new Date(startOfDay(now));
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push({
      date: d,
      iso: d.toISOString().slice(0, 10),
      dayNum: d.getDate(),
      weekday: WEEKDAYS_SHORT[d.getDay()],
      isToday: i === 0,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }
  return out;
}

/** Opcje filtra „Data" (Dla Ciebie, mapa). */
export const DATE_OPTS = [
  { k: 'today', l: 'Dziś' },
  { k: 'tomorrow', l: 'Jutro' },
  { k: 'weekend', l: 'Ten weekend' },
  { k: 'week', l: 'Ten tydzień' },
] as const;

/** Czy data ISO mieści się w wybranym oknie (today/tomorrow/weekend/week) względem APP_NOW. */
export function matchesDate(iso: string, pick: string): boolean {
  const today0 = new Date(APP_NOW.getFullYear(), APP_NOW.getMonth(), APP_NOW.getDate());
  const dow = APP_NOW.getDay();
  if (pick === 'today') return isToday(iso);
  if (pick === 'tomorrow') {
    const t = new Date(today0);
    t.setDate(today0.getDate() + 1);
    return isSameDay(iso, t);
  }
  if (pick === 'week') {
    const sun = new Date(today0);
    sun.setDate(today0.getDate() + ((7 - dow) % 7));
    sun.setHours(23, 59, 59, 999);
    const d = new Date(iso);
    return d >= today0 && d <= sun;
  }
  // weekend (najbliższa sobota + niedziela)
  const sat = new Date(today0);
  sat.setDate(today0.getDate() + ((6 - dow + 7) % 7));
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return isSameDay(iso, sat) || isSameDay(iso, sun);
}

export function mmss(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${pad(m)}:${pad(s)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
