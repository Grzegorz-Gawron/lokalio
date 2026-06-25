export function LogoMark({ size = 40, rounded = 12 }: { size?: number; rounded?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <rect width="100" height="100" rx={rounded} fill="#FF5A4D" />
      <g fill="#FFFFFF">
        <rect x="26" y="20" width="15" height="60" rx="3" />
        <rect x="26" y="65" width="40" height="15" rx="3" />
        <circle cx="68" cy="34" r="18" />
      </g>
      <circle cx="68" cy="34" r="7" fill="#FF5A4D" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-extrabold lowercase tracking-tight text-ink ${className}`}>lokalio</span>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} rounded={size * 0.28} />
      <Wordmark className="text-[22px]" />
    </span>
  );
}
