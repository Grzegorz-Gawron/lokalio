import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Bell, BellOff, Check } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { cx } from '../components/ui';
import { notifAgo } from '../lib/notifications';

type Prefs = {
  followed: boolean;
  offers: boolean;
  saved: boolean;
  digest: boolean;
};

const STORAGE = 'lokalio.notif';
const DEFAULTS: Prefs = { followed: true, offers: true, saved: true, digest: false };

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

const ITEMS: { key: keyof Prefs; label: string; sub: string; emoji: string }[] = [
  { key: 'followed', label: 'Obserwowane lokale', sub: 'Gdy dodadzą nowe wydarzenie lub promocję', emoji: '🔔' },
  { key: 'offers', label: 'Promocje i oferty w pobliżu', sub: 'Okazje od lokali blisko Ciebie', emoji: '🎟️' },
  { key: 'saved', label: 'Zapisane wydarzenia', sub: 'Przypomnienie, zanim się zacznie', emoji: '💛' },
  { key: 'digest', label: 'Przegląd okolicy', sub: 'Co tydzień: co się dzieje wokół', emoji: '🗞️' },
];

export function NotificationsScreen() {
  const { back, showToast, navigate, notifications, notifSeenAt, markNotifsSeen } = useApp();
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  // wartość sprzed otwarcia — do podświetlenia „nowych"; oznaczamy jako przeczytane po wejściu
  const seenAt = useRef(notifSeenAt).current;
  useEffect(() => { markNotifsSeen(); }, [markNotifsSeen]);

  const set = (key: keyof Prefs, val: boolean) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const enableBrowser = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const res = await Notification.requestPermission();
      setPerm(res);
      showToast(res === 'granted' ? 'Powiadomienia włączone' : 'Powiadomienia nie zostały włączone', res === 'granted' ? '🔔' : '🔕');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-cream pb-6">
      <div className="flex items-center gap-3 px-4 pb-3 pt-5">
        <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 active:scale-90">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-[20px] font-extrabold tracking-tight text-ink">Powiadomienia</h1>
      </div>

      {/* Kanał: nowości od obserwowanych */}
      <div className="px-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-card bg-paper px-4 py-8 text-center shadow-card">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-coral/10 text-coral"><Bell size={22} /></span>
            <p className="text-[14px] font-bold text-ink">Tu pojawią się nowości</p>
            <p className="max-w-[16rem] text-[12.5px] text-subtle">Obserwuj lokale i organizatorów (przycisk „Obserwuj"), a damy znać o ich nowych wydarzeniach i ofertach.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const isNew = n.createdAt > seenAt;
              return (
                <button
                  key={n.id}
                  onClick={() => navigate({ name: n.kind === 'event' ? 'event' : 'offer', id: n.refId })}
                  className={cx('flex w-full items-center gap-3 rounded-card p-3.5 text-left shadow-card active:scale-[0.99]', isNew ? 'bg-coral/[0.06]' : 'bg-paper')}
                >
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: n.color + '22' }}>
                    {n.emoji}
                    {isNew && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-paper" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-coral">{n.kind === 'event' ? 'Nowe wydarzenie' : 'Nowa oferta'}{n.discount ? ` · ${n.discount}` : ''}</p>
                    <p className="truncate text-[14px] font-bold text-ink">{n.title}</p>
                    <p className="truncate text-[12px] text-subtle">{n.subtitle} · {notifAgo(n.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Zgoda przeglądarki */}
      {perm !== 'unsupported' && (
        <div className="mt-4 px-4">
          <div className="flex items-center gap-3 rounded-card bg-paper p-3.5 shadow-card">
            <span className={cx('flex h-10 w-10 items-center justify-center rounded-full', perm === 'granted' ? 'bg-success/12 text-success' : 'bg-coral/12 text-coral')}>
              {perm === 'granted' ? <Check size={18} /> : <Bell size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-ink">{perm === 'granted' ? 'Powiadomienia włączone' : 'Włącz powiadomienia'}</p>
              <p className="text-[12px] text-subtle">
                {perm === 'granted' ? 'Damy znać, gdy coś się zadzieje.' : perm === 'denied' ? 'Zablokowane — zmień w ustawieniach przeglądarki.' : 'Pozwól, by przypominać o tym, co ważne.'}
              </p>
            </div>
            {perm === 'default' && (
              <button onClick={enableBrowser} className="shrink-0 rounded-full bg-coral px-3.5 py-2 text-[12.5px] font-bold text-white shadow-coral active:scale-95">Włącz</button>
            )}
          </div>
        </div>
      )}

      {/* Preferencje */}
      <div className="mt-4 px-4">
        <p className="mb-2 px-1 text-[12px] font-bold uppercase tracking-wide text-ink/50">Powiadamiaj mnie o</p>
        <div className="space-y-2">
          {ITEMS.map((it) => (
            <button
              key={it.key}
              onClick={() => set(it.key, !prefs[it.key])}
              className="flex w-full items-center gap-3 rounded-card bg-paper p-3.5 text-left shadow-card active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/10 text-xl">{it.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-ink">{it.label}</p>
                <p className="text-[12px] text-subtle">{it.sub}</p>
              </div>
              <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', prefs[it.key] ? 'bg-coral' : 'bg-ink/15')}>
                <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', prefs[it.key] ? 'left-[22px]' : 'left-0.5')} />
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-card border border-black/8 bg-paper/60 p-3.5">
          <BellOff size={16} className="mt-0.5 shrink-0 text-ink/40" />
          <p className="text-[12px] text-subtle">
            Twoje preferencje są zapisane. Powiadomienia push uruchamiamy wkrótce — najpierw dla zalogowanych kont.
          </p>
        </div>
      </div>
    </div>
  );
}
