# Lokalio — wdrożenie online (Vercel)

Wdrażamy **frontend (statyczny build Vite)** + **funkcję serverless `/api/agent`** (proxy do modelu).
Sekrety idą do zmiennych środowiskowych Vercel — **nigdy do repo**.

## Zmienne środowiskowe (Vercel → Project → Settings → Environment Variables)
Ustaw dla **Production** (i Preview):

| Zmienna | Wartość | Do czego |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://ryrpfmqbcdbtpsgcnbjo.supabase.co` | konta/baza (frontend, build-time) |
| `VITE_SUPABASE_ANON_KEY` | *(anon public key)* | konta/baza |
| `LOKALIO_API_KEY` | *(klucz NVIDIA `nvapi-...`)* | agent (funkcja serverless) |
| `LOKALIO_API_BASE` | `https://integrate.api.nvidia.com/v1` | agent |
| `LOKALIO_MODEL` | `meta/llama-3.3-70b-instruct` | agent |

(Wartości masz w lokalnym `.env`.)

## Metoda A — Vercel CLI (zalecane dla tego projektu w podfolderze)
W terminalu **w folderze `lokalio/web`**:
```bash
npx vercel login        # logowanie w przeglądarce (jednorazowo)
npx vercel              # pierwszy deploy (preview) — przyjmij domyślne ustawienia
# ustaw zmienne środowiskowe (panel Vercel lub: npx vercel env add NAZWA production)
npx vercel --prod       # deploy produkcyjny (z już ustawionymi zmiennymi)
```

## Metoda B — GitHub + panel Vercel
1. Wrzuć kod do repo GitHub.
2. Vercel → **Add New Project** → import repo.
3. **Root Directory** = `lokalio/web` (ważne — apka jest w podfolderze).
4. Dodaj zmienne środowiskowe (tabela wyżej) → **Deploy**.

## Po wdrożeniu — Supabase
Dodaj produkcyjny adres do logowania (żeby magic link wracał na żywą domenę):
- Supabase → **Authentication → URL Configuration**
  - **Site URL**: `https://<twoja-domena>.vercel.app`
  - **Redirect URLs**: dodaj `https://<twoja-domena>.vercel.app/**`

Gotowe — apka działa pod publicznym adresem (telefon, znajomi), agent i konta na żywo.

## Lokalnie (dev) bez zmian
`npm run dev` + `node --env-file=.env server/agent.mjs` — proxy `/api` idzie na `:8787`.
W produkcji `/api/agent` obsługuje funkcja serverless `api/agent.mjs`.
