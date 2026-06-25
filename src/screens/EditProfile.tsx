import { useState } from 'react';
import { ChevronLeft, Minus, Plus, Check } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { CATEGORY_META, CATEGORY_ORDER } from '../theme';
import { cx } from '../components/ui';
import type { CategoryKey, Gender } from '../types';

const AVATARS = ['🙂', '😎', '👩', '🧑', '🧔', '👧', '🧑‍🎤', '🦊', '🐱', '🌟', '🎧', '🍕'];

export function EditProfile() {
  const { user, editProfile, back } = useApp();
  const [name, setName] = useState(user?.name ?? '');
  const [age, setAge] = useState(user?.age ?? 25);
  const [gender, setGender] = useState<Gender>(user?.gender ?? 'inna');
  const [district, setDistrict] = useState(user?.district ?? '');
  const [cats, setCats] = useState<CategoryKey[]>(user?.preferredCategories ?? []);
  const [avatar, setAvatar] = useState<string>(user?.avatar ?? '');

  if (!user) return null;

  const toggleCat = (c: CategoryKey) =>
    setCats((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const save = () => {
    editProfile({
      name: name.trim() || 'Gość',
      age,
      gender,
      district: district.trim(),
      preferredCategories: cats,
      avatar: avatar || undefined,
    });
    back();
  };

  return (
    <div className="flex h-full flex-col bg-cream">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-2 pt-5">
        <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 active:scale-90">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-[20px] font-extrabold tracking-tight text-ink">Edytuj profil</h1>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-6">
        {/* Awatar */}
        <label className="mt-3 block text-[13px] font-bold text-ink/70">Awatar</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a === avatar ? '' : a)}
              className={cx(
                'flex h-12 w-12 items-center justify-center rounded-2xl border-2 text-2xl transition active:scale-90',
                avatar === a ? 'border-coral bg-coral/10' : 'border-black/10 bg-paper',
              )}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Imię */}
        <label className="mt-5 block text-[13px] font-bold text-ink/70">Imię</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="np. Grzegorz"
          className="mt-2 w-full rounded-xl border border-black/10 bg-paper px-4 py-3 text-[15px] text-ink outline-none focus:border-coral"
        />

        {/* Wiek */}
        <label className="mt-5 block text-[13px] font-bold text-ink/70">Wiek</label>
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

        {/* Płeć */}
        <label className="mt-5 block text-[13px] font-bold text-ink/70">Płeć</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[{ v: 'k' as Gender, l: 'Kobieta' }, { v: 'm' as Gender, l: 'Mężczyzna' }, { v: 'inna' as Gender, l: 'Inna' }].map((o) => (
            <button
              key={o.v}
              onClick={() => setGender(o.v)}
              className={cx('rounded-xl border py-3 text-[14px] font-semibold transition active:scale-95', gender === o.v ? 'border-coral bg-coral text-white shadow-coral' : 'border-black/10 bg-paper text-ink/70')}
            >
              {o.l}
            </button>
          ))}
        </div>

        {/* Dzielnica */}
        <label className="mt-5 block text-[13px] font-bold text-ink/70">Dzielnica / okolica</label>
        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="np. Stare Miasto"
          className="mt-2 w-full rounded-xl border border-black/10 bg-paper px-4 py-3 text-[15px] text-ink outline-none focus:border-coral"
        />
        <p className="mt-1.5 text-[12px] text-subtle">Dokładną lokalizację (GPS/miasto) zmienisz na ekranie głównym lub mapie.</p>

        {/* Zainteresowania */}
        <label className="mt-5 block text-[13px] font-bold text-ink/70">Zainteresowania</label>
        <p className="text-[12px] text-subtle">Wpływają na „Dla Ciebie" i podpowiedzi agenta.</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          {CATEGORY_ORDER.map((c) => {
            const m = CATEGORY_META[c];
            const on = cats.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                className={cx('flex items-center gap-2 rounded-2xl border-2 p-3 text-left transition active:scale-95', on ? 'border-transparent text-white shadow-card' : 'border-black/10 bg-paper text-ink')}
                style={on ? { background: m.color } : undefined}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-[13.5px] font-bold">{m.label}</span>
                {on && <Check size={15} className="ml-auto" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Zapisz */}
      <div className="safe-bottom shrink-0 border-t border-black/5 bg-paper/95 px-4 py-3 backdrop-blur">
        <button
          onClick={save}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3.5 text-[15px] font-bold text-white shadow-coral transition active:scale-[0.98]"
        >
          <Check size={18} /> Zapisz zmiany
        </button>
      </div>
    </div>
  );
}
