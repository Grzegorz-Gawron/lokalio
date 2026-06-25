// Dodawanie wydarzenia do kalendarza przez plik .ics (uniwersalny: Google / Apple / Outlook).

interface CalEvent {
  title: string;
  dateIso: string;
  endIso?: string;
  place?: string;
  description?: string;
}

// Czas „pływający" (lokalny, bez strefy) — wydarzenie o 19:00 zostaje 19:00 wszędzie.
function fmtLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

const esc = (s: string) => (s || '').replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');

export function buildIcs(e: CalEvent): string {
  const start = new Date(e.dateIso);
  const end = e.endIso ? new Date(e.endIso) : new Date(start.getTime() + 2 * 60 * 60 * 1000); // domyślnie 2 h
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lokalio//PL',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@lokalio`,
    `DTSTAMP:${fmtLocal(new Date())}`,
    `DTSTART:${fmtLocal(start)}`,
    `DTEND:${fmtLocal(end)}`,
    `SUMMARY:${esc(e.title)}`,
    e.place ? `LOCATION:${esc(e.place)}` : '',
    e.description ? `DESCRIPTION:${esc(e.description)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

function isMobile(): boolean {
  const ua = navigator.userAgent || '';
  // iPhone/iPad/Android; iPad od iPadOS 13 raportuje się jako „Mac" → wykryj po dotyku.
  return /Android|iP(hone|ad|od)/i.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
}

export function addToCalendar(e: CalEvent) {
  const blob = new Blob([buildIcs(e)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  if (isMobile()) {
    // Telefon: otwórz plik .ics, by system pokazał „Dodaj do kalendarza" (iOS/Android).
    // (Atrybut download jest na iOS ignorowany — dlatego otwieramy plik zamiast pobierać.)
    const opened = window.open(url, '_blank');
    if (!opened) window.location.href = url; // fallback, gdy popup zablokowany
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }

  // Desktop: pobierz plik .ics (Google / Apple / Outlook importują go po otwarciu).
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(e.title || 'wydarzenie').replace(/[^\w-]+/g, '-').slice(0, 40)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
