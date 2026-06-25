import { Link2, Check } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Sheet } from './ui';

const TARGETS = [
  { key: 'messenger', label: 'Messenger', emoji: '💬' },
  { key: 'whatsapp', label: 'WhatsApp', emoji: '🟢' },
  { key: 'sms', label: 'SMS', emoji: '✉️' },
  { key: 'telegram', label: 'Telegram', emoji: '✈️' },
  { key: 'instagram', label: 'Instagram', emoji: '📸' },
  { key: 'facebook', label: 'Facebook', emoji: '📘' },
  { key: 'x', label: 'X', emoji: '✖️' },
  { key: 'more', label: 'Więcej', emoji: '•••' },
];

export function ShareSheet() {
  const { shareTitle, closeShare, showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const open = shareTitle != null;
  const url = `lokalio.pl/e/${slug(shareTitle ?? '')}`;

  const shareTo = (label: string) => {
    showToast(`Udostępniono przez ${label}`, '🚀');
    closeShare();
  };
  const copy = () => {
    try {
      navigator.clipboard?.writeText('https://' + url);
    } catch {
      /* ignore */
    }
    setCopied(true);
    showToast('Skopiowano link', '🔗');
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Sheet open={open} onClose={closeShare} title="Udostępnij">
      {shareTitle && <p className="mb-1 text-center text-[14px] font-bold text-ink">{shareTitle}</p>}
      <p className="mb-4 text-center text-[13px] text-subtle">Podziel się i zaproś znajomych 🎉</p>
      <div className="grid grid-cols-4 gap-3">
        {TARGETS.map((t) => (
          <button key={t.key} onClick={() => shareTo(t.label)} className="flex flex-col items-center gap-1.5 active:scale-95">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paper text-2xl shadow-card">{t.emoji}</span>
            <span className="text-[11px] font-medium text-ink/70">{t.label}</span>
          </button>
        ))}
      </div>
      <button onClick={copy} className="mt-5 flex w-full items-center gap-3 rounded-card bg-paper p-3.5 shadow-card active:scale-[0.99]">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/12 text-coral">
          {copied ? <Check size={18} /> : <Link2 size={18} />}
        </span>
        <span className="flex-1 truncate text-left text-[13.5px] font-semibold text-ink">{url}</span>
        <span className="rounded-full bg-coral px-3 py-1.5 text-[12px] font-bold text-white">{copied ? 'Skopiowano' : 'Kopiuj'}</span>
      </button>
    </Sheet>
  );
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[żź]/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'wydarzenie';
}
