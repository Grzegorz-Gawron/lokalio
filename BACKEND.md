# Lokalio — backend, konta i realny agent

Status: prototyp działa **w trybie demo** (dane w `src/data`, stan w `localStorage`).
Poniżej co jest gotowe i jak włączyć „na żywo". Klucze trzymamy w `.env` (patrz `.env.example`) — **nigdy w repo ani w czacie**.

## 1. Realny agent — gotowe, czeka na klucz (NVIDIA / OpenAI-compatible)

- Frontend woła `POST /api/agent` (`src/lib/agentService.ts`). Vite proxuje `/api` → `http://localhost:8787`.
- Proxy `server/agent.mjs` (Node, bez zależności) trzyma klucz i woła **API zgodne z OpenAI**.
  Domyślnie **NVIDIA `build.nvidia.com`** (`integrate.api.nvidia.com`), ale zadziała z OpenAI, Groq, Together, lokalnym Ollama itd.
- **Bez klucza / bez serwera** frontend płynnie wraca do wbudowanej symulacji — apka zawsze działa.

Włączenie (NVIDIA):
```bash
# 1) klucz z https://build.nvidia.com → w .env:  LOKALIO_API_KEY=nvapi-...
#    (opcjonalnie LOKALIO_MODEL, np. meta/llama-3.1-8b-instruct dla szybkości)
# 2) terminal 1:
npm run server      # lub: node --env-file=.env server/agent.mjs
# 3) terminal 2:
npm run dev
```
Inny dostawca? Zmień `LOKALIO_API_BASE` (np. `https://api.openai.com/v1`) + `LOKALIO_API_KEY` + `LOKALIO_MODEL`.

Agent dla swobodnego tekstu dostaje listę miejsc/wydarzeń z bieżącego miasta i wybiera dopasowane (zwraca JSON z id).
Szybkie „nastroje" (chipy) działają lokalnie dla błyskawicznej odpowiedzi.

## 2. Backend + realne konta (rekomendacja: Supabase)

Wybrana ścieżka: **szkielet + fallback** — teraz `localStorage`, później Supabase bez przepisywania UI.

Punkt styku: cała persystencja i akcje są w `src/store/AppContext.tsx`. Wymiana = podmiana
zapisu/odczytu na klienta Supabase za interfejsem (np. `src/services/backend.ts`).

> **Uwaga:** projekt Supabase jest WSPÓLNY z apką mobilną (te same `URL`/`anon key`).
> Dlatego web-owe tabele mają prefiks `lk_` — nie kolidują z mobilnymi i niczego nie kasują.

Podejście **accounts-first**: katalog (wydarzenia/lokale/oferty) zostaje na razie w aplikacji
(`src/data`), a w Supabase trzymamy realne **konta i akcje użytkownika**.

Gotowe po stronie kodu: klient `src/lib/supabase.ts` (czyta `.env`; bez konfiguracji apka działa na localStorage),
schemat **`supabase/schema.sql`** (tabele `lk_*` + RLS + widok meldowań). SDK `@supabase/supabase-js` zainstalowany.

Kroki włączenia (Ty — ja nie zakładam kont ani nie wpisuję kluczy):
1. Supabase → **SQL Editor** → uruchom **`supabase/schema.sql`** (bezpieczne, tworzy tylko `lk_*`).
2. **Authentication → Providers** → włącz **Email** (magic link, bez haseł).
3. `.env` ma już `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` (etap 1 zrobiony).
4. Daj znać — wpinam logowanie (magic link), profil, meldunki/bony/zapisane/znajomych do bazy. Testujemy na żywo.

Model danych (`supabase/schema.sql`, prefiks `lk_`):
- `lk_profiles` (wiek, płeć, miasto `city_id`, punkty, preferencje)
- `lk_checkins` + widok `lk_venue_live_counts` (anonimowy agregat „ile osób teraz")
- `lk_vouchers` (aktywacja + realizacja: „Zrealizowane" → `status = 'redeemed'`)
- `lk_saves`, `lk_follows`, `lk_friends`
- katalog (`lk_organizers/lk_venues/lk_events/lk_offers`) dodamy później, gdy lokale mają zarządzać treścią same.

## 3. Miasta

- Rejestr: `src/data/cities.ts` (Sandomierz domyślny + Tarnobrzeg, Stalowa Wola, Opatów, Kraków).
- Dane przypisują się do miasta po najbliższym centrum (`cityIdOf`). Docelowo: kolumna miasta w bazie + import wydarzeń z instytucji (API/scraping).

## Bezpieczeństwo
- Klucz modelu (`LOKALIO_API_KEY`) żyje tylko na serwerze (`server/agent.mjs`), nigdy w bundlu frontendu.
- `anon` key Supabase jest publiczny z założenia (chroni go RLS); `service_role` NIGDY nie trafia do frontendu.
- `.env` jest w `.gitignore`; commitujemy tylko `.env.example`.
