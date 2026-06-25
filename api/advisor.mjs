// Vercel Serverless Function: POST /api/advisor
// Doradca AI panelu firmowego — odpowiada na pytania właściciela, opierając się na statystykach lokalu/organizatora.
// Ten sam dostawca/klucz/model co Agent Lokalio (NVIDIA przez endpoint zgodny z OpenAI). Brak klucza → pusty wynik (front używa heurystyk).

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method not allowed' });
      return;
    }
    const KEY = (process.env.LOKALIO_API_KEY || process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY || '').trim();
    if (!KEY) {
      res.status(200).json({ text: '', _err: 'no key' });
      return;
    }

    // body — czytaj odpornie (req.body bywa nieparsowane w ESM)
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
    const kind = body.kind === 'organizer' ? 'organizer' : 'lokal';
    const name = String(body.name ?? '');
    const stats = body.stats ?? {};

    const API_BASE = (process.env.LOKALIO_API_BASE || 'https://integrate.api.nvidia.com/v1').trim();
    const MODEL = (process.env.LOKALIO_MODEL || 'meta/llama-3.1-8b-instruct').trim();

    const who = kind === 'organizer' ? 'organizatora wydarzeń' : 'właściciela lokalu';
    const goal = kind === 'organizer' ? 'frekwencję i liczbę obserwujących' : 'ruch, zarobek i liczbę klientów';
    const SYSTEM =
      `Jesteś doradcą biznesowym dla ${who} w aplikacji Lokalio. Masz wgląd w jego statystyki: ruch i godziny szczytu (z meldunków w aplikacji), ` +
      `anonimową demografię gości, oferty/promocje i ich skuteczność, obserwujących${kind === 'organizer' ? ' oraz wydarzenia' : ''}. ` +
      `Odpowiadaj KRÓTKO (2–4 zdania), konkretnie i po polsku, zawsze opierając się na PODANYCH liczbach. ` +
      `Celem jest zwiększyć ${goal}. Gdy to pasuje, zaproponuj jeden konkretny ruch ` +
      `(typ promocji/oferty lub wydarzenia: wartość, dni, godziny, dla kogo). Nie wymyślaj danych, których nie ma w statystykach. Bez list punktowanych — naturalne zdania.`;
    const userContent =
      `Lokal/organizator: ${name}\nStatystyki (JSON):\n${JSON.stringify(stats).slice(0, 6000)}\n\nPytanie: ${message}`;

    const r = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        max_tokens: 320,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userContent },
        ],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      res.status(200).json({ text: '', _err: `provider ${r.status}: ${t.slice(0, 200)}` });
      return;
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    res.status(200).json({ text: String(content).trim().slice(0, 800) });
  } catch (e) {
    res.status(200).json({ text: '', _err: String((e && e.stack) || e).slice(0, 400) });
  }
}
