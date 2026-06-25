import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Share2, Heart, Clock, ChevronsRight, ShieldCheck, Users, HelpCircle, AlertTriangle, Hash, Zap, CalendarCheck, MapPin, Check } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { offerById, venueById, organizerById } from '../data/seed';
import { ProgressRing, cx } from '../components/ui';
import { mmss } from '../lib/format';
import { photoUrl } from '../lib/photos';

const hhmm = (ts: number) => {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function VoucherActive({ id }: { id: string }) {
  const { offers, activeVoucherFor, activateVoucher, redeemVoucher, cancelVoucher, back, openShare, isSavedOffer, toggleSaveOffer, showToast } = useApp();
  const offer = offers.find((o) => o.id === id) ?? offerById(id);
  const av = activeVoucherFor(id);
  const [now, setNow] = useState(Date.now());
  const [redeemed, setRedeemed] = useState(false);

  // hold-to-confirm (2 s)
  const [hold, setHold] = useState(0);
  const holdTimer = useRef<number | undefined>(undefined);
  const holdStart = useRef(0);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => { window.clearInterval(t); window.clearInterval(holdTimer.current); };
  }, []);

  const remainingActive = av ? Math.max(0, av.durationSec - Math.floor((now - av.activatedAt) / 1000)) : 0;

  useEffect(() => {
    if (av && !redeemed && remainingActive === 0) {
      showToast('Oferta wygasła', '⌛');
      cancelVoucher(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingActive, av, redeemed]);

  if (!offer) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-cream px-8 text-center">
        <span className="text-5xl">⌛</span>
        <p className="text-base font-bold text-ink">Tej oferty już nie ma</p>
        <button onClick={back} className="rounded-full bg-coral px-5 py-2.5 text-[14px] font-bold text-white">Wróć</button>
      </div>
    );
  }

  const durationSec = offer.activationMinutes * 60;
  const remaining = av ? remainingActive : durationSec;
  const pct = av ? remaining / av.durationSec : 1;
  const expiresAt = av ? av.activatedAt + av.durationSec * 1000 : null;
  const venue = venueById(offer.venueId);
  const org = venue ? organizerById(venue.organizerId) : undefined;
  const photo = photoUrl(venue?.category ?? 'gastro', offer.id, 800, 420);

  const endHold = () => { window.clearInterval(holdTimer.current); if (!redeemed) setHold(0); };
  const beginHold = () => {
    if (redeemed) return;
    holdStart.current = Date.now();
    window.clearInterval(holdTimer.current);
    holdTimer.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - holdStart.current) / 2000);
      setHold(p);
      if (p >= 1) {
        window.clearInterval(holdTimer.current);
        setRedeemed(true);
        window.setTimeout(() => redeemVoucher(id), 1400); // pokaż „Zrealizowany", potem wróć
      }
    }, 30);
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-cream pb-8">
      {/* Hero */}
      <div className="relative h-60">
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/70" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <GlassBtn onClick={back}><ChevronLeft size={22} /></GlassBtn>
          <div className="flex gap-2">
            <GlassBtn onClick={() => openShare(offer.title)}><Share2 size={18} /></GlassBtn>
            <GlassBtn onClick={() => toggleSaveOffer(offer.id)}>
              <Heart size={18} className={isSavedOffer(offer.id) ? 'fill-coral text-coral' : ''} />
            </GlassBtn>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-coral px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-coral">
              {offer.kind === 'bon' ? 'Oferta' : 'Promocja'}
            </span>
            <h1 className="mt-2 text-[24px] font-extrabold leading-tight text-white drop-shadow">{offer.title}</h1>
            <p className="text-[13.5px] text-white/85">{org?.name ?? venue?.name ?? offer.subtitle}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[11px] font-bold text-white backdrop-blur"><MapPin size={11} /> {venue ? venue.district : 'Na miejscu'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        {/* Timer */}
        <div className="-mt-4 rounded-card bg-paper p-5 shadow-card">
          <p className="flex items-center justify-center gap-1.5 text-[12.5px] font-extrabold uppercase tracking-wide text-coral">
            <Clock size={14} /> {av ? 'Oferta aktywowana' : 'Oferta gotowa'}
          </p>
          <div className="my-4 flex justify-center">
            <ProgressRing progress={pct} size={186} stroke={13} color={av ? '#FF5A4D' : 'rgba(255,90,77,0.35)'} track="rgba(255,90,77,0.14)">
              <span className="text-[38px] font-extrabold tabular-nums leading-none text-ink">{mmss(remaining)}</span>
              <span className="mt-1 text-[12px] font-medium text-subtle">{av ? 'pozostało' : 'na realizację'}</span>
            </ProgressRing>
          </div>
          <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-subtle">
            <Clock size={13} /> {av ? `Oferta wygaśnie o ${hhmm(expiresAt!)}` : `Aktywuj, gdy jesteś w lokalu`}
          </p>
        </div>

        {/* Dane bonu */}
        <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-card bg-paper shadow-card">
          <Meta icon={Zap} label="Aktywowany" value={av ? hhmm(av.activatedAt) : '—'} />
          <Meta icon={CalendarCheck} label="Ważny do" value={av ? hhmm(expiresAt!) : `${offer.activationMinutes} min`} border />
          <Meta icon={Hash} label="Kod oferty" value={av ? av.code : '—'} />
        </div>

        {/* Pokaż obsłudze */}
        <div className="mt-3 rounded-card bg-paper p-4 shadow-card">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-coral/12 text-coral"><Users size={20} /></span>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-ink">Pokaż ten ekran obsłudze</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-subtle">Obsługa potwierdzi realizację oferty. Ofertę można wykorzystać tylko raz.</p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-coral/5 p-3 ring-1 ring-coral/15">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-coral" />
            <p className="text-[12px] leading-snug text-ink/70">
              <span className="font-bold text-coral">Bezpieczna i jednorazowa.</span> Po realizacji oferta zostanie automatycznie usunięta z Twojego konta.
            </p>
          </div>
        </div>

        {/* Akcja: Aktywuj → Przytrzymaj 2 s → Zrealizowany */}
        <p className="mb-2 mt-5 px-1 text-[11px] font-bold uppercase tracking-wide text-ink/45">
          {av ? 'Dla obsługi lokalu' : 'Gotowy do realizacji?'}
        </p>

        {!av ? (
          <button
            onClick={() => activateVoucher(id)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-4 text-[16px] font-extrabold text-white shadow-coral active:scale-[0.98]"
          >
            <Zap size={20} /> Aktywuj na telefonie
          </button>
        ) : redeemed ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-4 text-[16px] font-extrabold text-white">
            <Check size={22} /> Zrealizowany
          </div>
        ) : (
          <button
            onPointerDown={beginHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            style={{ touchAction: 'none' }}
            className="relative w-full select-none overflow-hidden rounded-2xl border-2 border-success bg-success/10 py-3.5 active:scale-[0.99]"
          >
            <span className="absolute inset-y-0 left-0 bg-success/25 transition-[width] duration-75" style={{ width: `${hold * 100}%` }} />
            <div className="relative flex items-center justify-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success text-white shadow"><ChevronsRight size={22} /></span>
              <div className="text-left">
                <p className="text-[15px] font-extrabold text-success">{hold > 0 ? 'Trzymaj…' : 'Przytrzymaj 2 sekundy'}</p>
                <p className="text-[12px] font-medium text-success/80">aby zrealizować ofertę</p>
              </div>
            </div>
          </button>
        )}

        {!av && (
          <p className="mt-2 text-center text-[12px] text-subtle">Aktywuj dopiero przy obsłudze — masz {offer.activationMinutes} min na realizację.</p>
        )}

        {/* Pomoc */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button onClick={() => showToast('Aktywuj ofertę przy obsłudze, pokaż ekran i przytrzymaj zielony przycisk 2 s.', 'ℹ️')} className="flex items-center gap-2.5 rounded-card bg-paper p-3.5 text-left shadow-card active:scale-[0.98]">
            <HelpCircle size={18} className="shrink-0 text-ink/40" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink">Jak to działa?</p>
              <p className="truncate text-[11.5px] text-subtle">Zobacz instrukcję</p>
            </div>
          </button>
          <button onClick={() => showToast('Zgłoszenie wyślemy do obsługi lokalu.', '⚠️')} className="flex items-center gap-2.5 rounded-card bg-paper p-3.5 text-left shadow-card active:scale-[0.98]">
            <AlertTriangle size={18} className="shrink-0 text-warning" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink">Problem z ofertą?</p>
              <p className="truncate text-[11.5px] text-subtle">Zgłoś obsłudze</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function GlassBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md active:scale-90">
      {children}
    </button>
  );
}

function Meta({ icon: Icon, label, value, border }: { icon: typeof Hash; label: string; value: string; border?: boolean }) {
  return (
    <div className={cx('px-2 py-3 text-center', border && 'border-x border-black/5')}>
      <p className="flex items-center justify-center gap-1 text-[10.5px] font-semibold text-subtle"><Icon size={12} className="text-coral" /> {label}</p>
      <p className="mt-1 truncate text-[14px] font-extrabold tabular-nums text-ink">{value}</p>
    </div>
  );
}
