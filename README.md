# Lokalio — aplikacja web (MVP)

**Lokalio** („Twoje miasto żyje") — odkrywanie miasta: wydarzenia z instytucji i lokali,
promocje i **Oferty Lokalio** (za meldunek / dla obserwujących), meldowanie w lokalach,
**Doradca AI** dla firm i **panel firmowy** dla lokali oraz organizatorów.
**Wielomiastowo:** pilotaż **Sandomierz + okolice** (Tarnobrzeg, Stalowa Wola, Opatów) oraz **Kraków**,
z przełącznikiem miasta i GPS.

> **Status:** MVP w budowie, pilotaż Sandomierz. Stan klienta trzymany w `localStorage`;
> **backend Supabase jest podłączony** (konta, publiczny kanał wydarzeń, sync treści właściciela),
> a **Doradca/agent AI** działa przez proxy serwerowe. Szczegóły: **[BACKEND.md](BACKEND.md)**.

## Uruchomienie

```bash
cd lokalio/web
cp .env.example .env   # uzupełnij własnymi wartościami (patrz niżej); .env NIE jest commitowany
npm install            # tylko za pierwszym razem
npm run dev            # http://localhost:5173

# opcjonalnie: realny Doradca/agent AI (po ustawieniu LOKALIO_API_KEY w .env)
npm run server         # proxy do modelu na :8787; bez klucza frontend używa symulacji
```

Otwórz `http://localhost:5173`. Na komputerze apka pokazuje się w ramce telefonu;
na telefonie/wąskim oknie wypełnia ekran. Najlepiej oglądać w trybie mobilnym (DevTools → urządzenie).

### Zmienne środowiskowe (`.env`)

Pełna lista z opisami: **[.env.example](.env.example)**. W skrócie:

| Zmienna | Do czego | Uwaga |
|---|---|---|
| `LOKALIO_API_KEY` | Doradca/agent AI (API zgodne z OpenAI, np. NVIDIA) | **tylko po stronie serwera** (`server/agent.mjs`, `api/*.mjs`) — nigdy w przeglądarce |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | konta + baza (Supabase) | anon key jest publiczny z założenia, chroni go **RLS** |
| `VITE_MAPBOX_TOKEN` | mapa (Mapbox GL) | opcjonalny; pusty = mapa działa na Leaflet/CARTO bez kluczy |

> Klucz AI (`LOKALIO_API_KEY`) **nie ma** prefiksu `VITE_`, więc nie trafia do bundla frontendu —
> przeglądarka woła `/api/agent` i `/api/advisor`, a klucz zostaje na serwerze.

## Stack

- **React 18 + TypeScript (strict) + Vite**
- **Tailwind CSS** (marka 1:1 z design systemem: koral `#FF5A4D`, Inter, kolory 5 kategorii)
- **Supabase** (konta: e-mail/hasło + OAuth Google/Apple; publiczny kanał wydarzeń; RLS)
- **Leaflet + OpenStreetMap/CARTO** mapa bez kluczy (opcjonalnie **Mapbox GL**); geokodowanie **Nominatim**
- **Doradca/agent AI** — model językowy przez proxy serwerowe (endpoint zgodny z OpenAI)
- **lucide-react** (ikony)

## Co jest w środku

| Ekran | Funkcje |
|---|---|
| **Onboarding** | imię, **wiek + płeć**, dzielnica, preferowane kategorie |
| **Lokalizacja** | wybór **miasta** (Sandomierz + okolice + Kraków) + **GPS** (wykrywa najbliższe miasto); dystanse na żywo |
| **Na dziś** | **„W okolicy teraz"** (wydarzenia ≤2 km i start ≤4 h); feed odcinany **konfigurowalnym promieniem** z **auto-poszerzaniem**, gdy mało wydarzeń; nadchodzące; nudge meldowania; znajomi |
| **Wyszukiwarka** | szukanie po wydarzeniach/lokalach/ofertach (odporne na polskie znaki), pogrupowane wyniki |
| **Mapa** | pinezki wydarzeń/lokali, **okrąg promienia** (chip 5/15/30/50 km), **przycisk GPS**, filtry, karta miejsca |
| **Doradca AI / agent** | rozmowa → propozycje; dla firm: doradca tworzy promocje i **Oferty Lokalio** |
| **Promocje / Oferty Lokalio** | promocje po odległości + oferty **za meldunek** i **dla obserwujących**; aktywacja z odliczaniem |
| **Lokal** | **meldowanie + anonimowa demografia** (wiek/płeć), znajomi tutaj, oferty, wydarzenia |
| **Wydarzenie** | organizator (obserwuj), meta, cena/„za darmo", **mini-mapa + geolokowanie adresu**, podobne, udostępnianie |
| **Powiadomienia** | feed zdarzeń (nowe wydarzenia/oferty od obserwowanych) + ustawienia |
| **Znajomi** | dodawanie/usuwanie znajomych, wyszukiwanie, gdzie się meldują |
| **Profil** | konto (logowanie e-mail/hasło + Google/Apple), punkty, poziom, odznaki, znajomi, obserwowani |
| **Panel firmowy** | dwa typy konta: **Lokal** i **Organizator**; dodawanie wydarzeń/ofert (z potwierdzeniem przed publikacją, mini-mapą i geolokowaniem), **statystyki** i **Doradca AI** |

## Struktura

```
src/
  data/cities.ts       — rejestr miast (Sandomierz + okolice + Kraków) + przypisanie po geografii
  data/seed.ts         — dane demo + rejestracja publicznych wydarzeń z Supabase
  lib/
    geo.ts, geocode.ts — odległości, geokodowanie adresu (Nominatim)
    format.ts          — daty/teksty PL
    supabase.ts        — klient Supabase (anon key)
    backend.ts         — konta, sync treści właściciela, OAuth (RLS, best-effort)
    published.ts       — publiczny kanał: wydarzenia/organizatorzy z Supabase → model aplikacji
    notifications.ts   — budowanie powiadomień
    stats.ts, venueStats.ts — silnik statystyk (lokal / organizator) + dane dla Doradcy AI
    agentService.ts    — proxy do agenta (+ fallback symulacji)
  store/AppContext.tsx — stan: miasto, nawigacja, konto, zapisane, meldunki, oferty, powiadomienia
  components/          — UI, karty, mapy (Leaflet/Mapbox), mini-mapa, nawigacja
  screens/            — ekrany (onboarding, home, map, search, agent, oferty, profil, panele firmowe, detale)
api/agent.mjs, api/advisor.mjs — funkcje serverless (Vercel): proxy AI; czytają LOKALIO_API_KEY z env
server/agent.mjs      — ten sam proxy do dev lokalnego (port 8787)
supabase/schema.sql   — schemat bazy (tabele, RLS)
```

## Roadmapa / co dalej

- **Doradca/agent AI** — działa, wystarczy klucz w `.env` ([BACKEND.md](BACKEND.md)).
- **Konta + baza (Supabase)** — podłączone; do dokończenia: spięcie loginu właściciela z realną sesją Supabase.
- logowanie firmy: realna weryfikacja (NIP/e-mail) zamiast demo,
- import wydarzeń z instytucji (API/scraping), płatne „Promowane",
- rozszerzenie poza pilotaż (teraz: Sandomierz + okolice + Kraków).
