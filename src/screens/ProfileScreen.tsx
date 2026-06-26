import { useState } from 'react';
import { Heart, Ticket, MapPin, Eye, EyeOff, ChevronRight, LogOut, Store, Mail, Check, LogIn, Moon, Pencil, UserPlus, Bell, Target, Lock } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { setAccountPassword } from '../lib/backend';
import { BADGES, organizerById, venueById, offerById, eventById, offersForVenue, activeVenues } from '../data/seed';
import { CATEGORY_META } from '../theme';
import { isToday } from '../lib/format';
import { formatRadius, RADIUS_STEPS } from '../lib/geo';
import { hashId } from '../lib/photos';
import { cx, ProgressRing, PasswordFields, pwdReady } from '../components/ui';
import { LocationSheet } from '../components/LocationSheet';
import type { Badge, Organizer } from '../types';

// Szacunkowa oszczędność z wykorzystanego bonu (deterministyczna, demo).
const savingsOf = (id: string) => 8 + (hashId(id + 'zl') % 40);
const BADGE_UNIT: Record<Badge['metric'], string> = { checkins: 'lokali', vouchers: 'oferty', saves: 'wydarzeń', follows: 'miejsc', events: 'pkt' };

function timeAgo(at: number): string {
  const min = Math.round((Date.now() - at) / 60000);
  if (min < 1) return 'przed chwilą';
  if (min < 60) return `${min} min temu`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} godz. temu`;
  const d = Math.round(h / 24);
  return d === 1 ? 'wczoraj' : `${d} dni temu`;
}

export function ProfileScreen() {
  const { user, stats, currentCity, checkinHistory, redeemedOfferIds, activeVouchers, navigate, resetApp, isFollowing, toggleFollow, authEnabled, account, loginWithEmail, loginWithPassword, registerWithPassword, logout, showToast, theme, toggleTheme, unseenNotifs, radiusKm, setRadiusKm } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [locOpen, setLocOpen] = useState(false);
  const [sentMsg, setSentMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [confirm, setConfirm] = useState(''); // powtórz hasło (rejestracja)
  const [usePwd, setUsePwd] = useState(false); // hasło jako ukryta opcja przy zakładaniu konta
  const [showPwd, setShowPwd] = useState(false); // podgląd hasła logowania
  const [pwdOpen, setPwdOpen] = useState(false); // sekcja „ustaw hasło do konta" (zalogowany)
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const authMsg = (e: string) => {
    if (/invalid login credentials/i.test(e)) return 'Błędny e-mail lub hasło.';
    if (/already registered|already exists/i.test(e)) return 'Konto z tym e-mailem już istnieje — zaloguj się.';
    if (/at least 6|password should be/i.test(e)) return 'Hasło musi mieć co najmniej 6 znaków.';
    if (/email not confirmed/i.test(e)) return 'Najpierw potwierdź e-mail (link w skrzynce).';
    return e;
  };
  const sendLink = async () => {
    if (!email.trim() || sending) return;
    setSending(true);
    const { error } = await loginWithEmail(email);
    setSending(false);
    if (error) showToast(`Błąd: ${error}`, '⚠️');
    else setSentMsg(`Wysłaliśmy link logowania na ${email}. Kliknij go, aby się zalogować.`);
  };
  const submitPassword = async (mode: 'signin' | 'signup') => {
    if (!email.trim() || authBusy) return;
    if (mode === 'signin') {
      if (!password.trim()) { showToast('Podaj hasło', '⚠️'); return; }
      setAuthBusy(true);
      const { error } = await loginWithPassword(email, password);
      setAuthBusy(false);
      if (error) showToast(authMsg(error), '⚠️'); else showToast('Zalogowano', '✅');
    } else {
      if (!usePwd) { sendLink(); return; } // bez hasła → magic link
      if (!pwdReady(password, confirm)) { showToast('Hasło: min. 6 znaków i oba pola identyczne', '⚠️'); return; }
      setAuthBusy(true);
      const { error, needsConfirm, alreadyExists } = await registerWithPassword(email, password);
      setAuthBusy(false);
      if (error) showToast(authMsg(error), '⚠️');
      else if (alreadyExists) showToast('Ten e-mail ma już konto — zaloguj się.', '⚠️');
      else if (needsConfirm) setSentMsg(`Wysłaliśmy link na ${email}. Potwierdź konto, aby się zalogować.`);
      else showToast('Konto założone — zalogowano', '🎉');
    }
  };

  const saveAccountPassword = async () => {
    if (!pwdReady(newPwd, newPwd2) || pwdSaving) return;
    setPwdSaving(true);
    const { error } = await setAccountPassword(newPwd);
    setPwdSaving(false);
    if (error) showToast(authMsg(error), '⚠️');
    else { setPwdOpen(false); setNewPwd(''); setNewPwd2(''); showToast('Hasło zapisane ✓', '✅'); }
  };
  const inviteFriends = async () => {
    const url = window.location.origin;
    const text = 'Sprawdź Lokalio — odkrywaj, co dzieje się teraz w Twojej okolicy: wydarzenia, lokale, oferty i promocje. 👇';
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: 'Lokalio — Twoje miasto żyje', text, url });
      } catch {
        /* użytkownik anulował udostępnianie */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      showToast('Link skopiowany — wyślij znajomym', '🔗');
    } catch {
      showToast(url, '🔗');
    }
  };

  if (!user) return null;

  const level = Math.floor(user.points / 100) + 1;
  const intoLevel = user.points % 100;
  const genderLabel = user.gender === 'k' ? 'Kobieta' : user.gender === 'm' ? 'Mężczyzna' : 'Inna';
  const followed = user.followedOrganizerIds.map((id) => organizerById(id)).filter((o): o is Organizer => !!o);

  // Podlinijki kafli statystyk
  const weekCheckins = checkinHistory.filter((c) => Date.now() - c.at < 7 * 86400000).length;
  const savedZl = redeemedOfferIds.reduce((s, id) => s + savingsOf(id), 0);
  // „Promocje" = wszystkie oferty z ekranu „Moje oferty" (aktywne + wykorzystane + zapisane, bez duplikatów),
  // liczone tak jak tam — tylko te, które realnie istnieją (offerById), by liczba zgadzała się z zakładkami.
  const myOffersCount = [...new Set([...activeVouchers.map((a) => a.offerId), ...redeemedOfferIds, ...user.savedOfferIds])].filter((id) => offerById(id)).length;
  // „Wydarzenia" i „Obserwowane" — liczymy tylko realnie istniejące pozycje (jak na ekranach docelowych);
  // followedOrganizerIds zawiera też ID lokali bez organizatora (obserwacja samego lokalu).
  const savedEventCount = user.savedEventIds.filter((id) => eventById(id)).length;
  const followCount = user.followedOrganizerIds.filter((id) => organizerById(id) || venueById(id)).length;
  const todaySaved = user.savedEventIds.filter((id) => { const e = eventById(id); return e ? isToday(e.dateIso) : false; }).length;
  const newPromos = followed.reduce((s, o) => {
    if (o.kind !== 'lokal') return s;
    const v = activeVenues().find((vv) => vv.organizerId === o.id);
    return s + (v ? offersForVenue(v.id).length : 0);
  }, 0);

  const badgeProgress = (b: Badge): number => {
    switch (b.metric) {
      case 'checkins': return stats.checkins;
      case 'vouchers': return stats.vouchersUsed;
      case 'saves': return user.savedEventIds.length;
      case 'follows': return user.followedOrganizerIds.length;
      case 'events': return user.points;
    }
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-6">
      {/* Header */}
      <div className="bg-gradient-to-b from-coral/15 to-transparent px-4 pb-2 pt-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-coral/15 text-3xl">
            {user.avatar || (user.gender === 'k' ? '👩' : user.gender === 'm' ? '🧑' : '🙂')}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[22px] font-extrabold tracking-tight text-ink">{user.name}</h1>
            <p className="truncate text-[13px] text-subtle">
              {user.age} lat · {genderLabel}{user.district ? ` · ${user.district}` : ''}
            </p>
          </div>
          <button
            onClick={() => navigate({ name: 'editProfile' })}
            aria-label="Edytuj profil"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-paper px-3 py-2 text-[12.5px] font-bold text-coral shadow-sm active:scale-95"
          >
            <Pencil size={14} /> Edytuj
          </button>
        </div>

        {/* Poziom / punkty */}
        <div className="mt-4 rounded-card bg-paper p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-ink">⭐ Poziom {level}</span>
            <span className="text-[13px] font-semibold text-coral">{user.points} pkt</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-black/8">
            <div className="h-full rounded-full bg-coral transition-all" style={{ width: `${intoLevel}%` }} />
          </div>
          <p className="mt-1.5 text-[12px] text-subtle">Jeszcze {100 - intoLevel} pkt do poziomu {level + 1}</p>
        </div>

        {/* Zainteresowania (napędzają „Dla Ciebie" i agenta) */}
        {user.preferredCategories.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {user.preferredCategories.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[11.5px] font-semibold text-ink/75 shadow-sm">
                <span>{CATEGORY_META[c].emoji}</span> {CATEGORY_META[c].label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Konto (Supabase) */}
      {authEnabled && (
        <div className="px-4 pt-3">
          {account ? (
            <div className="rounded-card bg-paper p-3.5 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success/12 text-success"><Check size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-ink">Zalogowano</p>
                  <p className="truncate text-[12.5px] text-subtle">{account.email ?? 'konto Lokalio'}</p>
                </div>
                {!confirmLogout && <button onClick={() => setConfirmLogout(true)} className="rounded-full bg-black/5 px-3 py-2 text-[12px] font-bold text-ink/60 active:scale-95">Wyloguj</button>}
              </div>
              {confirmLogout && (
                <div className="mt-3 flex items-center gap-2">
                  <p className="flex-1 text-[12.5px] font-semibold text-ink/70">Na pewno chcesz się wylogować?</p>
                  <button onClick={() => setConfirmLogout(false)} className="rounded-full bg-black/5 px-3 py-1.5 text-[12px] font-bold text-ink/60 active:scale-95">Anuluj</button>
                  <button onClick={logout} className="rounded-full bg-coral px-3 py-1.5 text-[12px] font-bold text-white shadow-coral active:scale-95">Wyloguj</button>
                </div>
              )}
              {!confirmLogout && (
                <div className="mt-3 border-t border-black/5 pt-3">
                  {pwdOpen ? (
                    <>
                      <p className="text-[12.5px] font-bold text-ink/70">Ustaw hasło do konta</p>
                      <p className="mt-0.5 text-[11.5px] text-subtle">Przyda się, jeśli zakładałeś konto linkiem — potem zalogujesz się też hasłem.</p>
                      <PasswordFields password={newPwd} setPassword={setNewPwd} confirm={newPwd2} setConfirm={setNewPwd2} />
                      <div className="mt-2.5 flex gap-2">
                        <button onClick={() => { setPwdOpen(false); setNewPwd(''); setNewPwd2(''); }} className="rounded-xl bg-black/5 px-3.5 py-2 text-[12.5px] font-bold text-ink/60 active:scale-95">Anuluj</button>
                        <button onClick={saveAccountPassword} disabled={!pwdReady(newPwd, newPwd2) || pwdSaving} className="flex-1 rounded-xl bg-coral py-2 text-[12.5px] font-bold text-white shadow-coral active:scale-95 disabled:opacity-50">{pwdSaving ? 'Zapisuję…' : 'Zapisz hasło'}</button>
                      </div>
                    </>
                  ) : (
                    <button onClick={() => setPwdOpen(true)} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-coral active:scale-95">
                      <Lock size={14} /> Ustaw / zmień hasło do konta
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : sentMsg ? (
            <div className="rounded-card bg-paper p-4 text-center shadow-card">
              <div className="text-3xl">📧</div>
              <p className="mt-1 text-[14px] font-bold text-ink">Sprawdź skrzynkę</p>
              <p className="mt-0.5 text-[12.5px] text-subtle">{sentMsg}</p>
              <button onClick={() => setSentMsg('')} className="mt-2 text-[12px] font-bold text-coral">Wróć</button>
            </div>
          ) : (
            <div className="rounded-card bg-paper p-4 shadow-card">
              <p className="flex items-center gap-2 text-[14px] font-bold text-ink"><LogIn size={16} className="text-coral" /> Załóż konto / zaloguj się</p>
              <p className="mt-0.5 text-[12.5px] text-subtle">Profil, punkty i Twoje treści zapiszą się w chmurze — z dostępem z wielu urządzeń.</p>
              <div className="mt-3 flex gap-1 rounded-xl bg-black/5 p-1">
                <button onClick={() => setAuthMode('signin')} className={cx('flex-1 rounded-lg py-1.5 text-[13px] font-bold transition', authMode === 'signin' ? 'bg-paper text-ink shadow-sm' : 'text-ink/50')}>Zaloguj się</button>
                <button onClick={() => setAuthMode('signup')} className={cx('flex-1 rounded-lg py-1.5 text-[13px] font-bold transition', authMode === 'signup' ? 'bg-paper text-ink shadow-sm' : 'text-ink/50')}>Załóż konto</button>
              </div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="twój@email.pl" className="mt-2.5 w-full rounded-xl border border-black/10 bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-coral" />
              {authMode === 'signin' ? (
                <>
                  <div className="relative mt-2">
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPwd ? 'text' : 'password'} autoComplete="current-password" placeholder="Hasło" className="w-full rounded-xl border border-black/10 bg-paper px-3.5 py-2.5 pr-10 text-[14px] outline-none focus:border-coral" />
                    <button type="button" onClick={() => setShowPwd((s) => !s)} aria-label={showPwd ? 'Ukryj hasło' : 'Pokaż hasło'} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 active:scale-90">{showPwd ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                  </div>
                  <button onClick={() => submitPassword('signin')} disabled={authBusy} className="mt-2.5 w-full rounded-xl bg-coral py-2.5 text-[13.5px] font-bold text-white shadow-coral active:scale-95 disabled:opacity-60">{authBusy ? '…' : 'Zaloguj się'}</button>
                </>
              ) : (
                <>
                  <label className="mt-2.5 flex cursor-pointer items-center gap-2.5">
                    <input type="checkbox" checked={usePwd} onChange={(e) => setUsePwd(e.target.checked)} className="h-4 w-4 accent-coral" />
                    <span className="text-[13px] font-bold text-ink/80">Ustaw własne hasło</span>
                  </label>
                  {usePwd && <PasswordFields password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} />}
                  <button onClick={() => submitPassword('signup')} disabled={authBusy} className="mt-2.5 w-full rounded-xl bg-coral py-2.5 text-[13.5px] font-bold text-white shadow-coral active:scale-95 disabled:opacity-60">{authBusy ? '…' : 'Załóż konto'}</button>
                </>
              )}
              <button onClick={sendLink} disabled={sending} className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-coral disabled:opacity-60"><Mail size={13} /> {sending ? 'Wysyłam…' : 'lub wyślij link bez hasła'}</button>
            </div>
          )}
        </div>
      )}

      {/* Statystyki — klikalne, z podlinijką kontekstu */}
      <div className="grid grid-cols-4 gap-2 px-4 pt-4">
        <Stat icon={MapPin} value={stats.checkins} label="Meldunki" sub={weekCheckins > 0 ? `+${weekCheckins} w tym tyg.` : undefined} onClick={() => navigate({ name: 'checkins' })} />
        <Stat icon={Ticket} value={myOffersCount} label="Promocje" sub={savedZl > 0 ? `Oszczędność ${savedZl} zł` : undefined} onClick={() => navigate({ name: 'savedOffers' })} />
        <Stat icon={Heart} value={savedEventCount} label="Wydarzenia" sub={todaySaved > 0 ? `${todaySaved} już dziś` : undefined} onClick={() => navigate({ name: 'savedEvents' })} />
        <Stat icon={Eye} value={followCount} label="Obserwowane" sub={newPromos > 0 ? `${newPromos} nowych promocji` : undefined} subTint="text-coral" onClick={() => navigate({ name: 'follows' })} />
      </div>

      {/* Skróty */}
      <div className="mt-5 space-y-2 px-4">
        <Row
          icon={MapPin}
          label="Zmień lokalizację"
          sub={user.usesRealLocation ? 'Twoja lokalizacja (GPS)' : `${currentCity.name}${user.district ? ` · ${user.district}` : ''}`}
          onClick={() => setLocOpen(true)}
        />
        {/* Promień wyszukiwania — trwały wybór (te same progi co chip na mapie) */}
        <div className="rounded-card bg-paper p-3.5 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/12 text-coral"><Target size={18} /></span>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-ink">Promień wyszukiwania</p>
              <p className="text-[12px] text-subtle">Jak daleko szukać wydarzeń i ofert</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {RADIUS_STEPS.map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                aria-pressed={radiusKm === r}
                className={cx('flex-1 rounded-xl py-2 text-[13px] font-bold transition active:scale-95', radiusKm === r ? 'bg-coral text-white shadow-coral' : 'bg-black/5 text-ink/70')}
              >
                {formatRadius(r)}
              </button>
            ))}
          </div>
        </div>
        <Row icon={Bell} label="Powiadomienia" sub={unseenNotifs > 0 ? `${unseenNotifs} nowych od obserwowanych` : 'Co chcesz dostawać'} badge={unseenNotifs} onClick={() => navigate({ name: 'notifications' })} />
        <Row icon={UserPlus} label="Zaproś znajomych" sub="Wyślij im link do aplikacji" onClick={inviteFriends} />
        <Row icon={Store} label="Panel firmowy" sub="Zarządzaj lokalem lub wydarzeniami" onClick={() => navigate({ name: 'owner' })} />
        <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-card bg-paper p-3.5 text-left shadow-card active:scale-[0.99]">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/12 text-coral"><Moon size={18} /></span>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-ink">Tryb ciemny</p>
            <p className="text-[12px] text-subtle">{theme === 'dark' ? 'Włączony' : 'Wyłączony'}</p>
          </div>
          <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', theme === 'dark' ? 'bg-coral' : 'bg-ink/15')}>
            <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', theme === 'dark' ? 'left-[22px]' : 'left-0.5')} />
          </span>
        </button>
      </div>

      {/* Odznaki — karuzela z pierścieniem postępu */}
      <div className="mt-6">
        <h2 className="mb-3 px-4 text-[16px] font-bold text-ink">🏆 Twoje odznaki</h2>
        <div className="flex gap-4 overflow-x-auto px-4 pb-1 no-scrollbar">
          {BADGES.map((b) => {
            const prog = badgeProgress(b);
            const done = prog >= b.goal;
            return (
              <div key={b.id} className="flex w-[78px] shrink-0 flex-col items-center text-center">
                <ProgressRing progress={Math.min(1, prog / b.goal)} size={64} stroke={5} color="#FF5A4D" track="rgba(255,90,77,0.12)">
                  <span className={cx('text-2xl', !done && 'opacity-45 grayscale')}>{b.emoji}</span>
                </ProgressRing>
                <p className="mt-1.5 text-[11px] font-bold leading-tight text-ink">{b.name}</p>
                <p className={cx('text-[9.5px] font-semibold', done ? 'text-success' : 'text-subtle')}>
                  {done ? 'Zdobyta ✓' : `${Math.min(prog, b.goal)}/${b.goal} ${BADGE_UNIT[b.metric]}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ostatnia aktywność — z meldunków (mają znacznik czasu) */}
      {checkinHistory.length > 0 && (
        <div className="mt-6 px-4">
          <h2 className="mb-3 text-[16px] font-bold text-ink">Ostatnia aktywność</h2>
          <div className="space-y-2">
            {checkinHistory.slice(0, 4).map((c, i) => {
              const v = activeVenues().find((vv) => vv.id === c.venueId);
              return (
                <div key={`${c.venueId}-${c.at}-${i}`} className="flex items-center gap-3 rounded-card bg-paper p-3 shadow-card">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/12 text-success"><MapPin size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">Zameldowałeś się w {v?.name ?? 'lokalu'}</p>
                    <p className="text-[11.5px] text-subtle">{timeAgo(c.at)}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-bold text-success">+15 pkt</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Obserwowani */}
      {followed.length > 0 && (
        <div className="mt-6 px-4">
          <h2 className="mb-3 text-[16px] font-bold text-ink">🔔 Obserwujesz</h2>
          <div className="space-y-2">
            {followed.map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-card bg-paper p-3 shadow-card">
                <span className="text-2xl">{o.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-ink">{o.name}</p>
                  <p className="text-[12px] text-subtle">{o.kind === 'instytucja' ? 'Instytucja' : 'Lokal'}</p>
                </div>
                <button onClick={() => toggleFollow(o.id)} className="rounded-full bg-black/5 px-3 py-1.5 text-[12px] font-bold text-ink/70 active:scale-95">
                  {isFollowing(o.id) ? 'Obserwujesz' : 'Obserwuj'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      <div className="mt-8 px-4">
        <button onClick={resetApp} className="flex w-full items-center justify-center gap-2 rounded-card border border-black/10 bg-paper py-3.5 text-[14px] font-bold text-ink/60 active:scale-[0.99]">
          <LogOut size={17} /> Zacznij od nowa (reset demo)
        </button>
        <p className="mt-3 text-center text-[11.5px] text-subtle">Lokalio · prototyp · dane przykładowe</p>
      </div>

      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
    </div>
  );
}

function Stat({ icon: Icon, value, label, sub, subTint, onClick }: { icon: typeof Heart; value: number; label: string; sub?: string; subTint?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col rounded-2xl bg-paper p-2.5 text-left shadow-card transition active:scale-95">
      <div className="flex items-center justify-between">
        <Icon size={15} className="text-coral" />
        <ChevronRight size={13} className="text-ink/25" />
      </div>
      <span className="mt-1.5 text-[18px] font-extrabold leading-none text-ink">{value}</span>
      <span className="mt-0.5 text-[10px] font-medium text-subtle">{label}</span>
      {sub && <span className={cx('mt-1 text-[9px] font-bold leading-tight', subTint ?? 'text-success')}>{sub}</span>}
    </button>
  );
}

function Row({ icon: Icon, label, sub, onClick, badge }: { icon: typeof Heart; label: string; sub?: string; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-card bg-paper p-3.5 text-left shadow-card active:scale-[0.99]">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/12 text-coral">
        <Icon size={18} />
      </span>
      <div className="flex-1">
        <p className="text-[14px] font-bold text-ink">{label}</p>
        {sub && <p className="text-[12px] text-subtle">{sub}</p>}
      </div>
      {badge ? <span className="mr-1 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-coral px-1.5 text-[12px] font-bold text-white">{badge > 9 ? '9+' : badge}</span> : null}
      <ChevronRight className="text-ink/30" />
    </button>
  );
}
