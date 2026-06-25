# Lokalio — prototyp web

Aplikacja **Lokalio** („Twoje miasto żyje") — wydarzenia z instytucji i lokali, bony i promocje,
agent „Lokalio", meldowanie w lokalach. **Wielomiastowo:** pilotaż **Sandomierz + okolice**
(Tarnobrzeg, Stalowa Wola, Opatów) oraz **Kraków**, z przełącznikiem miasta i GPS.

> Tryb demo: dane w pamięci, stan w `localStorage`. Realny agent (Claude) i konta (Supabase)
> włącza się przez klucze w `.env` — patrz **[BACKEND.md](BACKEND.md)**.

## Uruchomienie

```bash
cd lokalio/web
npm install      # tylko za pierwszym razem
npm run dev      # http://localhost:5173

# opcjonalnie: realny agent (po ustawieniu ANTHROPIC_API_KEY w .env)
npm run server   # proxy do Claude na :8787; bez klucza frontend używa symulacji
```

Otwórz `http://localhost:5173`. Na komputerze apka pokazuje się w ramce telefonu;
na telefonie/wąskim oknie wypełnia ekran. Najlepiej oglądać w trybie mobilnym (DevTools → urządzenie).

## Stack

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** (marka 1:1 z design systemem: koral `#FF5A4D`, Inter, kolory 5 kategorii)
- **Leaflet + OpenStreetMap/CARTO** (mapa, bez kluczy API)
- **lucide-react** (ikony)

## Co jest w środku

| Ekran | Funkcje |
|---|---|
| **Onboarding** | imię, **wiek + płeć**, dzielnica, preferowane kategorie |
| **Lokalizacja** | wybór **miasta** (Sandomierz + okolice + Kraków) + **GPS** („Użyj mojej lokalizacji", wykrywa najbliższe miasto); dystanse na żywo |
| **Na dziś** | feed z filtrem **odległości**, czasu i **„za darmo"**; ceny przy płatnych; nudge meldowania; znajomi |
| **Mapa** | pinezki wydarzeń/lokali, okrąg zasięgu, **przycisk lokalizacji (GPS)**, filtry, karta miejsca |
| **Lokalio (agent)** | rozmowa: nastrój albo swobodny tekst → propozycje (realny Claude po dodaniu klucza, inaczej symulacja) |
| **Bony** | promocje i bony po odległości; **aktywacja z odliczaniem**; obsługa klika „Zrealizowane" na telefonie klienta → bon znika |
| **Lokal** | **meldowanie + anonimowa demografia** (wiek/płeć), znajomi tutaj, bony, wydarzenia |
| **Wydarzenie** | organizator (obserwuj), meta, **cena/„za darmo"**, mini-mapa, podobne, **udostępnianie** |
| **Znajomi** | **dodawanie/usuwanie** znajomych, wyszukiwanie, gdzie się meldują |
| **Profil** | punkty, poziom, **odznaki**, statystyki, **znajomi**, obserwowani |
| **Panel właściciela** | **logowanie kodem na e-mail** (anty-spam), dodawanie wydarzeń i ofert (trafiają do feedu) |

## Struktura

```
src/
  data/cities.ts      — rejestr miast (Sandomierz + okolice + Kraków) + przypisanie po geografii
  data/seed.ts        — dane miast (instytucje, lokale, wydarzenia, oferty, znajomi)
  lib/                — geo, format (daty PL), agent (symulacja), agentService (proxy + fallback)
  store/AppContext.tsx — stan: miasto, nawigacja, użytkownik, zapisane, meldunki, bony, punkty
  components/         — UI, karty, mapa, nawigacja
  screens/            — ekrany (onboarding, home, map, agent, vouchers, profile, detale)
server/agent.mjs      — proxy agenta → Claude (czyta ANTHROPIC_API_KEY; bez niego frontend = symulacja)
```

## Co byłoby „prawdziwe" w wersji produkcyjnej

- agent: realny Claude — **gotowe**, wystarczy klucz w `.env` (patrz [BACKEND.md](BACKEND.md)),
- backend + konta (Supabase): warstwa danych za `AppContext` — do podłączenia ([BACKEND.md](BACKEND.md)),
- logowanie właściciela: prawdziwa weryfikacja (kod e-mail/SMS, NIP) zamiast demo,
- import wydarzeń z instytucji (API/scraping), płatne „Promowane",
- dane dla całej Polski (teraz: Sandomierz + okolice + Kraków).
