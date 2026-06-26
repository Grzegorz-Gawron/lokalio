import { useState } from 'react';
import { MapPin, Sparkles, Ticket, ChevronRight, ChevronLeft, Minus, Plus, Mail, LogIn, UserPlus, LocateFixed, Check } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { Logo, LogoMark } from '../components/Logo';
import { CATEGORY_META, CATEGORY_ORDER } from '../theme';
import { cx, Chip } from '../components/ui';
import { SELECTABLE_CITIES, cityById, nearestCity, DEFAULT_CITY_ID } from '../data/cities';
import { emailHasAccount } from '../lib/backend';
import type { CategoryKey, Gender, LatLng } from '../types';

type Mode = 'choose' | 'guest' | 'register' | 'login';

export function Onboarding() {
  const { onboard, loginWithEmail, showToast } = useApp();
  const [mode, setMode] = useState<Mode>('choose');
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState<Gender>('inna');
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID);
  const [district, setDistrict] = useState('');
  const [cats, setCats] = useState<CategoryKey[]>([]);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<LatLng | null>(null); // realna lokalizacja z GPS (jeśli włączona)
  const [locating, setLocating] = useState(false);

  const city = cityById(cityId);
  const lastStep = 2;
  const totalSteps = lastStep + 1;

  const coordsFor = () => {
    if (gpsCoords) return gpsCoords; // GPS ma pierwszeństwo nad miastem/dzielnicą
    const d = city.districts.find((x) => x.district === district);
    return d ? d.coords : city.center;
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) { showToast('Przeglądarka nie wspiera lokalizacji', '⚠️'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const c = nearestCity(coords);
        setGpsCoords(coords);
        setCityId(c.id);
        setDistrict('');
        showToast(`Lokalizacja włączona · najbliżej: ${c.name}`, '📍');
      },
      () => { setLocating(false); showToast('Nie udało się pobrać lokalizacji', '⚠️'); },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 },
    );
  };

  const toggleCat = (c: CategoryKey) =>
    setCats((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const pickCity = (id: string) => {
    setGpsCoords(null); // ręczny wybór miasta wyłącza GPS
    setCityId(id);
    const c = cityById(id);
    setDistrict(c.districts[0]?.district ?? '');
  };

  const finishGuest = () => onboard({ name, age, gender, cityId, district, coords: coordsFor(), usesRealLocation: !!gpsCoords, preferredCategories: cats });

  const finishRegister = async () => {
    if (sending) return;
    setSending(true);
    if (email.trim()) await loginWithEmail(email);
    // utwórz konto lokalnie + wejdź; magic link potwierdza konto i synchronizuje profil
    onboard({ name, age, gender, cityId, district, coords: coordsFor(), usesRealLocation: !!gpsCoords, preferredCategories: cats });
    showToast('Konto utworzone — sprawdź e-mail, by je potwierdzić', '📧');
  };

  const sendLoginLink = async () => {
    if (!email.trim() || sending) return;
    setSending(true);
    const { error } = await loginWithEmail(email);
    setSending(false);
    if (error) showToast(`Błąd: ${error}`, '⚠️');
    else setSent(true);
  };

  const goBack = () => {
    if (mode === 'login') {
      setMode('choose');
      setSent(false);
    } else if (step > 0) {
      setStep(step - 1);
    } else {
      setMode('choose');
    }
  };

  const next = async () => {
    if (mode === 'register' && step === 0) {
      if (!email.trim()) {
        showToast('Podaj e-mail, aby założyć konto', '⚠️');
        return;
      }
      setChecking(true);
      const exists = await emailHasAccount(email);
      setChecking(false);
      if (exists) {
        setEmailExists(true);
        return;
      }
      setEmailExists(false);
      setStep(1);
      return;
    }
    if (step < lastStep) setStep(step + 1);
    else if (mode === 'register') finishRegister();
    else finishGuest();
  };

  // ---------- WYBÓR ŚCIEŻKI ----------
  if (mode === 'choose') {
    return (
      <div className="flex h-full flex-col bg-cream">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="animate-bob">
            <LogoMark size={80} rounded={23} />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">
            Witaj w <span className="lowercase">lokalio</span>
          </h1>
          <p className="mt-2 text-base font-medium text-coral">Twoje miasto żyje</p>
          <p className="mt-4 max-w-[290px] text-[15px] leading-relaxed text-subtle">
            Wydarzenia z instytucji i lokali, oferty, promocje i meldowania — wszystko w Twojej okolicy.
          </p>
          <div className="mt-7 grid w-full max-w-[300px] gap-3 text-left">
            <Feature icon={MapPin} text="Co dziś w okolicy — z filtrem odległości" />
            <Feature icon={Sparkles} text="Agent Lokalio podpowie, gdzie iść" />
            <Feature icon={Ticket} text="Oferty Lokalio i promocje lokali" />
          </div>
        </div>
        <div className="safe-bottom shrink-0 space-y-2.5 px-6 pb-6">
          <button
            onClick={() => { setMode('guest'); setStep(0); }}
            className="w-full py-2 text-center text-[14px] font-semibold text-ink/55 active:opacity-70"
          >
            Wejdź bez logowania →
          </button>
          <button
            onClick={() => { setMode('register'); setStep(0); }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-4 text-base font-bold text-white shadow-coral transition active:scale-[0.98]"
          >
            <UserPlus size={19} /> Załóż konto
          </button>
          <button
            onClick={() => { setMode('login'); setSent(false); }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-coral/30 bg-paper py-3.5 text-[15px] font-bold text-coral active:scale-[0.98]"
          >
            <LogIn size={18} /> Mam konto — zaloguj się
          </button>
          <p className="text-center text-[11.5px] text-subtle">Prototyp · dane przykładowe · Sandomierz i okolice</p>
        </div>
      </div>
    );
  }

  // ---------- LOGOWANIE ----------
  if (mode === 'login') {
    return (
      <div className="flex h-full flex-col bg-cream">
        <div className="flex items-center gap-2 px-4 pb-2 pt-5">
          <button onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 active:scale-90">
            <ChevronLeft size={22} />
          </button>
          <Logo size={26} />
        </div>
        <div className="flex flex-1 flex-col justify-center px-6">
          {sent ? (
            <div className="text-center">
              <div className="text-5xl">📧</div>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">Sprawdź skrzynkę</h2>
              <p className="mt-2 text-[14px] text-subtle">
                Wysłaliśmy link logowania na <span className="font-semibold text-ink">{email}</span>. Kliknij go, aby wejść do Lokalio.
              </p>
              <button onClick={() => setSent(false)} className="mt-4 text-[13px] font-bold text-coral">← Zmień e-mail</button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold tracking-tight text-ink">Zaloguj się</h2>
              <p className="mt-1 text-sm text-subtle">Magic link na e-mail — bez hasła.</p>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="twój@email.pl"
                className="mt-5 w-full rounded-xl border border-black/10 bg-paper px-4 py-3 text-[15px] outline-none focus:border-coral"
              />
              <button
                onClick={sendLoginLink}
                disabled={!email.trim() || sending}
                className={cx(
                  'mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold transition active:scale-[0.98]',
                  email.trim() && !sending ? 'bg-coral text-white shadow-coral' : 'bg-black/10 text-ink/40',
                )}
              >
                <Mail size={18} /> {sending ? 'Wysyłam…' : 'Wyślij link logowania'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------- ONBOARDING (gość / rejestracja) ----------
  return (
    <div className="flex h-full flex-col bg-cream">
      <div className="flex items-center gap-2 px-4 pt-4">
        <button onClick={goBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 active:scale-90">
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span key={i} className={cx('h-1.5 flex-1 rounded-full transition-all', i <= step ? 'bg-coral' : 'bg-black/10')} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 no-scrollbar">
        {step === 0 && (
          <div className="py-7">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">Powiedz coś o sobie</h2>
            <p className="mt-1 text-sm text-subtle">Wiek i płeć pomagają dopasować wydarzenia i oferty (np. dostępne od 18+).</p>

            <label className="mt-6 block text-[13px] font-bold text-ink/70">Jak masz na imię? (opcjonalnie)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Grzegorz" className="mt-2 w-full rounded-xl border border-black/10 bg-paper px-4 py-3 text-[15px] outline-none focus:border-coral" />

            <label className="mt-5 block text-[13px] font-bold text-ink/70">Twój wiek</label>
            <div className="mt-2 flex items-center gap-2">
              <button onClick={() => setAge((a) => Math.max(13, a - 1))} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/5 active:scale-90"><Minus size={18} /></button>
              <input
                value={age}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
                  setAge(Number.isNaN(n) ? 0 : Math.min(99, n));
                }}
                onBlur={() => setAge((a) => Math.max(13, Math.min(99, a || 13)))}
                inputMode="numeric"
                className="h-12 w-full min-w-0 flex-1 rounded-xl border border-black/10 bg-paper text-center text-xl font-extrabold tabular-nums text-ink outline-none focus:border-coral"
              />
              <button onClick={() => setAge((a) => Math.min(99, a + 1))} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-coral text-white active:scale-90"><Plus size={18} /></button>
            </div>

            <label className="mt-5 block text-[13px] font-bold text-ink/70">Płeć</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[{ v: 'k' as Gender, l: 'Kobieta' }, { v: 'm' as Gender, l: 'Mężczyzna' }, { v: 'inna' as Gender, l: 'Inna' }].map((o) => (
                <button key={o.v} onClick={() => setGender(o.v)} className={cx('rounded-xl border py-3 text-[14px] font-semibold transition active:scale-95', gender === o.v ? 'border-coral bg-coral text-white shadow-coral' : 'border-black/10 bg-paper text-ink/70')}>{o.l}</button>
              ))}
            </div>

            {mode === 'register' && (
              <>
                <label className="mt-5 block text-[13px] font-bold text-ink/70">E-mail (do konta)</label>
                <input
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailExists(false); }}
                  type="email"
                  placeholder="twój@email.pl"
                  className={cx('mt-2 w-full rounded-xl border bg-paper px-4 py-3 text-[15px] outline-none', emailExists ? 'border-danger' : 'border-black/10 focus:border-coral')}
                />
                {emailExists ? (
                  <div className="mt-2 rounded-xl bg-danger/10 p-3">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-danger">⚠️ Ten e-mail ma już konto</p>
                    <p className="mt-0.5 text-[12.5px] text-ink/70">Wysłaliśmy na niego link logowania — kliknij go, albo przejdź do logowania.</p>
                    <button onClick={() => { setMode('login'); setSent(true); }} className="mt-2 text-[13px] font-bold text-coral">Przejdź do logowania →</button>
                  </div>
                ) : (
                  <p className="mt-1.5 text-[12px] text-subtle">Bez hasła — wyślemy link potwierdzający. Konto daje oferty, promocje i synchronizację.</p>
                )}
              </>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="py-7">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">Gdzie jesteś?</h2>
            <p className="mt-1 text-sm text-subtle">Pokażemy wydarzenia i lokale najbliżej Ciebie.</p>

            <label className="mt-6 block text-[13px] font-bold text-ink/70">Miasto</label>
            <select value={cityId} onChange={(e) => pickCity(e.target.value)} className="mt-2 w-full rounded-xl border border-black/10 bg-paper px-4 py-3 text-[15px] outline-none focus:border-coral">
              {SELECTABLE_CITIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.region})</option>
              ))}
            </select>

            <div className="mt-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-black/10" />
              <span className="text-[12px] text-subtle">albo</span>
              <div className="h-px flex-1 bg-black/10" />
            </div>
            <button
              onClick={useMyLocation}
              disabled={locating}
              className={cx(
                'mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3 text-[14px] font-bold transition active:scale-[0.98]',
                gpsCoords ? 'border-success/40 bg-success/10 text-success' : 'border-coral/30 bg-paper text-coral',
              )}
            >
              {gpsCoords ? <Check size={18} /> : <LocateFixed size={18} className={locating ? 'animate-spin' : ''} />}
              {locating ? 'Ustalam lokalizację…' : gpsCoords ? 'Lokalizacja włączona' : 'Użyj mojej lokalizacji (GPS)'}
            </button>

            {!gpsCoords && city.districts.length > 0 && (
              <>
                <label className="mt-5 block text-[13px] font-bold text-ink/70">Dzielnica</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {city.districts.map((d) => (
                    <Chip key={d.id} active={district === d.district} onClick={() => setDistrict(d.district)} color="#FF5A4D">{d.district}</Chip>
                  ))}
                </div>
              </>
            )}

            {gpsCoords ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-3.5">
                <MapPin size={18} className="shrink-0 text-success" />
                <p className="text-[12.5px] text-ink/70">Używasz swojej lokalizacji — pokażemy, co jest najbliżej (najbliżej: {city.name}).</p>
              </div>
            ) : (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-coral/20 bg-coral/5 p-3.5">
                <MapPin size={18} className="shrink-0 text-coral" />
                <p className="text-[12.5px] text-ink/70">Lokalizację możesz później zmienić w aplikacji (także GPS).</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="py-7">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">Co lubisz robić?</h2>
            <p className="mt-1 text-sm text-subtle">Wybierz kilka — dopasujemy feed i podpowiedzi agenta.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {CATEGORY_ORDER.map((c) => {
                const m = CATEGORY_META[c];
                const on = cats.includes(c);
                return (
                  <button key={c} onClick={() => toggleCat(c)} className={cx('flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition active:scale-95', on ? 'border-transparent text-white shadow-card' : 'border-black/10 bg-paper')} style={on ? { background: m.color } : undefined}>
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-[14px] font-bold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <div className="safe-bottom shrink-0 px-6 pb-6 pt-3">
        <button
          onClick={next}
          disabled={checking || sending}
          className={cx(
            'mb-[74px] flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition active:scale-[0.98]',
            checking || sending ? 'bg-black/10 text-ink/40' : 'bg-coral text-white shadow-coral',
          )}
        >
          {checking ? 'Sprawdzam e-mail…' : step < lastStep ? 'Dalej' : mode === 'register' ? 'Załóż konto' : 'Wejdź do Lokalio'}
          {!checking && <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral">
        <Icon size={18} />
      </span>
      <span className="text-[14px] font-medium text-ink/80">{text}</span>
    </div>
  );
}
