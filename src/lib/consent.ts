// Zgoda na analitykę (RODO / ePrivacy). PostHog (cookies + analityka) rusza dopiero po 'all'.
// Sentry (monitoring błędów, bez PII) i Vercel Analytics (cookieless) traktujemy jako niezbędne — działają zawsze.

export type Consent = 'all' | 'essential';
const KEY = 'lokalio.consent';

/** null = użytkownik jeszcze nie zdecydował (pokazujemy baner). */
export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'all' || v === 'essential' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: Consent): void {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* ignore */
  }
}

export function hasAnalyticsConsent(): boolean {
  return getConsent() === 'all';
}
