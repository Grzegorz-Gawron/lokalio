import { useState } from 'react';
import { ChevronLeft, ChevronRight, Store, Mail, Check } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { cx } from '../components/ui';
import { AuthCard } from '../components/AuthCard';
import {
  ORGANIZER_CATEGORIES, organizerCategoryByKey,
  type AccountType, type OrganizerCategoryKey,
} from '../lib/business';
import { LokalPanel } from './OwnerLokalPanel';
import { OrganizerPanel } from './OwnerOrganizerPanel';

const inputCls = 'mt-1.5 w-full rounded-xl border border-black/10 bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-coral';

export function OwnerPanel() {
  const { ownerLoggedIn, ownerBusiness, account, authEnabled } = useApp();
  // Najpierw logowanie do konta Lokalio — dopiero potem zakładanie / panel firmowy.
  // (demo „Podgląd bez logowania" ustawia ownerLoggedIn i omija bramkę).
  if (authEnabled && !account && !ownerLoggedIn) return <BusinessGate />;
  if (!ownerLoggedIn) return <BusinessRegister />;
  if (ownerBusiness?.accountType === 'organizer') return <OrganizerPanel />;
  return <LokalPanel />;
}

// ============================================================
// Bramka logowania — to samo konto Lokalio co na profilu, przed panelem firmowym
// ============================================================
function BusinessGate() {
  const { back, loginOwner } = useApp();
  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-cream pb-10">
      <div className="px-4 pb-3 pt-5">
        <div className="flex items-center gap-3">
          <button onClick={back} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 active:scale-90"><ChevronLeft size={22} /></button>
          <h1 className="flex items-center gap-2 text-[19px] font-extrabold tracking-tight text-ink"><Store size={19} className="text-coral" /> Panel firmowy</h1>
        </div>
      </div>

      <div className="px-4">
        <h2 className="text-[20px] font-extrabold tracking-tight text-ink">Zaloguj się, aby zarządzać firmą</h2>
        <p className="mb-4 mt-1 text-[13.5px] text-subtle">Najpierw zaloguj się lub załóż konto — potem dodasz lokal lub wydarzenia.</p>

        <AuthCard />

        {/* Szybki podgląd paneli bez logowania (demo) */}
        <div className="mt-6 rounded-card border border-dashed border-black/15 p-3.5">
          <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink/45">Podgląd bez logowania</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => loginOwner({ name: 'Café Camelot', email: 'demo@lokalio.pl', accountType: 'lokal' })}
              className="flex-1 rounded-xl bg-black/5 py-2.5 text-[12.5px] font-bold text-ink/70 active:scale-95"
            >
              🏪 Panel lokalu
            </button>
            <button
              onClick={() => loginOwner({ name: 'Centrum Kultury', email: 'demo@lokalio.pl', accountType: 'organizer', organizerCategory: 'cultural_institution' })}
              className="flex-1 rounded-xl bg-black/5 py-2.5 text-[12.5px] font-bold text-ink/70 active:scale-95"
            >
              🎭 Panel organizatora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Rejestracja — wybór typu konta → (organizator: kategoria) → panel
// Konto Lokalio jest już potwierdzone na bramce logowania, więc nazwę/e-mail
// i jednorazowy kod pomijamy. Kroki 'details' i 'code' zostają w pliku (poza
// `flow`) na wypadek powrotu do dawnej koncepcji — wystarczy dodać je do `flow`.
// ============================================================
type Step = 'type' | 'category' | 'details' | 'code';

function BusinessRegister() {
  const { back, loginOwner, account } = useApp();
  const [step, setStep] = useState<Step>('type');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [orgCat, setOrgCat] = useState<OrganizerCategoryKey | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const isOrg = accountType === 'organizer';
  const flow: Step[] = isOrg ? ['type', 'category'] : ['type'];
  const idx = flow.indexOf(step);

  const goBack = () => {
    if (idx <= 0) return back();
    setStep(flow[idx - 1]);
  };

  // Tworzy konto firmowe i wchodzi do panelu (tryb setup → panel sam otworzy
  // formularz lokalu/organizacji do uzupełnienia nazwy i reszty danych).
  const createOwner = (t: AccountType, cat?: OrganizerCategoryKey) =>
    loginOwner(
      { name: '', email: account?.email ?? '', accountType: t, organizerCategory: t === 'organizer' ? cat : undefined },
      { setup: true },
    );

  const pick = (t: AccountType) => {
    setAccountType(t);
    if (t === 'lokal') createOwner('lokal'); // bez dodatkowych ekranów
    else setStep('category');
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-cream pb-10">
      {/* Nagłówek + pasek postępu */}
      <div className="px-4 pb-3 pt-5">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 active:scale-90"><ChevronLeft size={22} /></button>
          <h1 className="flex items-center gap-2 text-[19px] font-extrabold tracking-tight text-ink"><Store size={19} className="text-coral" /> Panel firmowy</h1>
        </div>
        {flow.length > 1 && (
          <div className="mt-3 flex gap-1.5">
            {flow.map((s, i) => (
              <span key={s} className={cx('h-1.5 flex-1 rounded-full transition', i <= idx ? 'bg-coral' : 'bg-black/10')} />
            ))}
          </div>
        )}
      </div>

      <div className="px-4">
        {/* ——— KROK: typ konta ——— */}
        {step === 'type' && (
          <>
            <h2 className="text-[20px] font-extrabold tracking-tight text-ink">Załóż konto firmowe</h2>
            <p className="mt-1 text-[13.5px] text-subtle">Wybierz, kim jesteś — dopasujemy panel i sposób dodawania treści.</p>

            <TypeCard
              emoji="🏪"
              title="Lokal"
              desc="Restauracja, kawiarnia, pub, klub, kręgielnia, sala zabaw, park trampolin, escape room"
              perks={['Profil lokalu', 'Promocje', 'Oferty Lokalio', 'Wydarzenia', 'Statystyki']}
              onClick={() => pick('lokal')}
            />
            <TypeCard
              emoji="🎭"
              title="Organizator"
              desc="Urząd, instytucja kultury, klub sportowy, fundacja, szkoła, dom kultury i inni"
              perks={['Wydarzenia', 'Bilety (wkrótce)', 'Statystyki', 'Galeria']}
              onClick={() => pick('organizer')}
            />
          </>
        )}

        {/* ——— KROK: kategoria organizatora ——— */}
        {step === 'category' && (
          <>
            <h2 className="text-[20px] font-extrabold tracking-tight text-ink">Kategoria organizatora</h2>
            <p className="mt-1 text-[13.5px] text-subtle">Dzięki temu trafisz do właściwych wyników i filtrów (np. „co dziś dla dzieci?").</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {ORGANIZER_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => { setOrgCat(c.key); createOwner('organizer', c.key); }}
                  className={cx(
                    'flex items-center gap-2.5 rounded-card bg-paper p-3 text-left shadow-card transition active:scale-[0.97]',
                    orgCat === c.key && 'ring-2 ring-coral',
                  )}
                >
                  <span className="text-[22px] leading-none">{c.emoji}</span>
                  <span className="text-[13px] font-bold leading-tight text-ink">{c.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ——— KROK: dane konta ——— */}
        {step === 'details' && (
          <>
            <h2 className="text-[20px] font-extrabold tracking-tight text-ink">Dane konta</h2>
            <p className="mt-1 text-[13.5px] text-subtle">Wyślemy jednorazowy kod na firmowy e-mail (bez haseł).</p>

            <div className="mb-4 mt-4 flex items-center gap-3 rounded-card bg-coral/8 p-3.5">
              <span className="text-2xl">{isOrg ? organizerCategoryByKey(orgCat ?? undefined)?.emoji ?? '🎭' : '🏪'}</span>
              <p className="text-[12.5px] font-medium text-ink/75">
                {isOrg ? `Organizator · ${organizerCategoryByKey(orgCat ?? undefined)?.label ?? ''}` : 'Lokal'}
              </p>
            </div>

            <label className="block text-[13px] font-bold text-ink/70">{isOrg ? 'Nazwa organizacji' : 'Nazwa lokalu'}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={isOrg ? 'np. Centrum Kultury' : 'np. Café Camelot'} className={inputCls} />

            <label className="mt-4 block text-[13px] font-bold text-ink/70">Firmowy e-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="kontakt@twojafirma.pl" className={inputCls} />

            <button
              disabled={!name.trim() || !email.trim()}
              onClick={() => setStep('code')}
              className={cx('mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold transition active:scale-[0.98]', name.trim() && email.trim() ? 'bg-coral text-white shadow-coral' : 'bg-black/10 text-ink/40')}
            >
              <Mail size={18} /> Wyślij kod
            </button>
          </>
        )}

        {/* ——— KROK: kod ——— */}
        {step === 'code' && (
          <>
            <h2 className="text-[20px] font-extrabold tracking-tight text-ink">Wpisz kod z e-maila</h2>
            <p className="mt-1 text-[13.5px] text-subtle">Wysłaliśmy kod na <span className="font-semibold text-ink">{email}</span>. (Demo: wpisz dowolny kod.)</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              placeholder="• • • •"
              className="mt-4 w-full rounded-xl border border-black/10 bg-paper px-3.5 py-3 text-center text-[22px] font-extrabold tracking-[0.4em] outline-none focus:border-coral"
            />
            <button
              disabled={code.trim().length < 4}
              onClick={() => loginOwner({
                name: name.trim(),
                email: email.trim(),
                accountType: accountType ?? 'lokal',
                organizerCategory: isOrg ? orgCat ?? undefined : undefined,
              }, { setup: true })}
              className={cx('mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold transition active:scale-[0.98]', code.trim().length >= 4 ? 'bg-coral text-white shadow-coral' : 'bg-black/10 text-ink/40')}
            >
              <Check size={18} /> Utwórz konto
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TypeCard({ emoji, title, desc, perks, onClick }: { emoji: string; title: string; desc: string; perks: string[]; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-3 flex w-full items-start gap-3 rounded-card bg-paper p-4 text-left shadow-card transition active:scale-[0.98]">
      <span className="text-3xl leading-none">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[16px] font-extrabold text-ink">{title}</h3>
          <ChevronRight size={16} className="text-ink/30" />
        </div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-subtle">{desc}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {perks.map((p) => (
            <span key={p} className="rounded-full bg-coral/10 px-2 py-0.5 text-[11px] font-bold text-coral">{p}</span>
          ))}
        </div>
      </div>
    </button>
  );
}

