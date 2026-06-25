import { useEffect, useRef, useState } from 'react';
import { Send, Mic } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { cx } from '../components/ui';
import { LogoMark } from '../components/Logo';
import { MOODS, recommend, type Suggestion } from '../lib/agent';
import { askLokalio } from '../lib/agentService';
import { FeedTile, useTileBuilders } from '../components/FeedTile';
import { venueById, eventById } from '../data/seed';

interface Msg {
  id: number;
  role: 'bot' | 'user';
  text?: string;
  suggestions?: Suggestion[];
  chips?: boolean;
  typing?: boolean;
}

let uid = 1;

export function AgentScreen() {
  const { user, armAgentVoice, setArmAgentVoice } = useApp();
  const { eventTile, venueTile, distOf } = useTileBuilders();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Rozpoznawanie mowy (Web Speech API) — Chrome / Edge / Safari.
  const SpeechRec =
    typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

  // sprzątanie nasłuchu przy wyjściu z ekranu
  useEffect(() => () => { try { recogRef.current?.abort(); } catch { /* ignore */ } }, []);

  useEffect(() => {
    setMessages([
      {
        id: uid++,
        role: 'bot',
        text: `Cześć ${user?.name ?? ''}! Jestem Lokalio 👋 Powiedz, na co masz dziś ochotę — albo wybierz szybko poniżej.`,
        chips: true,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Wejście z mikrofonu na „Zapytaj Lokalio" — od razu zacznij słuchać (krótko po montażu, by zachować aktywację gestu).
  const armedRef = useRef(false);
  useEffect(() => {
    if (!armAgentVoice || armedRef.current || !SpeechRec) return;
    armedRef.current = true;
    setArmAgentVoice(false);
    const t = window.setTimeout(() => startVoice(), 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armAgentVoice]);

  if (!user) return null;

  const respond = (moodKey: string, userText: string) => {
    const { mood, suggestions } = recommend(moodKey, user);
    setMessages((m) => [
      ...m,
      { id: uid++, role: 'user', text: userText },
    ]);
    // krótka pauza "pisze..."
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        suggestions.length
          ? { id: uid++, role: 'bot', text: mood.reply, suggestions }
          : { id: uid++, role: 'bot', text: 'Hmm, nic idealnego nie widzę w zasięgu. Spróbuj zwiększyć dystans albo wybierz inny nastrój 🙂', chips: true },
      ]);
    }, 350);
  };

  const onMood = (key: string) => {
    const mood = MOODS.find((x) => x.key === key)!;
    respond(key, `${mood.emoji} ${mood.label}`);
  };
  const onSend = async (override?: string) => {
    const t = (override ?? input).trim();
    if (!t || !user) return;
    setInput('');
    setMessages((m) => [...m, { id: uid++, role: 'user', text: t }, { id: uid++, role: 'bot', typing: true }]);
    const reply = await askLokalio(t, user);
    setMessages((m) => {
      const base = m.filter((x) => !x.typing);
      return [
        ...base,
        reply.suggestions.length || reply.text
          ? { id: uid++, role: 'bot', text: reply.text, suggestions: reply.suggestions, chips: reply.suggestions.length === 0 }
          : { id: uid++, role: 'bot', text: 'Nie znalazłem nic w okolicy — spróbuj inaczej 🙂', chips: true },
      ];
    });
  };

  const stopVoice = () => {
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  };
  const startVoice = () => {
    if (!SpeechRec) return;
    const r = new SpeechRec();
    r.lang = 'pl-PL';
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let finalText = '';
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += seg;
        else interim += seg;
      }
      setInput((finalText + interim).trim());
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      const t = finalText.trim();
      if (t) onSend(t); // po wypowiedzi wyślij automatycznie
    };
    recogRef.current = r;
    setInput('');
    setListening(true);
    try { r.start(); } catch { setListening(false); }
  };
  const toggleVoice = () => (listening ? stopVoice() : startVoice());

  return (
    <div className="flex h-full flex-col bg-cream">
      {/* nagłówek */}
      <div className="flex shrink-0 items-center gap-3 border-b border-black/5 bg-paper px-4 py-3">
        <LogoMark size={36} rounded={11} />
        <div>
          <p className="text-[15px] font-extrabold text-ink">Lokalio</p>
          <p className="flex items-center gap-1 text-[12px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Twój lokalny przewodnik
          </p>
        </div>
      </div>

      {/* wiadomości */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 no-scrollbar">
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-coral px-4 py-2.5 text-[14px] font-medium text-white shadow-sm">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-2">
              <span className="mt-0.5 shrink-0">
                <LogoMark size={28} rounded={9} />
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                {m.typing && (
                  <div className="inline-flex items-center gap-1 rounded-2xl rounded-tl-md bg-paper px-4 py-3 shadow-sm">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/40" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/40" style={{ animationDelay: '0.15s' }} />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/40" style={{ animationDelay: '0.3s' }} />
                  </div>
                )}
                {m.text && (
                  <div className="inline-block max-w-[88%] rounded-2xl rounded-tl-md bg-paper px-4 py-2.5 text-[14px] leading-relaxed text-ink shadow-sm">
                    {m.text}
                  </div>
                )}
                {m.suggestions && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {m.suggestions.map((s) => {
                      if (s.kind === 'event') {
                        const e = eventById(s.id);
                        return e ? (
                          <div key={s.id}>
                            <FeedTile item={eventTile(e)} dist={distOf(e.coords)} />
                            <p className="mt-1 pl-1 text-[11.5px] font-medium text-coral">✨ {s.reason}</p>
                          </div>
                        ) : null;
                      }
                      const v = venueById(s.id);
                      return v ? (
                        <div key={s.id}>
                          <FeedTile item={venueTile(v)} dist={distOf(v.coords)} />
                          <p className="mt-1 pl-1 text-[11.5px] font-medium text-coral">✨ {s.reason}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
                {m.chips && (
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((mood) => (
                      <button
                        key={mood.key}
                        onClick={() => onMood(mood.key)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-coral/25 bg-paper px-3 py-2 text-[13px] font-semibold text-ink active:scale-95"
                      >
                        <span>{mood.emoji}</span> {mood.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      {/* input — uniesiony nad środkowy przycisk „Lokalio" w pasku nawigacji */}
      <div className="safe-bottom mb-8 shrink-0 border-t border-black/5 bg-paper px-3 py-2.5">
        <div className="flex items-center gap-2">
          {SpeechRec && (
            <button
              onClick={toggleVoice}
              aria-label={listening ? 'Zatrzymaj' : 'Mów do Lokalio'}
              className={cx(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90',
                listening ? 'bg-coral text-white shadow-coral ring-4 ring-coral/25' : 'bg-black/5 text-coral',
              )}
            >
              <Mic size={18} className={listening ? 'animate-pulse' : ''} />
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder={listening ? 'Słucham… mów śmiało 🎤' : 'Powiedz lub napisz…'}
            className="min-w-0 flex-1 rounded-full bg-black/5 px-4 py-2.5 text-[14px] outline-none placeholder:text-ink/35 focus:bg-black/8"
          />
          <button
            onClick={() => onSend()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral text-white shadow-coral active:scale-90"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
