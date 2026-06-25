import {
  ChevronLeft, ChevronDown, Bell, HelpCircle, Gift, MoreVertical, Clock, Calendar,
  LayoutDashboard, Store, BarChart3, Star, Percent, CalendarDays, Ticket, MapPin, Users, Mail, Settings, Eye, CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { LogoMark } from '../components/Logo';
import { cx } from '../components/ui';

const NAV: { label: string; icon: typeof Store; active?: boolean }[] = [
  { label: 'Pulpit', icon: LayoutDashboard, active: true },
  { label: 'Miejsce', icon: Store },
  { label: 'Statystyki', icon: BarChart3 },
  { label: 'Opinie', icon: Star },
  { label: 'Promocje', icon: Percent },
  { label: 'Wydarzenia', icon: CalendarDays },
  { label: 'Bony', icon: Ticket },
  { label: 'Check-iny', icon: MapPin },
  { label: 'Klienci', icon: Users },
  { label: 'Wiadomości', icon: Mail },
  { label: 'Ustawienia', icon: Settings },
];

const REVIEWS = [
  { name: 'Agnieszka', emoji: '👩', color: '#FF5A4D', stars: 5, text: 'Świetna kawa i klimat!', when: 'Dzisiaj' },
  { name: 'Tomek', emoji: '🧔', color: '#2D5DAA', stars: 4, text: 'Pyszne ciasta, polecam 😋', when: 'Wczoraj' },
  { name: 'Magda', emoji: '👩‍🦱', color: '#7A5C99', stars: 5, text: 'Moje ulubione miejsce w Sandomierzu!', when: '2 dni temu' },
];

const PROMOS = [
  { badge: '-15%', color: '#3FAE83', title: 'Zestaw śniadaniowy -15%', valid: 'Ważna do 30.06.2024', used: 23 },
  { badge: '2+1', color: '#FF5A4D', title: 'Kawa 2+1 gratis', valid: 'Ważna do 20.06.2024', used: 18 },
  { badge: '-10%', color: '#7A5C99', title: 'Desery -10%', valid: 'Ważna do 15.06.2024', used: 7 },
];

const CHECKINS = [
  { emoji: '🧑', color: '#FF5A4D', time: 'Dzisiaj 15:42' },
  { emoji: '🧔', color: '#2D5DAA', time: 'Dzisiaj 14:21' },
  { emoji: '👩', color: '#7A5C99', time: 'Dzisiaj 13:05' },
  { emoji: '🧑‍🦱', color: '#3FAE83', time: 'Dzisiaj 12:11' },
  { emoji: '👩‍🦰', color: '#E0892B', time: 'Dzisiaj 11:32' },
];

export function OwnerDashboard() {
  const { back } = useApp();
  const [toast, setToast] = useState(false);
  const demo = () => { setToast(true); window.setTimeout(() => setToast(false), 1800); };

  return (
    <div className="min-h-[100dvh] bg-[#F3F4F6] text-ink">
      {/* Topbar */}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-paper">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button onClick={back} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 active:scale-90" aria-label="Wróć do aplikacji">
              <ChevronLeft size={20} />
            </button>
            <LogoMark size={28} rounded={9} />
            <span className="text-[18px] font-extrabold tracking-tight">Lokalio</span>
            <span className="mx-1 hidden h-6 w-px bg-black/10 sm:block" />
            <button onClick={demo} className="hidden items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5 text-[13.5px] font-bold sm:inline-flex">
              <span className="text-base">☕</span> Kawiarnia Mała Czarna <ChevronDown size={15} className="text-ink/40" />
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={demo} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-ink/60 active:scale-90"><Bell size={18} /></button>
            <button onClick={demo} className="hidden h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-ink/60 active:scale-90 sm:flex"><HelpCircle size={18} /></button>
            <button onClick={demo} className="flex items-center gap-2 rounded-full bg-black/[0.04] py-1 pl-1 pr-2.5 active:scale-95">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral/15 text-base">👩</span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-[13px] font-bold">Kasia</span>
                <span className="block text-[11px] text-ink/50">Właściciel</span>
              </span>
              <ChevronDown size={15} className="text-ink/40" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-5 lg:px-6">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="space-y-1">
            {NAV.map((item) => (
              <button
                key={item.label}
                onClick={item.active ? undefined : demo}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[14px] font-bold transition',
                  item.active ? 'bg-coral/10 text-coral' : 'text-ink/60 hover:bg-black/[0.04]',
                )}
              >
                <item.icon size={18} /> {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-5 rounded-2xl bg-gradient-to-br from-coral/10 to-coral/[0.03] p-4 ring-1 ring-coral/15">
            <p className="text-[13.5px] font-extrabold text-ink">Poleć Lokalio innym</p>
            <p className="mt-1 text-[12px] leading-snug text-ink/55">Zaproś inne lokale i zyskaj dodatkowe korzyści 🎁</p>
            <button onClick={demo} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-coral px-3.5 py-2 text-[12.5px] font-bold text-white shadow-coral active:scale-95">
              <Gift size={14} /> Zaproś lokal
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 space-y-5">
          {/* Podsumowanie */}
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[21px] font-extrabold tracking-tight">Podsumowanie</h1>
            <button onClick={demo} className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-2 text-[13px] font-bold shadow-sm ring-1 ring-black/5 active:scale-95">
              <Calendar size={14} className="text-ink/40" /> 24–30 maja 2024 <ChevronDown size={14} className="text-ink/40" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={Eye} tint="#FF5A4D" value="1 248" label="Wyświetlenia" delta="18%" />
            <StatCard icon={CheckCircle2} tint="#3FAE83" value="326" label="Check-iny" delta="12%" />
            <StatCard icon={Star} tint="#7A5C99" value="4.7" label="Średnia ocen" delta="0.3" />
            <StatCard icon={Ticket} tint="#E0892B" value="48" label="Wykorzystane oferty" delta="8%" />
          </div>

          {/* Aktywność + Opinie */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-[15px] font-bold">Aktywność</h2>
                <div className="flex items-center gap-3 text-[12px] font-semibold">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-coral" /> Wyświetlenia</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Check-iny</span>
                </div>
              </div>
              <ActivityChart />
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-bold">Ostatnie opinie</h2>
                <button onClick={demo} className="text-[12.5px] font-bold text-coral">Zobacz statystykę</button>
              </div>
              <div className="space-y-3.5">
                {REVIEWS.map((r) => (
                  <div key={r.name} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base" style={{ background: r.color + '22' }}>{r.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13.5px] font-bold">{r.name}</span>
                        <span className="shrink-0 text-[11px] text-ink/40">{r.when}</span>
                      </div>
                      <Stars n={r.stars} />
                      <p className="mt-0.5 text-[12.5px] leading-snug text-ink/65">{r.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Promocje + Wydarzenie */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-bold">Twoje promocje</h2>
                <button onClick={demo} className="text-[12.5px] font-bold text-coral">Dodaj promocję</button>
              </div>
              <div className="space-y-2.5">
                {PROMOS.map((p) => (
                  <div key={p.title} className="flex items-center gap-3 rounded-xl bg-black/[0.02] p-2.5">
                    <span className="flex h-11 w-12 shrink-0 items-center justify-center rounded-lg text-[14px] font-extrabold text-white" style={{ background: p.color }}>{p.badge}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold">{p.title}</p>
                      <p className="text-[12px] text-ink/50">{p.valid}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-ink/45">Wykorzystano</p>
                      <p className="text-[13px] font-extrabold">{p.used} razy</p>
                    </div>
                    <button onClick={demo} className="text-ink/30 active:scale-90"><MoreVertical size={16} /></button>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-bold">Nadchodzące wydarzenie</h2>
                <button onClick={demo} className="text-[12.5px] font-bold text-coral">Zobacz wszystkie</button>
              </div>
              <div className="relative h-32 overflow-hidden rounded-xl" style={{ background: 'linear-gradient(135deg,#8C5A1F,#5b3a14)' }}>
                <img
                  src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=560&h=260&fit=crop&auto=format&q=60"
                  alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute right-2.5 top-2.5 rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-bold text-ink">Jutro</span>
              </div>
              <p className="mt-3 text-[15px] font-bold">Wieczór autorski w Małej Czarnej</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink/60">
                <span className="inline-flex items-center gap-1"><Clock size={13} /> 18:00</span>
                <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> 31 maja 2024</span>
                <span className="font-bold text-success">Za darmo</span>
              </div>
              <button onClick={demo} className="mt-3 w-full rounded-xl bg-coral/10 py-2.5 text-[13px] font-bold text-coral active:scale-[0.99]">Edytuj wydarzenie</button>
            </Card>
          </div>

          {/* Zameldowania + Wiadomości */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-[15px] font-bold">Ostatnie zameldowania</h2>
                <button onClick={demo} className="text-[12.5px] font-bold text-coral">Zobacz wszystkie</button>
              </div>
              <p className="mb-3 text-[11.5px] text-ink/45">Pokazujemy anonimowo — bez tożsamości gości (RODO).</p>
              <div className="flex flex-wrap gap-4">
                {CHECKINS.map((c, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full text-lg ring-2 ring-white shadow-sm" style={{ background: c.color + '22' }}>{c.emoji}</span>
                    <span className="text-[10.5px] text-ink/45">{c.time}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-bold">Wiadomości</h2>
                <button onClick={demo} className="text-[12.5px] font-bold text-coral">Zobacz wszystkie</button>
              </div>
              <div className="flex gap-3 rounded-xl bg-coral/[0.05] p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral text-white"><LogoMark size={22} rounded={7} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-bold">Lokalio</span>
                    <span className="text-[11px] text-ink/40">2 dni temu</span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-ink/65">Nowa funkcja: dodawanie wydarzeń cyklicznych! 🎉</p>
                </div>
              </div>
            </Card>
          </div>

          <p className="pb-2 pt-1 text-center text-[11.5px] text-ink/40">Lokalio · panel firmowy · demo · dane przykładowe</p>
        </main>
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-6">
          <div className="animate-scale-in rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-white shadow-float">✨ To wersja demo panelu 🙂</div>
        </div>
      )}
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('rounded-2xl bg-paper p-4 shadow-sm ring-1 ring-black/5', className)}>{children}</div>;
}

function StatCard({ icon: Icon, tint, value, label, delta }: { icon: typeof Eye; tint: string; value: string; label: string; delta: string }) {
  return (
    <div className="rounded-2xl bg-paper p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: tint + '1a', color: tint }}><Icon size={20} /></span>
        <span className="text-[12px] font-bold text-success">↑ {delta}</span>
      </div>
      <p className="mt-3 text-[26px] font-extrabold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-[12.5px] text-ink/55">{label}</p>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} className={i <= n ? 'fill-warning text-warning' : 'text-black/15'} />
      ))}
    </span>
  );
}

function ActivityChart() {
  const days = ['24 maj', '25 maj', '26 maj', '27 maj', '28 maj', '29 maj', '30 maj'];
  const views = [560, 600, 540, 660, 700, 730, 805];
  const checkins = [180, 230, 210, 280, 300, 320, 365];
  const W = 600, H = 210, padX = 8, padTop = 10, padBottom = 26, max = 1000;
  const xx = (i: number) => padX + (i / (days.length - 1)) * (W - padX * 2);
  const yy = (v: number) => H - padBottom - (v / max) * (H - padTop - padBottom);
  const line = (d: number[]) => d.map((v, i) => `${i ? 'L' : 'M'}${xx(i).toFixed(1)},${yy(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 220 }}>
      {[0, 250, 500, 750, 1000].map((g) => (
        <g key={g}>
          <line x1={padX} x2={W - padX} y1={yy(g)} y2={yy(g)} stroke="rgba(15,23,41,0.06)" strokeWidth={1} />
          <text x={0} y={yy(g) - 3} fontSize={10} fill="rgba(15,23,41,0.35)">{g}</text>
        </g>
      ))}
      <path d={line(views)} fill="none" stroke="#FF5A4D" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={line(checkins)} fill="none" stroke="#3FAE83" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {views.map((v, i) => <circle key={'v' + i} cx={xx(i)} cy={yy(v)} r={2.6} fill="#FF5A4D" />)}
      {checkins.map((v, i) => <circle key={'c' + i} cx={xx(i)} cy={yy(v)} r={2.6} fill="#3FAE83" />)}
      {days.map((d, i) => (
        <text key={d} x={xx(i)} y={H - 8} fontSize={10} fill="rgba(15,23,41,0.4)" textAnchor="middle">{d}</text>
      ))}
    </svg>
  );
}
