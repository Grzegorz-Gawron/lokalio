import { useState } from 'react';
import { ChevronLeft, Heart, MapPin, Sparkles, Users, Clock, ChevronRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { organizerById, venueById, eventById, offerById, offersForVenue, venueForOrganizer } from '../data/seed';
import { CATEGORY_META } from '../theme';
import { haversineKm, formatDistance } from '../lib/geo';
import { relativeDay, formatTime, isToday } from '../lib/format';
import { photoUrl, hashId } from '../lib/photos';
import { interestOf } from '../lib/stats';
import { EmptyState, cx } from '../components/ui';
import type { Organizer } from '../types';

type ListKind = 'checkins' | 'follows' | 'savedEvents' | 'savedOffers';

const TITLES: Record<ListKind, string> = {
  checkins: 'Meldunki',
  follows: 'Obserwowane',
  savedEvents: 'Moje wydarzenia',
  savedOffers: 'Moje oferty',
};

const savingsOf = (id: string) => 8 + (hashId(id + 'zl') % 40);
const startOfDay = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

function dayLabel(at: number): string {
  const diff = Math.round((startOfDay(Date.now()) - startOfDay(at)) / 86400000);
  if (diff === 0) return 'Dzisiaj';
  if (diff === 1) return 'Wczoraj';
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
const hhmm = (at: number) => { const d = new Date(at); const p = (n: number) => n.toString().padStart(2, '0'); return `${p(d.getHours())}:${p(d.getMinutes())}`; };

export function ListScreen({ kind }: { kind: ListKind }) {
  const { user, back, navigate, checkinHistory, stats, activeVouchers, redeemedOfferIds, isSavedEvent, toggleSaveEvent, isFollowing, toggleFollow } = useApp();
  const [tab, setTab] = useState(0);
  if (!user) return null;

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-cream pb-6">
      <div className="relative flex items-center justify-center px-4 pb-3 pt-5">
        <button onClick={back} className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/5 active:scale-90"><ChevronLeft size={22} /></button>
        <h1 className="text-[18px] font-extrabold tracking-tight text-ink">{TITLES[kind]}</h1>
      </div>

      {/* ——— MELDUNKI ——— */}
      {kind === 'checkins' && (() => {
        const week = checkinHistory.filter((c) => Date.now() - c.at < 7 * 86400000).length;
        const groups: { label: string; items: typeof checkinHistory }[] = [];
        for (const c of checkinHistory) {
          const lbl = dayLabel(c.at);
          const g = groups.find((x) => x.label === lbl);
          if (g) g.items.push(c); else groups.push({ label: lbl, items: [c] });
        }
        return (
          <div className="px-4">
            <div className="grid grid-cols-2 gap-2.5">
              <SummaryCard icon={MapPin} tint="#FF5A4D" value={stats.checkins} label="Wszystkie meldunki" />
              <SummaryCard icon={Sparkles} tint="#7A5C99" value={`+${week}`} label="W tym tygodniu" />
            </div>
            {checkinHistory.length ? (
              <div className="mt-4 space-y-4">
                {groups.map((g) => (
                  <div key={g.label}>
                    <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-ink/55"><span className="h-1.5 w-1.5 rounded-full bg-coral" /> {g.label}</p>
                    <div className="space-y-2">
                      {g.items.map((c, i) => {
                        const v = venueById(c.venueId);
                        return (
                          <PhotoRow
                            key={`${c.venueId}-${c.at}-${i}`}
                            photo={v ? photoUrl(v.category, v.id, 120, 120) : ''}
                            title={v?.name ?? 'Lokal'}
                            sub={`${v?.district ?? ''} · ${hhmm(c.at)}`}
                            right={<span className="text-[12px] font-bold text-success">+15 pkt</span>}
                            onClick={v ? () => navigate({ name: 'venue', id: v.id }) : undefined}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6"><EmptyState emoji="📍" title="Brak meldunków" subtitle="Zamelduj się w lokalu z jego strony — pojawi się tutaj." /></div>
            )}
          </div>
        );
      })()}

      {/* ——— MOJE WYDARZENIA ——— */}
      {kind === 'savedEvents' && (() => {
        const all = user.savedEventIds.map((id) => eventById(id)).filter((e): e is NonNullable<typeof e> => !!e);
        const upcoming = all.filter((e) => new Date(e.dateIso).getTime() >= startOfDay(Date.now()));
        const today = all.filter((e) => isToday(e.dateIso));
        const tabs = [{ l: 'Zainteresowane', list: all }, { l: 'Nadchodzące', list: upcoming }, { l: 'Uczestniczę', list: today }];
        const list = tabs[tab].list;
        return (
          <div className="px-4">
            <Tabs tabs={tabs.map((t) => `${t.l} ${t.list.length}`)} active={tab} onChange={setTab} />
            {list.length ? (
              <div className="mt-3 space-y-2.5">
                {list.map((e) => (
                  <PhotoRow
                    key={e.id}
                    photo={photoUrl(e.category, e.id, 160, 160)}
                    title={e.title}
                    sub={`${relativeDay(e.dateIso)} · ${formatTime(e.dateIso)} · ${e.place}`}
                    foot={<span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-ink/55"><Users size={11} /> {interestOf(e.id)} osób też się wybiera</span>}
                    right={<button onClick={(ev) => { ev.stopPropagation(); toggleSaveEvent(e.id); }} className="active:scale-90"><Heart size={20} className={isSavedEvent(e.id) ? 'fill-coral text-coral' : 'text-ink/30'} /></button>}
                    onClick={() => navigate({ name: 'event', id: e.id })}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6"><EmptyState emoji="💛" title="Pusto tutaj" subtitle="Stuknij serce na wydarzeniu, by je tu dodać." /></div>
            )}
          </div>
        );
      })()}

      {/* ——— MOJE BONY ——— */}
      {kind === 'savedOffers' && (() => {
        const activeIds = activeVouchers.map((a) => a.offerId);
        const savedOnly = user.savedOfferIds.filter((id) => !activeIds.includes(id) && !redeemedOfferIds.includes(id));
        const toOffers = (ids: string[]) => ids.map((id) => offerById(id)).filter((o): o is NonNullable<typeof o> => !!o);
        const tabs = [
          { l: 'Aktywne', list: toOffers(activeIds), state: 'active' as const },
          { l: 'Wykorzystane', list: toOffers(redeemedOfferIds), state: 'used' as const },
          { l: 'Zapisane', list: toOffers(savedOnly), state: 'saved' as const },
        ];
        const { list, state } = tabs[tab];
        return (
          <div className="px-4">
            <Tabs tabs={tabs.map((t) => `${t.l} ${t.list.length}`)} active={tab} onChange={setTab} />
            {list.length ? (
              <div className="mt-3 space-y-2.5">
                {list.map((o) => {
                  const v = venueById(o.venueId);
                  return (
                    <PhotoRow
                      key={o.id}
                      photo={photoUrl(v?.category ?? 'gastro', o.id, 160, 160)}
                      badge={state === 'used' ? { text: 'Wykorzystany', tint: 'bg-ink/70' } : state === 'active' ? { text: 'Aktywny', tint: 'bg-success' } : undefined}
                      title={o.title}
                      sub={o.subtitle}
                      foot={
                        state === 'used'
                          ? <span className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-bold text-success">💰 Zaoszczędziłeś {savingsOf(o.id)} zł</span>
                          : <span className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-coral"><Clock size={11} /> {o.validLabel}</span>
                      }
                      right={<ChevronRight size={18} className="text-ink/25" />}
                      onClick={() => navigate({ name: state === 'used' ? 'offer' : 'voucher-active', id: o.id })}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="mt-6"><EmptyState emoji="🎟️" title={state === 'active' ? 'Brak aktywnych' : state === 'used' ? 'Nic jeszcze nie wykorzystano' : 'Brak zapisanych'} subtitle="Aktywuj ofertę lub promocję z jej ekranu." /></div>
            )}
          </div>
        );
      })()}

      {/* ——— OBSERWOWANE ——— */}
      {kind === 'follows' && (() => {
        // Obserwować można organizatora ALBO sam lokal (lokale bez organizatora) — pokaż oba, by zgadzało się z licznikiem na Profilu.
        const items = user.followedOrganizerIds
          .map((id) => {
            const org = organizerById(id);
            const venue = org ? (org.kind === 'lokal' ? venueForOrganizer(org.id) : undefined) : venueById(id);
            if (!org && !venue) return null;
            return { id, org, venue };
          })
          .filter((x): x is { id: string; org: ReturnType<typeof organizerById>; venue: ReturnType<typeof venueById> } => x !== null);
        return (
          <div className="px-4 pt-1">
            {items.length ? (
              <div className="space-y-2.5">
                {items.map(({ id, org, venue }) => {
                  const isInst = org?.kind === 'instytucja';
                  const name = org?.name ?? venue?.name ?? 'Lokal';
                  const cat = org?.categories[0] ?? venue?.category ?? 'culture';
                  const promos = venue ? offersForVenue(venue.id).length : 0;
                  const dist = venue ? formatDistance(haversineKm(user.coords, venue.coords)) : null;
                  return (
                    <PhotoRow
                      key={id}
                      photo={photoUrl(cat, org?.id ?? venue!.id, 160, 160)}
                      title={name}
                      sub={isInst ? 'Instytucja' : `${venue?.district ?? 'Lokal'}${dist ? ` · ${dist}` : ''}`}
                      foot={
                        !isInst
                          ? promos > 0
                            ? <span className="mt-0.5 text-[11.5px] font-semibold text-coral">{promos} {promos === 1 ? 'nowa promocja' : 'nowe promocje'}</span>
                            : <span className="mt-0.5 text-[11.5px] text-subtle">Brak nowych promocji</span>
                          : undefined
                      }
                      right={<button onClick={(ev) => { ev.stopPropagation(); toggleFollow(id); }} className="active:scale-90"><Heart size={20} className={isFollowing(id) ? 'fill-coral text-coral' : 'text-ink/30'} /></button>}
                      onClick={() => navigate(venue ? { name: 'venue', id: venue.id } : { name: 'organizer', id: org!.id })}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="mt-6"><EmptyState emoji="🔔" title="Nie obserwujesz nikogo" subtitle="Obserwuj lokale i instytucje, by nie przegapić ich wydarzeń i promocji." /></div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function Tabs({ tabs, active, onChange }: { tabs: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div className="flex gap-1.5 rounded-full bg-black/5 p-1">
      {tabs.map((t, i) => (
        <button key={t} onClick={() => onChange(i)} className={cx('flex-1 rounded-full py-1.5 text-[12.5px] font-bold transition active:scale-95', i === active ? 'bg-paper text-ink shadow-sm' : 'text-ink/55')}>{t}</button>
      ))}
    </div>
  );
}

function SummaryCard({ icon: Icon, tint, value, label }: { icon: typeof MapPin; tint: string; value: number | string; label: string }) {
  return (
    <div className="rounded-card bg-paper p-3.5 shadow-card">
      <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `${tint}1f`, color: tint }}><Icon size={17} /></span>
      <p className="mt-2 text-[22px] font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[11.5px] text-subtle">{label}</p>
    </div>
  );
}

function PhotoRow({ photo, title, sub, foot, right, badge, onClick }: {
  photo: string;
  title: string;
  sub: string;
  foot?: React.ReactNode;
  right?: React.ReactNode;
  badge?: { text: string; tint: string };
  onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={cx('flex items-center gap-3 rounded-card bg-paper p-2.5 shadow-card', onClick && 'cursor-pointer active:scale-[0.99]')}>
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-muted/40">
        <img src={photo} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="absolute inset-0 h-full w-full object-cover" />
        {badge && <span className={cx('absolute inset-x-0 bottom-0 py-0.5 text-center text-[8px] font-bold text-white', badge.tint)}>{badge.text}</span>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-ink">{title}</p>
        <p className="truncate text-[12px] text-subtle">{sub}</p>
        {foot}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
