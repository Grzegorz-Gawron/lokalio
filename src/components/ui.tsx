import { useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react';
import { Star, TrendingUp, TrendingDown, Minus, ChevronDown, Eye, EyeOff } from 'lucide-react';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

// ------------------------------------------------------------
// Pola tworzenia hasła: „Hasło" + „Powtórz hasło" z podglądem (👁) i sprawdzaniem zgodności.
export function pwdReady(password: string, confirm: string): boolean {
  return password.length >= 6 && password === confirm;
}
export function PasswordFields({ password, setPassword, confirm, setConfirm }: {
  password: string; setPassword: (v: string) => void; confirm: string; setConfirm: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const tooShort = password.length > 0 && password.length < 6;
  const mismatch = confirm.length > 0 && password !== confirm;
  const ok = pwdReady(password, confirm);
  const cls = 'w-full rounded-xl border bg-paper px-4 py-3 pr-11 text-[15px] outline-none focus:border-coral';
  const eye = (
    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ukryj hasło' : 'Pokaż hasło'} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 active:scale-90">
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
  return (
    <>
      <div className="relative mt-2">
        <input value={password} onChange={(e) => setPassword(e.target.value)} type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="Hasło (min. 6 znaków)" className={cx(cls, tooShort ? 'border-danger' : 'border-black/10')} />
        {eye}
      </div>
      <div className="relative mt-2">
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="Powtórz hasło" className={cx(cls, mismatch ? 'border-danger' : 'border-black/10')} />
        {eye}
      </div>
      {tooShort && <p className="mt-1.5 text-[12px] font-semibold text-danger">Hasło musi mieć min. 6 znaków.</p>}
      {!tooShort && mismatch && <p className="mt-1.5 text-[12px] font-semibold text-danger">Hasła się różnią.</p>}
      {ok && <p className="mt-1.5 text-[12px] font-semibold text-success">Hasła zgodne ✓</p>}
    </>
  );
}

// ------------------------------------------------------------
// Pasek filtrów w stylu „Dla Ciebie" (Home, mapa): chip główny + opcjonalny ✕ i strzałka dropdownu.
export function FilterChip({ active, chevron, open, onClick, onClear, children }: { active?: boolean; chevron?: boolean; open?: boolean; onClick: () => void; onClear?: () => void; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-full text-[13px] font-bold transition',
        active ? 'bg-ink text-cream' : open ? 'bg-paper text-ink ring-2 ring-coral/60' : 'bg-paper text-ink/80 shadow-sm ring-1 ring-ink/10',
      )}
    >
      <button onClick={onClick} className={cx('inline-flex items-center gap-1 py-1.5 pl-3.5 active:scale-95', onClear ? 'pr-1.5' : 'pr-3.5')}>
        {children}
        {chevron && <ChevronDown size={14} className={cx('transition-transform', open && 'rotate-180', active ? 'text-cream/70' : 'text-ink/45')} />}
      </button>
      {onClear && (
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          aria-label="Wyczyść filtr"
          className="mr-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-cream/25 text-[10px] leading-none text-cream active:scale-90"
        >
          ✕
        </button>
      )}
    </span>
  );
}

export function OptionChip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition active:scale-95',
        active ? 'bg-coral text-white' : 'bg-paper text-ink/80 ring-1 ring-ink/10',
      )}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------
export function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all active:scale-95',
        active
          ? 'border-transparent text-white shadow-sm'
          : 'border-black/10 bg-paper text-ink/70 hover:border-black/20',
      )}
      style={active ? { background: color ?? '#0F1729' } : undefined}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------
export function IconButton({
  onClick,
  children,
  label,
  variant = 'plain',
}: {
  onClick?: () => void;
  children: ReactNode;
  label?: string;
  variant?: 'plain' | 'solid' | 'glass';
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cx(
        'flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90',
        variant === 'plain' && 'bg-black/5 text-ink hover:bg-black/10',
        variant === 'solid' && 'bg-coral text-white shadow-coral',
        variant === 'glass' && 'bg-paper/80 text-ink backdrop-blur-md shadow-card',
      )}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------
export function Stars({ rating, reviews }: { rating: number; reviews?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink">
      <Star size={13} className="fill-warning text-warning" />
      {rating.toFixed(1)}
      {reviews != null && <span className="font-normal text-subtle">({reviews})</span>}
    </span>
  );
}

// ------------------------------------------------------------
export function Avatar({
  emoji,
  color,
  size = 40,
  ring,
}: {
  emoji: string;
  color: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      className={cx('inline-flex items-center justify-center rounded-full', ring && 'ring-2 ring-white')}
      style={{ width: size, height: size, background: color + '22', fontSize: size * 0.5 }}
    >
      {emoji}
    </span>
  );
}

// ------------------------------------------------------------
export function CategoryTag({
  label,
  color,
  soft,
  emoji,
}: {
  label: string;
  color: string;
  soft: string;
  emoji?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: soft, color }}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </span>
  );
}

// ------------------------------------------------------------
export function TrendDot({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  const map = {
    up: { c: '#3FAE83', I: TrendingUp },
    down: { c: '#D14520', I: TrendingDown },
    flat: { c: '#8B8578', I: Minus },
  } as const;
  const { c, I } = map[trend];
  return <I size={13} style={{ color: c }} />;
}

// ------------------------------------------------------------
/** Zielona pulsująca pigułka "X osób teraz". */
export function LivePill({ count, small }: { count: number; small?: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full bg-success/12 font-semibold text-success',
        small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      {count} teraz
    </span>
  );
}

// ------------------------------------------------------------
export function ProgressRing({
  progress,
  size = 220,
  stroke = 14,
  color = '#FF5A4D',
  track = 'rgba(15,23,41,0.08)',
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// ------------------------------------------------------------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex w-full rounded-full bg-black/5 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-all',
            value === o.value ? 'bg-paper text-ink shadow-sm' : 'text-ink/55',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
export function SectionTitle({
  title,
  emoji,
  action,
  onAction,
}: {
  title: string;
  emoji?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-tight text-ink">
        {emoji && <span>{emoji}</span>}
        {title}
      </h2>
      {action && (
        <button onClick={onAction} className="text-[13px] font-semibold text-coral active:opacity-70">
          {action}
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------
export function EmptyState({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-3 text-5xl">{emoji}</div>
      <p className="text-base font-bold text-ink">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-subtle">{subtitle}</p>}
    </div>
  );
}

// ------------------------------------------------------------
/** Poglądowy kod QR (deterministyczny z wartości). Nieskanowalny — wizualizacja. */
export function FauxQR({ value, size = 132, color = '#0F1729' }: { value: string; size?: number; color?: string }) {
  const N = 21;
  const cell = size / N;
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  const rnd = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const inFinder = (r: number, c: number) => {
    const box = (R: number, C: number) => r >= R && r < R + 7 && c >= C && c < C + 7;
    return box(0, 0) || box(0, N - 7) || box(N - 7, 0);
  };
  const finderOn = (r: number, c: number) => {
    const lr = r >= N - 7 ? r - (N - 7) : r;
    const lc = c >= N - 7 ? c - (N - 7) : c;
    const ring = lr === 0 || lr === 6 || lc === 0 || lc === 6;
    const core = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
    return ring || core;
  };
  const rects: { x: number; y: number }[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const on = inFinder(r, c) ? finderOn(r, c) : rnd() > 0.55;
      if (on) rects.push({ x: c * cell, y: r * cell });
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg bg-paper">
      {rects.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={cell + 0.5} height={cell + 0.5} fill={color} rx={cell * 0.18} />
      ))}
    </svg>
  );
}

// ------------------------------------------------------------
/** Bottom sheet — pozycjonowany wewnątrz ramki aplikacji. */
export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  const startY = useRef<number | null>(null);
  if (!open) return null;
  // Zamykanie gestem w dół na uchwycie/nagłówku (nad tytułem) — pointer events (dotyk + mysz).
  const onPointerDown = (e: RPointerEvent) => {
    startY.current = e.clientY;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const onPointerUp = (e: RPointerEvent) => {
    if (startY.current != null && e.clientY - startY.current > 50) onClose();
    startY.current = null;
  };
  return (
    <div data-swipe-ignore className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative max-h-[85%] animate-slide-up overflow-y-auto rounded-t-sheet bg-cream pb-6 no-scrollbar">
        <div
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          style={{ touchAction: 'none' }}
          className="sticky top-0 z-10 flex cursor-grab flex-col items-center bg-cream/95 pt-3 backdrop-blur active:cursor-grabbing"
        >
          <span className="mb-2 h-1.5 w-10 rounded-full bg-black/15" />
          {title && <h3 className="pb-3 text-base font-bold text-ink">{title}</h3>}
        </div>
        <div className="px-4">{children}</div>
      </div>
    </div>
  );
}
