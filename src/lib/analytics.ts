import posthog from 'posthog-js';

// Analityka produktu (PostHog). Cienka warstwa, żeby reszta aplikacji wołała track()/identify()
// bez wiązania się z SDK. Bez klucza w .env nic się nie inicjalizuje — wszystkie funkcje to no-op,
// więc dev bez konta PostHog działa normalnie (i nic nie leci na zewnątrz).
//
// Klucz „phc_…" to PUBLICZNY klucz projektu (z założenia trafia do bundla) — nie sekret.
// RODO: używamy instancji EU (domyślnie eu.i.posthog.com) i nie wysyłamy maila/PII jako properties.

const KEY = (import.meta.env.VITE_POSTHOG_KEY ?? '').trim();
const HOST = (import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com').trim();

let enabled = false;

export function initAnalytics(): void {
  if (enabled || !KEY) return; // brak klucza → świadomy no-op
  posthog.init(KEY, {
    api_host: HOST,
    // Anonimowo do czasu logowania: zdarzenia lecą, ale profil osoby powstaje dopiero po identify
    // (taniej + prywatniej). Po zalogowaniu wołamy identifyUser(userId).
    person_profiles: 'identified_only',
    capture_pageview: true,
    autocapture: true,
    // RODO: w ewentualnym session replay maskujemy wszystkie pola formularzy.
    session_recording: { maskAllInputs: true },
  });
  enabled = true;
}

/** Zdarzenie produktowe. Bez inicjalizacji (brak klucza) — nic nie robi. */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!enabled) return;
  posthog.capture(event, props);
}

/** Spina anonimową sesję z kontem po zalogowaniu. NIE przekazujemy tu maila/PII. */
export function identifyUser(id: string, props?: Record<string, unknown>): void {
  if (!enabled || !id) return;
  posthog.identify(id, props);
}

/** Wylogowanie — rozłącz sesję od konta (kolejne zdarzenia znów anonimowe). */
export function resetAnalytics(): void {
  if (!enabled) return;
  posthog.reset();
}
