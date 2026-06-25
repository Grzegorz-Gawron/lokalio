import { Home, Map as MapIcon, Sparkles, Ticket, User } from 'lucide-react';
import { useApp, type Tab } from '../store/AppContext';
import { cx } from './ui';

const ITEMS: { key: Tab; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Na dziś', icon: Home },
  { key: 'map', label: 'Mapa', icon: MapIcon },
  { key: 'vouchers', label: 'Promocje', icon: Ticket },
  { key: 'profile', label: 'Profil', icon: User },
];

export function BottomNav() {
  const { tab, route, setTab, activeVouchers } = useApp();
  const current = route ? '' : tab; // gdy otwarty detal — żaden tab nie jest aktywny

  return (
    <nav className="relative z-30 shrink-0 border-t border-black/5 bg-paper/95 backdrop-blur-lg">
      <div className="safe-bottom flex items-end justify-around px-1 pt-1.5">
        {ITEMS.slice(0, 2).map((it) => (
          <NavBtn
            key={it.key}
            label={it.label}
            icon={it.icon}
            active={current === it.key}
            badge={it.key === 'vouchers' ? activeVouchers.length : 0}
            onClick={() => setTab(it.key)}
          />
        ))}

        {/* Centralny agent */}
        <button
          onClick={() => setTab('agent')}
          className="-mt-7 flex w-[20%] flex-col items-center"
        >
          <span
            className={cx(
              'flex h-14 w-14 items-center justify-center rounded-full text-white shadow-coral transition active:scale-90',
              current === 'agent' ? 'ring-4 ring-coral/25' : '',
            )}
            style={{ background: 'linear-gradient(135deg, #FF7A6E, #FF5A4D)' }}
          >
            <Sparkles size={24} className="animate-bob" />
          </span>
          <span className={cx('mt-1 text-[10px] font-bold', current === 'agent' ? 'text-coral' : 'text-ink/60')}>
            Lokalio
          </span>
        </button>

        {ITEMS.slice(2).map((it) => (
          <NavBtn
            key={it.key}
            label={it.label}
            icon={it.icon}
            active={current === it.key}
            badge={it.key === 'vouchers' ? activeVouchers.length : 0}
            onClick={() => setTab(it.key)}
          />
        ))}
      </div>
    </nav>
  );
}

function NavBtn({
  label,
  icon: Icon,
  active,
  onClick,
  badge = 0,
}: {
  label: string;
  icon: typeof Home;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button onClick={onClick} className="flex w-[20%] flex-col items-center gap-1 py-1.5">
      <span className="relative">
        <Icon size={22} className={active ? 'text-coral' : 'text-ink/50'} strokeWidth={active ? 2.4 : 2} />
        {badge > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </span>
      <span className={cx('text-[10px] font-semibold', active ? 'text-coral' : 'text-ink/50')}>{label}</span>
    </button>
  );
}
