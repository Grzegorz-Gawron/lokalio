import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getConsent, setConsent } from '../lib/consent';
import { initAnalytics } from '../lib/analytics';

/**
 * Baner zgody (RODO/ePrivacy). Pokazuje się do pierwszej decyzji.
 * „Akceptuję" → włącza analitykę (PostHog). „Tylko niezbędne" → analityka off.
 * Niezbędne (działanie apki, monitoring błędów bez PII, cookieless Vercel Analytics) działają zawsze.
 */
export function ConsentBanner() {
  const [show, setShow] = useState(() => getConsent() === null);
  if (!show) return null;

  const acceptAll = () => { setConsent('all'); initAnalytics(); setShow(false); };
  const essentialOnly = () => { setConsent('essential'); setShow(false); };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[3000] flex justify-center px-3 pb-3">
      <div className="w-full max-w-app rounded-2xl border border-black/10 bg-paper p-4 shadow-float">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral"><ShieldCheck size={19} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-ink">Szanujemy Twoją prywatność</p>
            <p className="mt-1 text-[12.5px] leading-snug text-subtle">
              Do działania aplikacji i wychwytywania błędów używamy niezbędnych narzędzi. Za Twoją zgodą włączymy też <span className="font-semibold text-ink/80">analitykę</span>, która pomaga nam ulepszać Lokalio. Szczegóły w{' '}
              <a href="/prywatnosc.html" target="_blank" rel="noopener noreferrer" className="font-bold text-coral underline">Polityce prywatności</a>.
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={essentialOnly} className="flex-1 rounded-xl bg-black/5 py-2.5 text-[13px] font-bold text-ink/70 active:scale-95">Tylko niezbędne</button>
          <button onClick={acceptAll} className="flex-[1.4] rounded-xl bg-coral py-2.5 text-[13px] font-bold text-white shadow-coral active:scale-95">Akceptuję</button>
        </div>
      </div>
    </div>
  );
}
