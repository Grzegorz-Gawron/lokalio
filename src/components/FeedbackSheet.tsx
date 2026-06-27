import { useState } from 'react';
import { Bug, Lightbulb, MessageSquarePlus, Star, Send } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { dbInsertFeedback, type FeedbackType } from '../lib/backend';
import { getAnonId } from '../lib/analytics';
import { Sheet, cx } from './ui';

const TYPES: { key: FeedbackType; label: string; icon: typeof Bug }[] = [
  { key: 'bug', label: 'Błąd', icon: Bug },
  { key: 'idea', label: 'Pomysł', icon: Lightbulb },
  { key: 'other', label: 'Inne', icon: MessageSquarePlus },
];

export function FeedbackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { account, currentCity, tab, route, showToast } = useApp();
  const [type, setType] = useState<FeedbackType>('idea');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0); // 0 = brak oceny
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => { setType('idea'); setMessage(''); setRating(0); setErrorMsg(''); };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setErrorMsg('');
    const { error } = await dbInsertFeedback({
      type,
      message,
      rating: rating || null,
      userRef: account?.userId ?? getAnonId(),
      appContext: {
        screen: route?.name ?? tab,
        city: currentCity.name,
        cityId: currentCity.id,
        version: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? null,
        mode: import.meta.env.MODE,
        ua: navigator.userAgent,
      },
    });
    setSending(false);
    if (error) { setErrorMsg('Nie udało się wysłać, spróbuj ponownie.'); return; } // treść zostaje
    showToast('Dzięki! Twoja uwaga do nas dotarła.', '✅');
    close();
  };

  return (
    <Sheet open={open} onClose={close} title="Zgłoś uwagę / pomysł">
      {/* Typ zgłoszenia */}
      <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink/50">Czego dotyczy?</p>
      <div className="flex gap-2">
        {TYPES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setType(key)}
            aria-pressed={type === key}
            className={cx(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[13px] font-bold transition active:scale-95',
              type === key ? 'border-transparent bg-coral text-white shadow-coral' : 'border-black/10 bg-paper text-ink/70',
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Treść */}
      <p className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wide text-ink/50">Twoja uwaga</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder="Co chcesz nam przekazać?"
        className="w-full resize-none rounded-card border border-black/10 bg-paper px-3.5 py-3 text-[14px] outline-none focus:border-coral"
      />

      {/* Ocena (opcjonalna) */}
      <p className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wide text-ink/50">Jak Ci się korzysta z Lokalio? <span className="font-medium normal-case text-ink/35">(opcjonalnie)</span></p>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating((r) => (r === n ? 0 : n))}
            aria-label={`Ocena ${n} z 5`}
            className="p-1 active:scale-90"
          >
            <Star size={26} className={cx('transition', n <= rating ? 'fill-coral text-coral' : 'text-ink/25')} />
          </button>
        ))}
      </div>

      {/* Błąd zapisu — treść nie ginie */}
      {errorMsg && (
        <div className="mt-4 rounded-xl bg-danger/10 p-3">
          <p className="text-[13px] font-bold text-danger">⚠️ {errorMsg}</p>
        </div>
      )}

      {/* Wyślij */}
      <button
        onClick={submit}
        disabled={!message.trim() || sending}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3.5 text-[15px] font-bold text-white shadow-coral transition active:scale-[0.98] disabled:opacity-50"
      >
        {sending
          ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Wysyłam…</>
          : <><Send size={18} /> Wyślij</>}
      </button>
      <p className="mt-3 text-center text-[11.5px] text-subtle">Czytamy każde zgłoszenie. Dzięki, że pomagasz ulepszać Lokalio 🧡</p>
    </Sheet>
  );
}
