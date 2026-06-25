// Vercel Serverless Function: POST /api/agent
// Odporna wersja: ręczne czytanie body, pełny try/catch, zawsze zwraca JSON.

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method not allowed' });
      return;
    }
    // .trim() usuwa ewentualny BOM/whitespace ze zmiennej (inaczej nagłówek Authorization się wywala)
    const KEY = (process.env.LOKALIO_API_KEY || process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY || '').trim();
    if (!KEY) {
      res.status(200).json({ text: '', suggestionIds: [], _err: 'no key' });
      return;
    }

    // body — czytaj odpornie (req.body może nie być sparsowane w ESM)
    let body = req.body;
    if (body == null || typeof body === 'string') {
      try {
        if (typeof body === 'string') {
          body = JSON.parse(body);
        } else {
          let raw = '';
          for await (const chunk of req) raw += chunk;
          body = raw ? JSON.parse(raw) : {};
        }
      } catch {
        body = {};
      }
    }
    const message = String(body.message ?? '');
    const cityName = String(body.cityName ?? '');
    const items = Array.isArray(body.items) ? body.items : [];

    const API_BASE = (process.env.LOKALIO_API_BASE || 'https://integrate.api.nvidia.com/v1').trim();
    const MODEL = (process.env.LOKALIO_MODEL || 'meta/llama-3.1-8b-instruct').trim();
    const SYSTEM =
      'Jesteś „Lokalio" — lokalnym przewodnikiem po polskich miastach. Na podstawie listy miejsc/wydarzeń ' +
      'wybierz maks. 3 najlepsze i odpowiedz krótko po polsku (1-2 zdania). ' +
      'Dopasowuj po polach `venueType` (rodzaj lokalu, np. „Kawiarnia", „Escape room", „Kręgielnia") oraz ' +
      '`eventCategory` (szczegółowa kategoria wydarzenia, np. „Transmisja sportowa", „Warsztaty dla dzieci"), ' +
      'a nie tylko po ogólnej `category` — np. „co dla dzieci?" → pozycje z „dla dzieci", „escape room" → venueType „Escape room". ' +
      'Zwróć WYŁĄCZNIE JSON: {"text":"...","ids":["id1","id2"]}. Wybieraj tylko z podanych id.';
    const userContent =
      `Miasto: ${cityName}\nWiadomość: ${message}\nMiejsca (JSON):\n${JSON.stringify(items).slice(0, 10000)}`;

    const r = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userContent },
        ],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      res.status(200).json({ text: '', suggestionIds: [], _err: `provider ${r.status}: ${t.slice(0, 200)}` });
      return;
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    let parsed = { text: '', ids: [] };
    try {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse((m ? m[0] : content).replace(/^```json\s*|\s*```$/g, ''));
    } catch {
      parsed = { text: String(content).slice(0, 300), ids: [] };
    }
    res.status(200).json({ text: parsed.text || 'Oto moje propozycje:', suggestionIds: parsed.ids || [] });
  } catch (e) {
    res.status(200).json({ text: '', suggestionIds: [], _err: String((e && e.stack) || e).slice(0, 400) });
  }
}
