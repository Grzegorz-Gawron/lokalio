import * as Sentry from '@sentry/react';

// Monitoring błędów (Sentry). Bez DSN w .env nic się nie inicjalizuje — wszystkie funkcje to no-op,
// więc dev bez konta Sentry działa normalnie i nic nie leci na zewnątrz.
// DSN jest publiczny (z założenia trafia do bundla, jak klucz PostHoga) — nie sekret.
// RODO: sendDefaultPii=false (nie dosyłamy IP/maila); breadcrumbs domyślne (klik/console/fetch).

const DSN = (import.meta.env.VITE_SENTRY_DSN ?? '').trim();

let enabled = false;

export function initErrorTracking(): void {
  if (enabled || !DSN) return; // brak DSN → świadomy no-op
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE, // 'development' | 'production'
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1, // 10% śladów wydajności — lekko, pod darmowy tier
    sendDefaultPii: false,
    // release/source maps: dokładamy w fazie 2 przez @sentry/vite-plugin + SENTRY_AUTH_TOKEN
  });
  enabled = true;
}

/** Kontekst użytkownika dla błędów (tylko id, bez maila/PII). null = wyczyść (po wylogowaniu). */
export function setErrorUser(id: string | null): void {
  if (!enabled) return;
  Sentry.setUser(id ? { id } : null);
}
