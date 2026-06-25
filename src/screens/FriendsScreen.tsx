import { useState } from 'react';
import { ChevronLeft, UserPlus, Check, Search, MapPin, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { FRIENDS, venueById } from '../data/seed';
import { cx, EmptyState } from '../components/ui';
import type { Friend } from '../types';

export function FriendsScreen() {
  const { user, back, addFriend, removeFriend, navigate } = useApp();
  const [q, setQ] = useState('');
  if (!user) return null;

  const mine = FRIENDS.filter((f) => user.friendIds.includes(f.id));
  const others = FRIENDS.filter((f) => !user.friendIds.includes(f.id));
  const match = (f: Friend) => f.name.toLowerCase().includes(q.trim().toLowerCase());
  const suggestions = others.filter(match);

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-cream pb-6">
      <div className="flex items-center gap-3 px-4 pb-3 pt-5">
        <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 active:scale-90">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-[20px] font-extrabold tracking-tight text-ink">Znajomi</h1>
      </div>

      {/* szukaj */}
      <div className="px-4">
        <div className="flex items-center gap-2 rounded-full bg-black/5 px-3.5 py-2.5">
          <Search size={16} className="text-ink/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj osób po imieniu…"
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink/35"
          />
          {q && (
            <button onClick={() => setQ('')} className="text-ink/40">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* moi znajomi */}
      <div className="px-4 pt-5">
        <h2 className="mb-3 text-[15px] font-bold text-ink">Twoi znajomi ({mine.length})</h2>
        {mine.length ? (
          <div className="space-y-2">
            {mine.filter(match).map((f) => {
              const venue = venueById(f.checkedInVenueId ?? undefined);
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-card bg-paper p-3 shadow-card">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full text-xl" style={{ background: f.color + '22' }}>{f.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-bold text-ink">{f.name}</p>
                    {venue ? (
                      <button onClick={() => navigate({ name: 'venue', id: venue.id })} className="inline-flex items-center gap-1 text-[12px] font-semibold text-success">
                        <MapPin size={12} /> teraz w {venue.name}
                      </button>
                    ) : (
                      <p className="text-[12px] text-subtle">{f.note}</p>
                    )}
                  </div>
                  <button onClick={() => removeFriend(f.id)} className="rounded-full bg-black/5 px-3 py-1.5 text-[12px] font-bold text-ink/60 active:scale-95">
                    Usuń
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState emoji="🫂" title="Nie masz jeszcze znajomych" subtitle="Dodaj kogoś z propozycji poniżej." />
        )}
      </div>

      {/* propozycje */}
      <div className="px-4 pt-6">
        <h2 className="mb-3 text-[15px] font-bold text-ink">Dodaj znajomych</h2>
        {suggestions.length ? (
          <div className="space-y-2">
            {suggestions.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-card bg-paper p-3 shadow-card">
                <span className="flex h-11 w-11 items-center justify-center rounded-full text-xl" style={{ background: f.color + '22' }}>{f.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-bold text-ink">{f.name}</p>
                  <p className="truncate text-[12px] text-subtle">{f.note}</p>
                </div>
                <button onClick={() => addFriend(f.id)} className="inline-flex items-center gap-1 rounded-full bg-coral px-3.5 py-2 text-[12px] font-bold text-white shadow-coral active:scale-95">
                  <UserPlus size={14} /> Dodaj
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-card bg-paper p-5 text-[13px] font-semibold text-subtle shadow-card">
            <Check size={16} className="text-success" /> Dodano wszystkich z propozycji 🎉
          </div>
        )}
      </div>
    </div>
  );
}
