import { useState } from 'react';
import { LogIn, Mail, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { cx, PasswordFields, pwdReady } from './ui';

// Tłumaczenie błędów Supabase na komunikaty po polsku.
export function authErrorMsg(e: string): string {
  if (/invalid login credentials/i.test(e)) return 'Błędny e-mail lub hasło.';
  if (/already registered|already exists/i.test(e)) return 'Konto z tym e-mailem już istnieje — zaloguj się.';
  if (/at least 6|password should be/i.test(e)) return 'Hasło musi mieć co najmniej 6 znaków.';
  if (/email not confirmed/i.test(e)) return 'Najpierw potwierdź e-mail (link w skrzynce).';
  return e;
}

/**
 * Wspólna karta logowania / zakładania konta (e-mail + hasło lub link bez hasła).
 * Używana na ekranie Profil oraz jako bramka przed Panelem firmowym.
 */
export function AuthCard({
  title = 'Załóż konto / zaloguj się',
  subtitle = 'Profil, punkty i Twoje treści zapiszą się w chmurze — z dostępem z wielu urządzeń.',
}: { title?: string; subtitle?: string }) {
  const { loginWithEmail, loginWithPassword, registerWithPassword, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(''); // powtórz hasło (rejestracja)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [usePwd, setUsePwd] = useState(false); // hasło jako ukryta opcja przy zakładaniu konta
  const [showPwd, setShowPwd] = useState(false); // podgląd hasła logowania
  const [sentMsg, setSentMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

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
      if (error) showToast(authErrorMsg(error), '⚠️'); else showToast('Zalogowano', '✅');
    } else {
      if (!usePwd) { sendLink(); return; } // bez hasła → magic link
      if (!pwdReady(password, confirm)) { showToast('Hasło: min. 6 znaków i oba pola identyczne', '⚠️'); return; }
      setAuthBusy(true);
      const { error, needsConfirm, alreadyExists } = await registerWithPassword(email, password);
      setAuthBusy(false);
      if (error) showToast(authErrorMsg(error), '⚠️');
      else if (alreadyExists) showToast('Ten e-mail ma już konto — zaloguj się.', '⚠️');
      else if (needsConfirm) setSentMsg(`Wysłaliśmy link na ${email}. Potwierdź konto, aby się zalogować.`);
      else showToast('Konto założone — zalogowano', '🎉');
    }
  };

  if (sentMsg) {
    return (
      <div className="rounded-card bg-paper p-4 text-center shadow-card">
        <div className="text-3xl">📧</div>
        <p className="mt-1 text-[14px] font-bold text-ink">Sprawdź skrzynkę</p>
        <p className="mt-0.5 text-[12.5px] text-subtle">{sentMsg}</p>
        <button onClick={() => setSentMsg('')} className="mt-2 text-[12px] font-bold text-coral">Wróć</button>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-paper p-4 shadow-card">
      <p className="flex items-center gap-2 text-[14px] font-bold text-ink"><LogIn size={16} className="text-coral" /> {title}</p>
      <p className="mt-0.5 text-[12.5px] text-subtle">{subtitle}</p>
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
  );
}
