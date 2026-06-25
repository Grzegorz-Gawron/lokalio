import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Send, ChevronRight, Wand2, Mic } from 'lucide-react';
import { cx } from '../components/ui';
import { buildInsights, advisorReply, advisorPayload, type AdvisorCtx, type AdvisorAction, type Insight, type ChatTurn } from '../lib/advisor';

const TONE: Record<Insight['tone'], { ring: string; chip: string; label: string }> = {
  warning: { ring: 'border-coral/30', chip: 'bg-coral/12 text-coral', label: 'Do zrobienia' },
  opportunity: { ring: 'border-info/30', chip: 'bg-info/12 text-info', label: 'Szansa' },
  win: { ring: 'border-success/30', chip: 'bg-success/14 text-success', label: 'Działa' },
};

export function BusinessAdvisor({ ctx, onAction }: { ctx: AdvisorCtx; onAction: (a: AdvisorAction) => void }) {
  const insights = useMemo(() => buildInsights(ctx), [ctx]);
  const prompts = ctx.kind === 'organizer'
    ? ['Jak zwiększyć frekwencję?', 'Darmowe czy biletowane?', 'Co działa najlepiej?']
    : ['Kiedy mam pusto?', 'Co działa najlepiej?', 'Jak przyciągnąć więcej ludzi?'];
  const [chat, setChat] = useState<ChatTurn[]>([
    { from: 'ai', text: ctx.kind === 'organizer' ? 'Cześć! Patrzę na Twoje wydarzenia i obserwujących. Zapytaj o cokolwiek albo skorzystaj z podpowiedzi wyżej.' : 'Cześć! Patrzę na Twój ruch, oferty i obserwujących. Zapytaj o cokolwiek albo skorzystaj z podpowiedzi wyżej.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollDown = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);

  // Mówienie głosem — Web Speech API (Chrome/Edge/Safari). Brak wsparcia → przycisk ukryty.
  const SpeechRec = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  const speechSupported = !!SpeechRec;
  const recogRef = useRef<{ stop: () => void } | null>(null);
  const [listening, setListening] = useState(false);
  useEffect(() => () => recogRef.current?.stop(), []);
  const toggleMic = () => {
    if (!SpeechRec) return;
    if (listening) { recogRef.current?.stop(); return; }
    const rec = new (SpeechRec as new () => Record<string, unknown>)() as Record<string, unknown> & { start: () => void; stop: () => void };
    rec.lang = 'pl-PL';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setInput(txt);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recogRef.current = rec;
    setListening(true);
    rec.start();
  };

  const send = async (textArg?: string) => {
    if (listening) recogRef.current?.stop();
    const text = (textArg ?? input).trim();
    if (!text || busy) return;
    setChat((c) => [...c, { from: 'you', text }]);
    setInput('');
    setBusy(true);
    scrollDown();
    // Najpierw realny model (NVIDIA przez /api/advisor); gdy brak klucza / błąd / offline — heurystyka.
    let reply = '';
    try {
      const r = await fetch('/api/advisor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(advisorPayload(ctx, text)) });
      const d = await r.json();
      reply = String(d?.text ?? '').trim();
    } catch { /* offline / brak funkcji w dev */ }
    if (!reply) reply = advisorReply(text, ctx);
    setChat((c) => [...c, { from: 'ai', text: reply }]);
    setBusy(false);
    scrollDown();
  };

  return (
    <div className="mt-2 space-y-4 pb-4">
      {/* Wstęp */}
      <div className="rounded-card bg-gradient-to-br from-coral/12 to-info/10 p-4">
        <p className="flex items-center gap-2 text-[15px] font-extrabold text-ink"><Sparkles size={18} className="text-coral" /> Doradca Lokalio</p>
        <p className="mt-1 text-[12.5px] leading-snug text-ink/70">Patrzę na Twoje liczby — ruch, oferty{ctx.kind === 'organizer' ? ', wydarzenia' : ''} i obserwujących — i podpowiadam, jak zwiększyć zarobek i przyciągnąć więcej klientów.</p>
      </div>

      {/* Wskazówki */}
      <div className="space-y-2.5">
        <p className="px-0.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Wskazówki dla Ciebie</p>
        {insights.map((i) => (
          <div key={i.id} className={cx('rounded-card border bg-paper p-3.5 shadow-card', TONE[i.tone].ring)}>
            <div className="flex items-start gap-2.5">
              <span className="text-[22px] leading-none">{i.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold', TONE[i.tone].chip)}>{TONE[i.tone].label}</span>
                </div>
                <p className="mt-1.5 text-[14px] font-bold leading-snug text-ink">{i.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink/70">{i.detail}</p>
                {i.action && (
                  <button
                    onClick={() => onAction(i.action!)}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-coral px-3.5 py-2 text-[12.5px] font-bold text-white shadow-coral active:scale-95"
                  >
                    {i.action.kind === 'open' ? <ChevronRight size={14} /> : <Wand2 size={14} />} {i.action.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Czat */}
      <div className="rounded-card bg-paper p-3.5 shadow-card">
        <p className="mb-2 text-[13px] font-bold text-ink">Zapytaj doradcę</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {prompts.map((p) => (
            <button key={p} onClick={() => send(p)} className="rounded-full bg-black/5 px-2.5 py-1 text-[11.5px] font-semibold text-ink/65 active:scale-95">{p}</button>
          ))}
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto no-scrollbar">
          {chat.map((m, i) => (
            <div key={i} className={cx('flex', m.from === 'you' ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed', m.from === 'you' ? 'bg-coral text-white' : 'bg-black/[0.05] text-ink/85')}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-1.5 rounded-2xl bg-black/[0.05] px-3 py-2 text-[12.5px] text-ink/50">
                <Sparkles size={13} className="animate-pulse text-coral" /> Doradca analizuje dane…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="mt-2.5 flex items-center gap-2 rounded-full bg-black/5 px-3 py-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder={listening ? 'Słucham… mów' : 'Napisz lub powiedz pytanie…'}
            className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ink/35"
          />
          {speechSupported && (
            <button onClick={toggleMic} aria-label="Mów" className={cx('flex h-8 w-8 items-center justify-center rounded-full active:scale-90', listening ? 'animate-pulse bg-coral text-white' : 'bg-black/5 text-ink/55')}>
              <Mic size={15} />
            </button>
          )}
          <button onClick={() => send()} disabled={!input.trim() || busy} className={cx('flex h-8 w-8 items-center justify-center rounded-full', input.trim() && !busy ? 'bg-coral text-white active:scale-90' : 'bg-black/10 text-ink/30')}>
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
