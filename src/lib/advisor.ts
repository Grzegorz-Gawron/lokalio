import type { Offer, EventItem, CategoryKey, CheckinAgg } from '../types';
import { hashId } from './photos';
import { statViews, statUsed, statAttend } from './stats';
import type { VenueStats } from './venueStats';

// Doradca AI panelu firmowego — heurystyki nad danymi lokalu/organizatora (demo; w produkcji nad realnymi zdarzeniami).
// Zwraca proaktywne wskazówki (z gotowym szkicem promocji/wydarzenia) oraz odpowiedzi czatu.

const DAYS = ['poniedziałki', 'wtorki', 'środy', 'czwartki', 'piątki'];
const DAYS_FULL = ['poniedziałki', 'wtorki', 'środy', 'czwartki', 'piątki', 'soboty', 'niedziele'];

export interface PromoDraft {
  target: 'promo' | 'bon';
  title?: string;
  category?: string; // pozycja z OFFER_GROUPS
  valueType?: 'percent' | 'amount' | 'price';
  value?: string;
  days?: number[];
  hasHours?: boolean;
  startTime?: string;
  endTime?: string;
  reqCheckin?: boolean;
  reqFollow?: boolean;
  recurring?: boolean;
}
export interface EventDraft {
  title?: string;
  eventCat?: string;
  free?: boolean;
  price?: string;
}
export type AdvisorAction =
  | { kind: 'promo'; label: string; draft: PromoDraft }
  | { kind: 'event'; label: string; draft: EventDraft }
  | { kind: 'open'; label: string; view: string };

export interface Insight {
  id: string;
  emoji: string;
  tone: 'opportunity' | 'win' | 'warning';
  title: string;
  detail: string;
  action?: AdvisorAction;
}

export interface AdvisorCtx {
  kind: 'lokal' | 'organizer';
  name: string;
  category?: CategoryKey;
  checkin?: CheckinAgg;
  stats?: VenueStats; // pełny profil statystyk (lokal) — to samo, co widać na ekranie „Statystyki"
  followers: number;
  offers: Offer[]; // aktywne (lokal)
  events: EventItem[]; // aktywne (oba)
}

// ——— pomocnicze metryki ———
const slowDayIdx = (seed: string) => hashId(seed + 'slow') % 5;
const conv = (id: string) => Math.round((statUsed(id) / statViews(id)) * 100);
type AgeAgg = { y18_25: number; y26_35: number; y36p: number };
function dominantAge(a?: AgeAgg): { label: string; pct: number } {
  if (!a) return { label: '26–35 lat', pct: 34 };
  const max = Math.max(a.y18_25, a.y26_35, a.y36p);
  if (max === a.y18_25) return { label: '18–25 lat', pct: a.y18_25 };
  if (max === a.y26_35) return { label: '26–35 lat', pct: a.y26_35 };
  return { label: '36+', pct: a.y36p };
}
// najsłabszy dzień (nazwa) — ze statystyk, a gdy brak — z hasza nazwy
const slowDayLabel = (ctx: AdvisorCtx) => DAYS[ctx.stats ? ctx.stats.slowestDay : slowDayIdx(ctx.name)] ?? DAYS[0];

export function buildInsights(ctx: AdvisorCtx): Insight[] {
  return ctx.kind === 'organizer' ? orgInsights(ctx) : lokalInsights(ctx);
}

function lokalInsights(ctx: AdvisorCtx): Insight[] {
  const out: Insight[] = [];
  const promos = ctx.offers.filter((o) => o.kind === 'promo');
  const bons = ctx.offers.filter((o) => o.kind === 'bon');
  const checkinOffers = ctx.offers.filter((o) => o.requireCheckin);
  const followerOffers = ctx.offers.filter((o) => o.requireFollow);
  const slow = ctx.stats ? ctx.stats.slowestDay : slowDayIdx(ctx.name);
  const busiest = ctx.stats ? ctx.stats.busiestDay : 4;
  const slowDrop = ctx.stats ? Math.max(20, Math.round((1 - ctx.stats.byDay[slow].value / Math.max(1, ctx.stats.byDay[busiest].value)) * 100)) : 40;
  const age = dominantAge(ctx.stats?.age ?? ctx.checkin?.age);

  // 1) Brak jakiejkolwiek oferty
  if (ctx.offers.length === 0) {
    out.push({
      id: 'no-offers', emoji: '🎯', tone: 'warning',
      title: 'Nie masz żadnej aktywnej oferty',
      detail: 'Lokale z aktywną Ofertą Lokalio mają znacznie wyższy ruch — i wiesz, kto naprawdę przyszedł. Zacznij od czegoś prostego, szkic mam gotowy.',
      action: { kind: 'promo', label: 'Stwórz pierwszą Ofertę Lokalio', draft: { target: 'bon', title: 'Happy Hours −20%', category: 'Happy Hours', valueType: 'percent', value: '20', hasHours: true, startTime: '16:00', endTime: '18:00', days: [0, 1, 2, 3], reqCheckin: true } },
    });
  }

  // 2) Martwy dzień
  out.push({
    id: 'slow-day', emoji: '📉', tone: 'opportunity',
    title: `${cap(DAYS[slow])} to Twój najsłabszy dzień`,
    detail: `Ruch w ${DAYS[slow]} jest ~${slowDrop}% niższy niż w najlepszy dzień (${DAYS_FULL[busiest]}). Oferta Lokalio „za meldunek" w te dni wyrówna obłożenie i da Ci dane, kto przyszedł.`,
    action: { kind: 'promo', label: `Oferta Lokalio na ${DAYS[slow]}`, draft: { target: 'bon', title: `−20% w ${DAYS[slow]}`, category: 'Happy Hours', valueType: 'percent', value: '20', days: [slow], recurring: true, hasHours: true, startTime: '16:00', endTime: '19:00', reqCheckin: true } },
  });

  // 3) Oferta za meldunek — realny ruch
  if (checkinOffers.length === 0) {
    out.push({
      id: 'checkin', emoji: '📍', tone: 'opportunity',
      title: 'Brakuje Ci oferty „za meldunek"',
      detail: 'Oferty odbierane po zameldowaniu konwertują najlepiej i dają Ci realne dane o ruchu (kto, kiedy, ile osób). To Twoja przewaga.',
      action: { kind: 'promo', label: 'Stwórz ofertę za meldunek', draft: { target: 'bon', title: 'Kawa gratis za meldunek', category: 'Kawa lub deser gratis', valueType: 'price', value: '0', reqCheckin: true } },
    });
  }

  // 4) Niewykorzystani obserwujący
  if (ctx.followers >= 40 && followerOffers.length === 0) {
    out.push({
      id: 'followers', emoji: '❤️', tone: 'opportunity',
      title: `Masz ${ctx.followers} obserwujących, 0 ofert tylko dla nich`,
      detail: 'Cykliczna oferta dla obserwujących to powód, żeby Cię śledzili i wracali. Raz w miesiącu wystarczy.',
      action: { kind: 'promo', label: 'Oferta dla obserwujących', draft: { target: 'bon', title: '−15% tylko dla obserwujących', category: 'Rabat na jedzenie', valueType: 'percent', value: '15', reqFollow: true } },
    });
  }

  // 5) Demografia → dopasowana oferta
  if (age.label === '18–25 lat') {
    out.push({
      id: 'demo-young', emoji: '🎓', tone: 'opportunity',
      title: `${age.pct}% Twoich gości to ${age.label}`,
      detail: 'Młodsza grupa kocha stałą cenę i zestawy. Zestaw dnia w stałej cenie „za meldunek" trafi w nich lepiej niż procent — i policzysz, ilu przyszło.',
      action: { kind: 'promo', label: 'Zestaw studencki w cenie', draft: { target: 'bon', title: 'Zestaw dnia 19 zł', category: 'Zestaw / lunch w cenie', valueType: 'price', value: '19', reqCheckin: true } },
    });
  } else {
    out.push({
      id: 'demo', emoji: '👥', tone: 'opportunity',
      title: `${age.pct}% Twoich gości to ${age.label}`,
      detail: 'Dopasuj ofertę do tej grupy — np. lunch w cenie „za meldunek" w godzinach 12–15, kiedy ta grupa najczęściej Cię odwiedza.',
      action: { kind: 'promo', label: 'Lunch w cenie', draft: { target: 'bon', title: 'Lunch dnia w cenie', category: 'Zestaw / lunch w cenie', valueType: 'price', value: '25', hasHours: true, startTime: '12:00', endTime: '15:00', days: [0, 1, 2, 3, 4], reqCheckin: true } },
    });
  }

  // 6) Najlepsza dotychczasowa oferta → powtórz
  const withConv = [...promos, ...bons].map((o) => ({ o, c: conv(o.id) })).sort((a, b) => b.c - a.c);
  if (withConv.length >= 2) {
    const best = withConv[0];
    out.push({
      id: 'best', emoji: '🏆', tone: 'win',
      title: `„${best.o.title}" działa u Ciebie najlepiej`,
      detail: `Konwersja ${best.c}% (wyświetlenia → skorzystania). Następną promocję zrób w tym samym stylu — to sprawdzony format.`,
      action: { kind: 'open', label: 'Zobacz statystyki', view: 'stats' },
    });
  }

  return dedupePriority(out);
}

function orgInsights(ctx: AdvisorCtx): Insight[] {
  const out: Insight[] = [];

  if (ctx.events.length === 0) {
    out.push({
      id: 'no-events', emoji: '📅', tone: 'warning',
      title: 'Nie masz nadchodzących wydarzeń',
      detail: 'Regularność buduje publiczność — Twoi obserwujący dostają powiadomienie o każdym nowym wydarzeniu. Dodaj pierwsze.',
      action: { kind: 'event', label: 'Dodaj wydarzenie', draft: { title: '', free: true } },
    });
  }

  if (ctx.followers >= 40) {
    out.push({
      id: 'followers', emoji: '❤️', tone: 'opportunity',
      title: `Masz ${ctx.followers} obserwujących — wykorzystaj to`,
      detail: 'Każde wydarzenie to powiadomienie do nich. Wrzucaj je z minimum tygodniowym wyprzedzeniem — zapisów jest wtedy 2× więcej.',
      action: { kind: 'event', label: 'Zaplanuj wydarzenie', draft: { title: '', free: true } },
    });
  }

  const withAttend = ctx.events.map((e) => ({ e, a: statAttend(e.id) })).sort((x, y) => y.a - x.a);
  if (withAttend.length >= 2) {
    const best = withAttend[0];
    out.push({
      id: 'best-event', emoji: '🏆', tone: 'win',
      title: `„${best.e.title}" przyciągnęło najwięcej`,
      detail: `Ok. ${best.a} zainteresowanych udziałem. Powtórz ten format lub zrób kolejną edycję — publiczność już go zna.`,
      action: { kind: 'event', label: 'Powtórz format', draft: { title: `${best.e.title} vol. 2`, eventCat: best.e.eventCategory, free: best.e.free } },
    });
  }

  out.push({
    id: 'free-paid', emoji: '🎟️', tone: 'opportunity',
    title: 'Mieszaj wstęp wolny z biletowanym',
    detail: 'Darmowe wydarzenia budują zasięg i obserwujących, biletowane — przychód. Jedno darmowe „na rozgrzewkę" przed płatnym świetnie się sprawdza.',
    action: { kind: 'open', label: 'Zobacz statystyki', view: 'stats' },
  });

  return dedupePriority(out);
}

// kolejność: warning → opportunity → win, maks. 5
function dedupePriority(list: Insight[]): Insight[] {
  const rank = { warning: 0, opportunity: 1, win: 2 };
  return [...list].sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 5);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Ładunek dla funkcji /api/advisor (model NVIDIA) — zwięzłe statystyki, na których model ma się oprzeć.
export function advisorPayload(ctx: AdvisorCtx, message: string) {
  const st = ctx.stats;
  const age = dominantAge(st?.age ?? ctx.checkin?.age);
  return {
    message,
    kind: ctx.kind,
    name: ctx.name,
    stats: {
      kategoria: ctx.category,
      godzinaSzczytu: st ? `${st.peakHour}:00` : ctx.checkin?.peak,
      najslabszyDzien: slowDayLabel(ctx),
      najlepszyDzien: st ? DAYS_FULL[st.busiestDay] : undefined,
      trendTygodniaProc: st?.trend7dPct,
      ruchPoDniach: st?.byDay, // [{label:'Pn', value}, ...]
      wyswietlenia7dni: st?.views7d,
      meldunkiDzis: st?.checkinsToday,
      wykorzystaneOferty7dni: st?.usedOffers7d,
      nowiObserwujacy7dni: st?.newFollowers7d,
      demografiaWiek: st?.age ?? ctx.checkin?.age,
      demografiaPlec: st?.gender ?? ctx.checkin?.gender,
      dominujacaGrupaWiekowa: `${age.label} (${age.pct}%)`,
      obserwujacy: ctx.followers,
      oferty: ctx.offers.slice(0, 6).map((o) => ({ tytul: o.title, typ: o.kind === 'bon' ? 'Oferta Lokalio' : 'promocja', zaMeldunek: !!o.requireCheckin, dlaObserwujacych: !!o.requireFollow, konwersjaProc: conv(o.id) })),
      wydarzenia: ctx.events.slice(0, 6).map((e) => ({ tytul: e.title, zainteresowaniUdzialem: statAttend(e.id), wstepWolny: e.free })),
    },
  };
}

// ——— Czat: odpowiedzi heurystyczne na podstawie tych samych danych (fallback, gdy model niedostępny) ———
export interface ChatTurn { from: 'you' | 'ai'; text: string }
export function advisorReply(text: string, ctx: AdvisorCtx): string {
  const t = norm(text);
  const age = dominantAge(ctx.stats?.age ?? ctx.checkin?.age);
  const slow = slowDayLabel(ctx);
  const peak = ctx.stats ? `${ctx.stats.peakHour}:00` : 'wieczór';

  if (ctx.kind === 'organizer') {
    if (/zarob|przychod|zysk|bilet|ile/.test(t)) return 'Przychód napędzają wydarzenia biletowane, a zasięg — darmowe. Zaplanuj 1 płatne miesięcznie i „rozgrzej" je darmowym tydzień wcześniej.';
    if (/wiecej|przyciagn|publik|zapis|frekwencj/.test(t)) return `Trzy dźwignie: (1) regularność (Twoi ${ctx.followers} obserwujących dostaje powiadomienia), (2) wyprzedzenie min. tydzień, (3) zdjęcie + konkretny opis — to podwaja zapisy.`;
    if (/dziala|najlepsz|format/.test(t)) return ctx.events.length ? 'Powtarzaj formaty, które już miały frekwencję — publiczność je zna. Sprawdź „Statystyki", która edycja przyciągnęła najwięcej.' : 'Dodaj kilka wydarzeń, a powiem Ci, który format działa u Ciebie najlepiej.';
    return 'Zapytaj np. „jak zwiększyć frekwencję?", „darmowe czy biletowane?", albo kliknij wskazówkę powyżej — przygotuję gotowy szkic wydarzenia.';
  }

  if (/zarob|przychod|zysk|ile/.test(t)) return 'Najwięcej „dowozi" oferta za meldunek (realny ruch) i zestaw w stałej cenie (wyższy rachunek niż procent). Sprawdź „Statystyki" → kolumna „Skorzystało".';
  if (/pusto|martw|slab|kiedy|godzin/.test(t)) return `Najsłabsze są u Ciebie ${slow}, a szczyt masz ok. ${peak}. Ofertę Lokalio „za meldunek" wrzuć w ${slow} i poza godziną szczytu — chętnie przygotuję szkic.`;
  if (/dziala|najlepsz|skuteczn|konwersj/.test(t)) return 'U Ciebie najlepiej konwertują oferty „za meldunek" i oferty cenowe (stała cena). Procentowe rabaty działają słabiej — trudniej je „poczuć".';
  if (/wiecej|przyciagn|klient|ruch|ludzi/.test(t)) return `Trzy dźwignie: (1) oferta za meldunek = realny ruch, (2) oferta dla ${ctx.followers} obserwujących = powroty, (3) zestaw w cenie dla grupy ${age.label} (${age.pct}% Twoich gości).`;
  if (/promocj|oferta|co zrobic|pomysl/.test(t)) return `Zacznij od Oferty Lokalio na ${slow} (najsłabszy dzień) albo oferty dla obserwujących. Kliknij wskazówkę powyżej — wypełnię formularz Oferty Lokalio za Ciebie.`;
  return 'Zapytaj np. „kiedy mam pusto?", „co działa najlepiej?", „jak przyciągnąć więcej ludzi?" — albo kliknij wskazówkę powyżej, a przygotuję gotowy szkic Oferty Lokalio.';
}

function norm(s: string): string {
  return s.toLowerCase().replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[źż]/g, 'z');
}
