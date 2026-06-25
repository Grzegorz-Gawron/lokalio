import { Navigation, MapPin, Check, LocateFixed } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { SELECTABLE_CITIES, cityById } from '../data/cities';
import { Sheet, cx } from './ui';

export function LocationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, currentCity, setCity, setLocation, useMyLocation, locating } = useApp();

  return (
    <Sheet open={open} onClose={onClose} title="Lokalizacja">
      <button
        onClick={() => {
          useMyLocation();
          onClose();
        }}
        className="flex w-full items-center gap-3 rounded-card bg-coral p-3.5 text-left text-white shadow-coral active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-paper/20">
          {locating ? <LocateFixed size={20} className="animate-spin" /> : <Navigation size={20} />}
        </span>
        <div className="flex-1">
          <p className="text-[14.5px] font-bold">Użyj mojej lokalizacji</p>
          <p className="text-[12px] text-white/85">GPS — wykryjemy najbliższe miasto i pokażemy, co masz wokół</p>
        </div>
        {user?.usesRealLocation && <Check size={20} />}
      </button>

      <p className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wide text-ink/50">Miasto</p>
      <div className="flex flex-wrap gap-2">
        {SELECTABLE_CITIES.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCity(c.id); if (cityById(c.id).districts.length === 0) onClose(); }}
            className={cx(
              'rounded-full border px-3.5 py-2 text-[13px] font-bold transition active:scale-95',
              c.id === currentCity.id && !user?.usesRealLocation
                ? 'border-transparent bg-coral text-white'
                : 'border-black/10 bg-paper text-ink/70',
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {currentCity.districts.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wide text-ink/50">
            Dzielnica w {currentCity.name}
          </p>
          <div className="space-y-2">
            {currentCity.districts.map((s) => {
              const active = !user?.usesRealLocation && user?.district === s.district;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setLocation(s.coords, s.district);
                    onClose();
                  }}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-card border p-3 text-left active:scale-[0.99]',
                    active ? 'border-coral bg-coral/5' : 'border-black/8 bg-paper',
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-coral/12 text-coral">
                    <MapPin size={17} />
                  </span>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-ink">{s.district}</p>
                    <p className="text-[12px] text-subtle">{s.label}</p>
                  </div>
                  {active && <Check size={18} className="text-coral" />}
                </button>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-4 text-center text-[11.5px] text-subtle">
        Pilotaż: Sandomierz i okolice. Lokalio docelowo działa w całej Polsce.
      </p>
    </Sheet>
  );
}
