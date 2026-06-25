// Proxy agenta Lokalio → model językowy przez API zgodne z OpenAI.
// Domyślnie wskazuje na NVIDIA build.nvidia.com (integrate.api.nvidia.com),
// ale zadziała z każdym dostawcą OpenAI-compatible (OpenAI, Groq, Together, lokalny Ollama…).
// Bez zależności (Node 18+ ma fetch). Klucz żyje TYLKO po stronie serwera.
//
// Uruchomienie (klucz w .env):
//   node --env-file=.env server/agent.mjs
// albo: LOKALIO_API_KEY=nvapi-... node server/agent.mjs
//
// Bez klucza serwer zwraca 501, a frontend płynnie wraca do wbudowanej symulacji.

import { createServer } from 'node:http';

const PORT = Number(process.env.LOKALIO_AGENT_PORT || 8787);
const API_BASE = process.env.LOKALIO_API_BASE || 'https://integrate.api.nvidia.com/v1';
const MODEL = process.env.LOKALIO_MODEL || 'meta/llama-3.3-70b-instruct';
const KEY = process.env.LOKALIO_API_KEY || process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;

const SYSTEM = `Jesteś „Lokalio" — lokalnym, rzeczowym i ciepłym przewodnikiem po polskich miastach.
Użytkownik pisze, na co ma ochotę. Na podstawie PODANEJ listy miejsc i wydarzeń (tylko z jego miasta)
wybierz maks. 3 najlepiej pasujące i odpowiedz krótko po polsku (1-2 zdania, bez wypunktowań).
Zwróć WYŁĄCZNIE poprawny JSON, bez markdown i bez komentarzy:
{"text": "krótka odpowiedź", "ids": ["id1","id2"]}
Wybieraj tylko z podanych id. Jeśli nic nie pasuje, zwróć pustą tablicę ids.`;

function send(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(JSON.stringify(obj));
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST' || !req.url?.startsWith('/api/agent')) return send(res, 404, { error: 'not found' });
  if (!KEY) return send(res, 501, { error: 'Brak klucza (LOKALIO_API_KEY) — frontend użyje symulacji.' });

  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', async () => {
    try {
      const { message, cityName, items } = JSON.parse(raw || '{}');
      const userContent =
        `Miasto: ${cityName}\nWiadomość użytkownika: ${message}\n` +
        `Dostępne miejsca i wydarzenia (JSON):\n${JSON.stringify(items).slice(0, 12000)}`;

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
        return send(res, 502, { error: `Provider ${r.status}: ${t.slice(0, 300)}` });
      }
      const data = await r.json();
      const content = data?.choices?.[0]?.message?.content ?? '';
      let parsed = { text: '', ids: [] };
      try {
        // wytnij ewentualne ```json ... ``` lub tekst wokół JSON-a
        const m = content.match(/\{[\s\S]*\}/);
        parsed = JSON.parse((m ? m[0] : content).replace(/^```json\s*|\s*```$/g, ''));
      } catch {
        parsed = { text: String(content).slice(0, 300), ids: [] };
      }
      send(res, 200, { text: parsed.text || 'Oto moje propozycje:', suggestionIds: parsed.ids || [] });
    } catch (e) {
      send(res, 500, { error: String(e) });
    }
  });
});

server.listen(PORT, () => {
  console.log(`[lokalio-agent] proxy http://localhost:${PORT}/api/agent`);
  console.log(`  dostawca: ${API_BASE}  model: ${MODEL}  klucz: ${KEY ? 'ustawiony' : 'BRAK → fallback'}`);
});
