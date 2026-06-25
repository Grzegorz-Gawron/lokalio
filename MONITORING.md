# Monitoring Lokalio

Każde narzędzie ma swój własny dashboard — **nie budujemy własnego agregatu**. Tu jest mapa: co gdzie oglądać, jakie zdarzenia zbieramy i gdzie są klucze.

Produkcja: **https://web-flax-gamma-20.vercel.app** · Repo: `Grzegorz-Gawron/lokalio`

## Klucze (gdzie, NIE wartości)

Wszystkie w `.env` (lokalnie, **niecommitowane**) oraz w **Vercel → Settings → Environment Variables** (Production/Preview/Development). Szablon: [.env.example](.env.example).

| Zmienna | Narzędzie | Charakter |
|---|---|---|
| `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` | PostHog | publiczny klucz klienta (`phc_…`) + host EU |
| `VITE_SENTRY_DSN` | Sentry | publiczny DSN (region EU `ingest.de.sentry.io`) |
| `VITE_MAPBOX_TOKEN` | Mapbox | publiczny token |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase | anon key (chroniony RLS) |
| `LOKALIO_API_KEY` (+ `LOKALIO_API_BASE`, `LOKALIO_MODEL`) | NVIDIA (agent AI) | **SEKRET — tylko serwerowo**, bez `VITE_`, nigdy w bundlu |

> Klucze z prefiksem `VITE_` są publiczne z założenia (trafiają do bundla przeglądarki). Jedyny prawdziwy sekret to `LOKALIO_API_KEY` — czytany wyłącznie przez `api/*.mjs` i `server/agent.mjs`.

## Narzędzia i dashboardy

### 1. PostHog — analityka produktu (co robią użytkownicy)
- **Dashboard:** https://eu.posthog.com (instancja **EU**, projekt **209927**) → zakładka **Activity** (zdarzenia na żywo), **Web analytics**, później **Funnels/Retention**.
- **Kiedy zaglądać:** ile osób zapisuje wydarzenia, melduje się, aktywuje oferty; gdzie odpadają w lejku.
- **Kod:** `src/lib/analytics.ts` (init + `track`/`identify`/`reset`), wpięcie w `src/store/AppContext.tsx`. Bez klucza = no-op.
- **Prywatność (RODO):** instancja EU, `person_profiles: 'identified_only'`, maskowanie inputów w replay, brak maila/PII w properties. `identify(userId)` dopiero po zalogowaniu.

#### Zdarzenia, które trackujemy
| Event | Kiedy | Główne properties |
|---|---|---|
| `event_saved` | zapis/odpięcie wydarzenia (serce) | `eventId`, `saved` |
| `event_attend` | „Wezmę udział" / wypisanie | `eventId`, `attending` |
| `venue_checkin` | meldunek w lokalu | `venueId` |
| `voucher_activated` | aktywacja oferty/bonu | `offerId` |
| `org_followed` | obserwacja organizatora/lokalu | `orgId`, `following` |
| `share_opened` | otwarcie udostępniania | `title` |
| `filter_changed` | zmiana filtrów feedu | przekazany patch |
| `city_changed` | zmiana miasta | `cityId` |
| `radius_changed` | zmiana promienia (chip/slider) | `radiusKm` |
| `search` | wyszukiwanie (debounce 600 ms) | `query`, `results` |
| `$pageview`, `$autocapture` | automatycznie (PostHog) | — |

### 2. Sentry — monitoring błędów
- **Dashboard:** https://lokalio-9d.sentry.io → projekt **lokalio-web** → **Issues**.
- **Kiedy zaglądać:** gdy coś się wywala u użytkownika — stacktrace, breadcrumbs (co klikał przed błędem), w jakim release/środowisku.
- **Kod:** `src/lib/errors.ts` (init, `setErrorUser`), `ErrorBoundary` w `src/main.tsx` (fallback „Coś poszło nie tak" zamiast białej strony). Bez DSN = no-op.
- **Region:** EU (`ingest.de.sentry.io`). `sendDefaultPii: false`.
- **Alerty:** mail przy high-priority issues.

### 3. Vercel Analytics — wydajność frontendu
- **Dashboard:** https://vercel.com/knumer111-3088s-projects/web → zakładka **Analytics**.
- **Kiedy zaglądać:** Core Web Vitals (LCP/CLS/INP), realny czas ładowania, najczęstsze ścieżki.
- **Kod:** `<Analytics/>` (`@vercel/analytics`) w `src/main.tsx`. Bez kluczy. **Wymaga włączenia „Web Analytics" w panelu Vercel.**

### 4. Supabase — backend (wbudowany dashboard)
- **Dashboard:** https://supabase.com/dashboard/project/ryrpfmqbcdbtpsgcnbjo → **Reports** (zapytania, obciążenie), **Logs**, **Auth**, **Table editor**.
- **Kiedy zaglądać:** liczba zapytań, błędy auth, wzrost storage, podejrzane wzorce.
- **RLS:** włączone na **wszystkich** tabelach publicznych (`organizers`, `events`, `profiles`, `saves`, `follows`, `lk_profiles`, `lk_checkins`, `lk_vouchers`, `lk_saves`, `lk_follows`, `lk_friends`, `lk_owner_content`). Treść per-użytkownik chroniona przez `auth.uid() = profile_id`; `events`/`organizers` publicznie czytelne, zapis tylko admin.

### 5. NVIDIA — koszty/zużycie AI (agent + doradca)
- **Dashboard:** https://build.nvidia.com (tam, gdzie wygenerowano klucz `nvapi-…`).
- **Kiedy zaglądać:** liczba zapytań do modelu i koszty/limity. To NIE jest integracja w kodzie — klucz jest tylko serwerowy (proxy `api/agent.mjs`, `api/advisor.mjs`).
- **TODO:** sprawdzić, czy w panelu NVIDIA da się ustawić limit/alert budżetowy.

### 6. Uptime — czy serwis żyje
- **Narzędzie:** UptimeRobot (https://uptimerobot.com, darmowy tier 50 monitorów) — pinguje co minutę, alert mailem gdy padnie.
- **Endpointy do wpisania w monitorze:**
  - `https://web-flax-gamma-20.vercel.app/` — strona główna (HTTP 200)
  - `https://web-flax-gamma-20.vercel.app/api/health` — health check (zwraca `{"status":"ok",…}`)
- **Kod:** `api/health.mjs` (lekki, bez sekretów i bez zapytań do bazy).

## Hardening Supabase (status)

**Zastosowane** — migracja `harden_trigger_functions` (2026-06-25), zweryfikowane advisorem (11 WARN → 0):
- ✅ `REVOKE EXECUTE` na funkcjach triggerowych (`handle_new_user`, `lk_handle_new_user`, `update_organizer_events_count`, `update_organizer_followers_count`) od `anon`/`authenticated`/`public` — nie da się ich wołać przez RPC; triggery działają dalej (rejestracja konta + liczniki organizatora sprawdzone).
- ✅ Stały `search_path` na tych funkcjach (gold-standard `''` + kwalifikacja `public.organizers`).

**Świadomie zostawione** (znane, nie naprawiamy):
- ⚠️ **ERROR** `lk_venue_live_counts` (widok `SECURITY DEFINER`) — **celowe**: agregat liczników meldunków, który musi omijać RLS, by policzyć wszystkich; wystawia tylko `(venue_id, live_count)`, zero PII; zasila „X osób w okolicy" (`src/lib/backend.ts`). `security_invoker` zepsułby licznik (anon widziałby tylko własne meldunki).
- ⚠️ **WARN** leaked-password (HaveIBeenPwned) — dostępne **tylko na planie Pro** Supabase; na FREE pomijamy (cel 0 zł). Po ew. przejściu na Pro: Authentication → Attack Protection. Min. długość hasła i tak jest wymuszana.

## TODO — faza 2
- **Push** — dopiero gdy powstanie część natywna (React Native/Expo): **Expo Push**, nie OneSignal. Apka jest teraz web-only.
- **Sentry source maps** — `@sentry/vite-plugin` + `SENTRY_AUTH_TOKEN` (build-time), żeby błędy pokazywały prawdziwe linie zamiast zminifikowanych.
- **PostHog session replay** — opcjonalnie włączyć w panelu (kod już maskuje inputy).
- **Własny agregujący dashboard** — dopiero gdy ręczne klikanie po zakładkach zacznie boleć.
