import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Store, Megaphone, LogOut, Plus, Sparkles, CalendarDays, Ticket,
  BarChart3, Image as ImageIcon, MapPin, Trash2, Pencil, Eye, Users, Heart, X, UserCircle, Check, Shield,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { CATEGORY_META } from '../theme';
import { photoUrl, hashId } from '../lib/photos';
import { ORGANIZER_PANEL_FNS, fnsForRole, organizerCategoryByKey, ORGANIZER_CATEGORIES, EVENT_GROUPS, eventMainCat, DEFAULT_EVENT_CAT, SOCIALS, COUNTRIES, type TeamRole } from '../lib/business';
import { cx } from '../components/ui';
import { inputCls, timeInputCls, PhotoPicker, Field, SectionTitle, DayPicker, EmptyHint, StatTile, WeekChart, DetailView, CategorySelect, EventSeoSection, EventPreviewScreen, TeamView, AddressBlock, LocationMap, ConfirmDialog, emptyAddr, joinAddr, eventAddr, addrToEvent, loadTeam, readFileAsDataURL, type TeamMember, type AddrFields } from './OwnerLokalPanel';
import { OrganizerScreenContent } from './OrganizerScreen';
import { BusinessAdvisor } from './BusinessAdvisor';
import { statAttend, statInterest } from '../lib/stats';
import { todayISODate } from '../lib/format';
import { geocodeAddr } from '../lib/geocode';
import type { AdvisorCtx, AdvisorAction } from '../lib/advisor';
import type { EventItem, Organizer, CategoryKey, LatLng } from '../types';

type OView = 'hub' | 'advisor' | 'profile' | 'events' | 'tickets' | 'stats' | 'gallery' | 'team';
const O_FN_ICON: Record<string, typeof Store> = { advisor: Sparkles, profile: UserCircle, events: CalendarDays, tickets: Ticket, stats: BarChart3, gallery: ImageIcon, team: Users };
const O_TITLE: Record<OView, string> = { hub: 'Panel firmowy', advisor: 'Doradca AI', profile: 'Profil organizatora', events: 'Wydarzenia', tickets: 'Bilety', stats: 'Statystyki', gallery: 'Galeria', team: 'Zespół' };
const O_ADMIN_ONLY: OView[] = ['advisor', 'profile', 'tickets', 'stats', 'team'];
const isOwn = (id: string) => id.startsWith('own-');

export function OrganizerPanel() {
  const { back, ownerBusiness, logoutOwner, events, ownerEvents, updateOwnerEvent, ownerSetup, setOwnerSetup } = useApp();
  const [view, setView] = useState<OView>('hub');
  const [profileSetup, setProfileSetup] = useState(false); // świeża rejestracja → otwórz formularz organizatora od razu w edycji
  const [eventDraft, setEventDraft] = useState<Partial<OrgEventForm> | null>(null); // szkic z Doradcy AI
  const [detailId, setDetailId] = useState<string | null>(null);
  const formBackRef = useRef<null | (() => boolean)>(null);
  const onAdvisorAction = (a: AdvisorAction) => {
    if (a.kind === 'open') { setView(a.view as OView); return; }
    if (a.kind === 'event') { setEventDraft(a.draft); setView('events'); }
  };
  // Po rejestracji (ekran „Dane konta" → kod): od razu otwórz formularz dodawania organizacji.
  const setupDone = useRef(false);
  useEffect(() => {
    if (!ownerSetup || setupDone.current) return;
    setupDone.current = true;
    setView('profile');
    setProfileSetup(true);
    setOwnerSetup(false);
  }, [ownerSetup, setOwnerSetup]);
  const prevView = useRef<OView>(view);
  useEffect(() => { if (prevView.current === 'profile' && view !== 'profile') setProfileSetup(false); prevView.current = view; }, [view]);
  const [role, setRole] = useState<TeamRole>('admin');
  const [team, setTeam] = useState<TeamMember[]>(() => loadTeam('lokalio.team.org', ownerBusiness?.name, ownerBusiness?.email));
  useEffect(() => { try { localStorage.setItem('lokalio.team.org', JSON.stringify(team)); } catch { /* ignore */ } }, [team]);
  useEffect(() => { if (role === 'moderator' && O_ADMIN_ONLY.includes(view)) setView('hub'); }, [role, view]);
  const orgId = `org-${hashId((ownerBusiness?.name ?? '') + (ownerBusiness?.email ?? ''))}`;
  const cat = organizerCategoryByKey(ownerBusiness?.organizerCategory);
  const myEvents = useMemo(() => events.filter((e) => e.organizerId === orgId), [events, orgId]);
  const detailItem = detailId ? (events.find((e) => e.id === detailId) ?? ownerEvents.find((e) => e.id === detailId)) : null;

  const onBack = () => {
    if (formBackRef.current && formBackRef.current()) return; // podgląd profilu → edycja → zamknij
    if (detailItem) return setDetailId(null);
    if (view !== 'hub') return setView('hub');
    back();
  };
  const title = detailItem ? detailItem.title : O_TITLE[view];

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-cream pb-10">
      <div className="flex items-center gap-3 px-4 pb-2 pt-5">
        <button onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 active:scale-90"><ChevronLeft size={22} /></button>
        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 items-center gap-2 text-[19px] font-extrabold tracking-tight text-ink">
            {view === 'hub' && !detailItem ? <Store size={19} className="shrink-0 text-coral" /> : null}<span className="truncate">{title}</span>
          </h1>
          <p className="truncate text-[12px] text-subtle">{ownerBusiness?.name || 'Organizator'} · {cat?.label ?? 'Organizator'}</p>
        </div>
      </div>

      <div className="px-4">
        {detailItem ? (
          <DetailView kind="event" item={detailItem} onEndEvent={(e) => { updateOwnerEvent({ ...e, ended: true }); setDetailId(null); }} />
        ) : (
          <>
            {view === 'hub' && <OrgHub onOpen={setView} catEmoji={cat?.emoji ?? '🎭'} catLabel={cat?.label} name={ownerBusiness?.name} eventCount={myEvents.length} role={role} setRole={setRole} onLogout={logoutOwner} />}
            {view === 'advisor' && (
              <BusinessAdvisor
                ctx={{
                  kind: 'organizer', name: ownerBusiness?.name ?? 'Organizator',
                  followers: 60 + (hashId(orgId + 'f') % 540),
                  offers: [], events: ownerEvents.filter((e) => e.organizerId === orgId && !e.ended),
                } as AdvisorCtx}
                onAction={onAdvisorAction}
              />
            )}
            {view === 'profile' && <OrgProfilSection backRef={formBackRef} initialEditing={profileSetup} />}
            {view === 'events' && <OrgEvents orgId={orgId} catEmoji={cat?.emoji ?? '🎭'} onOpenDetail={setDetailId} backRef={formBackRef} initialDraft={eventDraft ?? undefined} onDraftConsumed={() => setEventDraft(null)} />}
            {view === 'tickets' && <TicketsView />}
            {view === 'stats' && <OrgStats orgId={orgId} events={ownerEvents.filter((e) => e.organizerId === orgId && !e.ended)} />}
            {view === 'gallery' && <OrgGallery seed={orgId} onCancel={() => setView('hub')} />}
            {view === 'team' && <TeamView team={team} setTeam={setTeam} role={role} setRole={setRole} />}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
function OrgHub({ onOpen, catEmoji, catLabel, name, eventCount, role, setRole, onLogout }: { onOpen: (v: OView) => void; catEmoji: string; catLabel?: string; name?: string; eventCount: number; role: TeamRole; setRole: (r: TeamRole) => void; onLogout: () => void }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  return (
    <>
      {role === 'moderator' && (
        <div className="mt-2 flex items-center gap-2 rounded-card bg-info/10 px-3.5 py-2.5 text-info">
          <Shield size={15} className="shrink-0" />
          <p className="flex-1 text-[12px] font-semibold">Oglądasz panel jako Moderator (ograniczony dostęp).</p>
          <button onClick={() => setRole('admin')} className="shrink-0 rounded-full bg-info/15 px-2.5 py-1 text-[11.5px] font-bold">Jako Administrator</button>
        </div>
      )}
      <div className="mt-2 flex items-center gap-3 rounded-card bg-gradient-to-br from-coral/12 to-coral/[0.03] p-4 ring-1 ring-coral/15">
        <span className="text-3xl">{catEmoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold text-ink">{name || 'Organizator'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-ink/70 shadow-sm"><Megaphone size={11} /> Organizator</span>
            {catLabel && <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-ink/70 shadow-sm">{catLabel}</span>}
            <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-ink/70 shadow-sm">{eventCount} {eventCount === 1 ? 'wydarzenie' : 'wydarzeń'}</span>
          </div>
        </div>
      </div>

      <h2 className="mb-2 mt-5 text-[13px] font-bold uppercase tracking-wide text-ink/45">Zarządzaj</h2>
      <div className="space-y-2">
        {fnsForRole(ORGANIZER_PANEL_FNS, role).map((f) => {
          const Icon = O_FN_ICON[f.key] ?? CalendarDays;
          return (
            <button key={f.key} onClick={() => onOpen(f.key as OView)} className="flex w-full items-center gap-3 rounded-card bg-paper p-3.5 text-left shadow-card active:scale-[0.99]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral"><Icon size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14.5px] font-bold text-ink">
                  {f.label}
                  {f.soon && <span className="rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-ink/50">Wkrótce</span>}
                </p>
                <p className="text-[12px] text-subtle">{f.sub}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-ink/25" />
            </button>
          );
        })}
      </div>

      {!confirmLogout ? (
        <button onClick={() => setConfirmLogout(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-black/5 py-3 text-[13.5px] font-bold text-ink/55 active:scale-[0.98]">
          <LogOut size={15} /> Wyloguj
        </button>
      ) : (
        <div className="mt-5 space-y-2 rounded-card bg-paper p-3.5 shadow-card">
          <p className="text-center text-[13px] font-semibold text-ink/80">Na pewno chcesz się wylogować?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmLogout(false)} className="flex-1 rounded-2xl bg-black/5 py-2.5 text-[13px] font-bold text-ink/60 active:scale-[0.98]">Anuluj</button>
            <button onClick={onLogout} className="flex-1 rounded-2xl bg-coral py-2.5 text-[13px] font-bold text-white shadow-coral active:scale-[0.98]">Wyloguj</button>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// Profil organizatora — analogicznie do lokalu, ale bez menu i z godzinami jako opcją
interface OHours { days: number[]; from: string; to: string; }
// Profil organizatora: podgląd ekranu organizatora (jak widzą go użytkownicy) + przycisk „Edytuj profil";
// edycja używa tego samego formularza, którym profil się tworzy i zmienia.
function OrgProfilSection({ backRef, initialEditing = false }: { backRef: React.MutableRefObject<null | (() => boolean)>; initialEditing?: boolean }) {
  const { ownerBusiness } = useApp();
  const [editing, setEditing] = useState(initialEditing);
  useEffect(() => {
    backRef.current = editing ? () => { setEditing(false); return true; } : null;
    return () => { backRef.current = null; };
  }, [editing, backRef]);

  if (editing) return <OrgProfilView onCancel={() => setEditing(false)} />;

  // Złóż obiekt organizatora z danych konta — tak jak prezentowany jest publicznie.
  const p = ownerBusiness?.profile ?? {};
  const cat = organizerCategoryByKey(ownerBusiness?.organizerCategory);
  const orgId = `org-${hashId((ownerBusiness?.name ?? '') + (ownerBusiness?.email ?? ''))}`;
  const catKey: CategoryKey = cat?.group === 'sport' ? 'sport' : cat?.group === 'education' ? 'social' : 'culture';
  const l1 = [p.address, p.addrLine2].filter(Boolean).join(' ');
  const l2 = [p.postal, p.city, p.region].filter(Boolean).join(' ');
  const address = [l1, l2].filter(Boolean).join(', ') || undefined;
  const org: Organizer = {
    id: orgId,
    name: ownerBusiness?.name || 'Organizator',
    kind: 'instytucja',
    emoji: cat?.emoji ?? '🎭',
    verified: false,
    followers: 0,
    bio: p.description ?? '',
    categories: [catKey],
    photo: p.photo,
    address,
    hours: p.hasHours && p.hours?.length ? p.hours : undefined,
    phone: p.phone,
    website: p.website,
  };
  return (
    <div className="mt-2 overflow-hidden rounded-card border border-black/10 shadow-card">
      <OrganizerScreenContent org={org} preview onEdit={() => setEditing(true)} />
    </div>
  );
}

function OrgProfilView({ onCancel }: { onCancel: () => void }) {
  const { ownerBusiness, updateOwnerBusiness, showToast } = useApp();
  const p = ownerBusiness?.profile ?? {};
  const seed = (ownerBusiness?.name ?? 'org') + (ownerBusiness?.email ?? '');
  const [photo, setPhoto] = useState<string | undefined>(p.photo);
  const [name, setName] = useState(ownerBusiness?.name ?? '');
  const [orgCat, setOrgCat] = useState(ownerBusiness?.organizerCategory ?? 'cultural_institution');
  const [desc, setDesc] = useState(p.description ?? '');
  const [phone, setPhone] = useState(p.phone ?? '');
  const [website, setWebsite] = useState(p.website ?? '');
  const [placeName, setPlaceName] = useState(p.addrPlaceName ?? '');
  const [line1, setLine1] = useState(p.address ?? '');
  const [line2, setLine2] = useState(p.addrLine2 ?? '');
  const [city, setCity] = useState(p.city ?? '');
  const [region, setRegion] = useState(p.region ?? '');
  const [postal, setPostal] = useState(p.postal ?? '');
  const [country, setCountry] = useState(p.country ?? 'Polska');
  const [hasHours, setHasHours] = useState(!!p.hasHours);
  const [hours, setHours] = useState<OHours[]>(p.hours?.length ? p.hours.map((h) => ({ ...h })) : [{ days: [0, 1, 2, 3, 4], from: '09:00', to: '17:00' }]);
  const [social, setSocial] = useState<Record<string, string>>(() => { const s: Record<string, string> = {}; if (p.socials) for (const [k, v] of Object.entries(p.socials)) if (v) s[k] = v; return s; });
  const setHour = (i: number, patch: Partial<OHours>) => setHours((hs) => hs.map((h, j) => (j === i ? { ...h, ...patch } : h)));

  const save = () => {
    const socials = Object.fromEntries(Object.entries(social).filter(([, v]) => v && v.trim()));
    updateOwnerBusiness({
      name: name.trim() || (ownerBusiness?.name ?? ''),
      organizerCategory: orgCat,
      profile: {
        photo, description: desc || undefined, phone: phone || undefined, website: website || undefined,
        addrPlaceName: placeName || undefined, address: line1 || undefined, addrLine2: line2 || undefined,
        city: city || undefined, region: region || undefined, postal: postal || undefined, country,
        hasHours, hours: hasHours && hours.length ? hours : undefined,
        socials: Object.keys(socials).length ? socials : undefined,
        gallery: p.gallery,
      },
    });
    showToast('Zapisano profil organizatora', '✅');
  };

  return (
    <div className="mt-2 space-y-3">
      <div className="relative h-32 overflow-hidden rounded-card shadow-card">
        <img src={photo || photoUrl('culture', seed + 'profil', 800, 320)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <PhotoPicker value={photo} onChange={setPhoto} category="culture" seed={seed + 'profil'} label="Zdjęcie główne" />
      <Field label="Nazwa organizacji"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
      <Field label="Kategoria organizatora">
        <select value={orgCat} onChange={(e) => setOrgCat(e.target.value as typeof orgCat)} className={inputCls}>
          {ORGANIZER_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
        </select>
      </Field>
      <Field label="Opis"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Czym się zajmujecie…" className={inputCls} /></Field>
      <Field label="Telefon"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48…" className={inputCls} /></Field>

      <SectionTitle>Adres</SectionTitle>
      <Field label="Nazwa biura lub miejsca"><input value={placeName} onChange={(e) => setPlaceName(e.target.value)} placeholder="opcjonalnie" className={inputCls} /></Field>
      <div className="flex gap-3">
        <Field label="Linia adresu 1" className="flex-1"><input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="ul. Marszałkowska 1" className={inputCls} /></Field>
        <Field label="Linia adresu 2" className="flex-1"><input value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="lok. 10" className={inputCls} /></Field>
      </div>
      <div className="flex gap-3">
        <Field label="Miasto" className="flex-1"><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sandomierz" className={inputCls} /></Field>
        <Field label="Województwo / region" className="flex-1"><input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="świętokrzyskie" className={inputCls} /></Field>
      </div>
      <div className="flex gap-3">
        <Field label="Kod pocztowy" className="flex-1"><input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="27-600" className={inputCls} /></Field>
        <Field label="Kraj" className="flex-1">
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      {/* Godziny otwarcia — opcjonalne */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-ink/45">Godziny otwarcia</p>
          <p className="text-[11.5px] text-subtle">Opcjonalnie — jeśli masz stałą siedzibę.</p>
        </div>
        <button onClick={() => setHasHours((h) => !h)} className={cx('relative h-6 w-11 shrink-0 rounded-full transition', hasHours ? 'bg-coral' : 'bg-black/15')}>
          <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', hasHours ? 'left-[22px]' : 'left-0.5')} />
        </button>
      </div>
      {hasHours && (
        <>
          <div className="space-y-2">
            {hours.map((h, i) => (
              <div key={i} className="space-y-2 rounded-card border border-black/10 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold text-ink/60">Dni</p>
                  {hours.length > 1 && <button onClick={() => setHours((hs) => hs.filter((_, j) => j !== i))} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-ink/40 active:scale-90"><X size={14} /></button>}
                </div>
                <DayPicker value={h.days} onChange={(d) => setHour(i, { days: d })} />
                <div className="flex items-center gap-2">
                  <input type="time" value={h.from} onChange={(e) => setHour(i, { from: e.target.value })} className={timeInputCls} />
                  <span className="font-bold text-ink/40">–</span>
                  <input type="time" value={h.to} onChange={(e) => setHour(i, { to: e.target.value })} className={timeInputCls} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setHours((hs) => [...hs, { days: [], from: '09:00', to: '18:00' }])} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-black/15 py-2.5 text-[13px] font-bold text-ink/55 active:scale-[0.99]">
            <Plus size={16} /> Dodaj godziny
          </button>
        </>
      )}

      <Field label="Strona www"><input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="twojaorganizacja.pl" className={inputCls} /></Field>

      <SectionTitle>Linki społeczne</SectionTitle>
      <p className="-mt-1 text-[11.5px] text-subtle">Pokażą się na publicznej stronie organizatora.</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {SOCIALS.map((s) => (
          <Field key={s.key} label={s.label}>
            <input value={social[s.key] ?? ''} onChange={(e) => setSocial((v) => ({ ...v, [s.key]: e.target.value }))} placeholder={s.placeholder} className={inputCls} />
          </Field>
        ))}
      </div>

      <button onClick={save} className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3.5 text-[15px] font-bold text-white shadow-coral active:scale-[0.98]">
        <Check size={18} /> Zapisz zmiany
      </button>
      <button onClick={onCancel} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black/5 py-3 text-[14px] font-bold text-ink/60 active:scale-[0.98]">
        Anuluj
      </button>
    </div>
  );
}

// ============================================================
// Wydarzenia organizatora — z lokalizacją per-wydarzenie
interface OrgEventForm {
  photo?: string; title: string; eventCat: string; addr: AddrFields; coords?: LatLng; startDate: string; startTime: string; endDate: string; endTime: string; free: boolean; price: string; desc: string; eventUrl: string; ticketUrl: string;
  seoTitle: string; seoDescription: string; seoKeywords: string; seoIndex: boolean;
}
function emptyOrgEvent(): OrgEventForm {
  return {
    photo: undefined, title: '', eventCat: DEFAULT_EVENT_CAT, addr: emptyAddr(), startDate: todayISODate(), startTime: '18:00', endDate: todayISODate(), endTime: '21:00', free: true, price: '30 zł', desc: '', eventUrl: '', ticketUrl: '',
    seoTitle: '', seoDescription: '', seoKeywords: '', seoIndex: true,
  };
}
function formFromOrgEvent(e: EventItem): OrgEventForm {
  const sd = e.dateIso.slice(0, 10);
  return {
    photo: e.photo, title: e.title, eventCat: e.eventCategory ?? DEFAULT_EVENT_CAT, addr: eventAddr(e), coords: e.coords,
    startDate: sd, startTime: e.dateIso.slice(11, 16) || '18:00',
    endDate: e.endIso ? e.endIso.slice(0, 10) : sd, endTime: e.endIso ? e.endIso.slice(11, 16) : '21:00',
    free: e.free, price: e.priceLabel, desc: e.description, eventUrl: e.eventUrl ?? '', ticketUrl: e.ticketUrl ?? '',
    seoTitle: e.seoTitle ?? '', seoDescription: e.seoDescription ?? '', seoKeywords: e.seoKeywords ?? '', seoIndex: e.seoIndex !== false,
  };
}

function OrgEvents({ orgId, catEmoji, onOpenDetail, backRef, initialDraft, onDraftConsumed }: { orgId: string; catEmoji: string; onOpenDetail: (id: string) => void; backRef?: React.MutableRefObject<null | (() => boolean)>; initialDraft?: Partial<OrgEventForm>; onDraftConsumed?: () => void }) {
  const { ownerEvents, currentCity, addOwnerEvent, updateOwnerEvent, removeOwnerEvent, showToast } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<OrgEventForm>(() => emptyOrgEvent());
  const set = <K extends keyof OrgEventForm>(k: K, v: OrgEventForm[K]) => setF((s) => ({ ...s, [k]: v }));

  // Szkic z Doradcy AI → otwórz formularz wydarzenia wstępnie wypełniony (jednorazowo).
  const draftDone = useRef(false);
  useEffect(() => {
    if (!initialDraft || draftDone.current) return;
    draftDone.current = true;
    setEditingId(null);
    setF({ ...emptyOrgEvent(), ...initialDraft });
    setPreview(false);
    setOpen(true);
    onDraftConsumed?.();
  }, [initialDraft, onDraftConsumed]);

  const list = useMemo(() => ownerEvents.filter((e) => e.organizerId === orgId), [ownerEvents, orgId]);
  const activeList = useMemo(() => list.filter((e) => !e.ended), [list]);
  const endedList = useMemo(() => list.filter((e) => e.ended), [list]);
  const startAdd = () => { setEditingId(null); setF(emptyOrgEvent()); setPreview(false); setOpen(true); };
  const startEdit = (e: EventItem) => { setEditingId(e.id); setF(formFromOrgEvent(e)); setPreview(false); setOpen(true); };
  const close = () => { setOpen(false); setEditingId(null); setPreview(false); };

  // Przejmij „wstecz": podgląd → edycja → zamknij formularz.
  useEffect(() => {
    if (!backRef) return;
    backRef.current = () => {
      if (preview) { setPreview(false); return true; }
      if (open) { close(); return true; }
      return false;
    };
    return () => { backRef.current = null; };
  }, [backRef, open, preview]);

  const buildEvent = (coordsOverride?: LatLng): EventItem => {
    const cat = eventMainCat(f.eventCat);
    const meta = CATEGORY_META[cat];
    return {
      id: editingId ?? `own-e-${Date.now()}`,
      title: f.title || f.eventCat || 'Nowe wydarzenie',
      category: cat,
      eventCategory: f.eventCat,
      organizerId: orgId,
      place: joinAddr(f.addr) || 'Miejsce wydarzenia',
      ...addrToEvent(f.addr),
      coords: coordsOverride ?? currentCity.center,
      dateIso: `${f.startDate}T${f.startTime || '18:00'}`,
      endIso: f.endTime ? `${f.endDate || f.startDate}T${f.endTime}` : undefined,
      free: f.free,
      priceLabel: f.free ? 'Wstęp wolny' : f.price,
      description: f.desc || 'Wydarzenie dodane w panelu firmowym.',
      emoji: catEmoji,
      gradient: [meta.color, meta.color],
      tags: ['Nowość'],
      source: 'instytucja',
      photo: f.photo,
      eventUrl: f.eventUrl.trim() || undefined,
      ticketUrl: f.ticketUrl.trim() || undefined,
      seoTitle: f.seoTitle.trim() || undefined,
      seoDescription: f.seoDescription.trim() || undefined,
      seoKeywords: f.seoKeywords.trim() || undefined,
      seoIndex: f.seoIndex,
    };
  };

  const [confirm, setConfirm] = useState(false);
  // Anty-spam: nie publikujemy pustych wydarzeń — wymagany tytuł i data.
  const canPublish = f.title.trim().length >= 2 && !!f.startDate;
  const publish = () => { if (canPublish) setConfirm(true); };
  const doPublish = async () => {
    setConfirm(false);
    if (saving || !canPublish) return;
    setSaving(true);
    // Pinezka zatwierdzona/przeciągnięta na mapie ma pierwszeństwo; inaczej geokoduj adres.
    let coords = f.coords;
    if (!coords) {
      showToast('Ustalam lokalizację…', '📍');
      coords = (await geocodeAddr(f.addr)) ?? undefined;
    }
    const ev = buildEvent(coords);
    if (editingId) updateOwnerEvent(ev); else addOwnerEvent(ev);
    showToast(editingId ? 'Zapisano zmiany' : 'Wydarzenie opublikowane', coords ? '📍' : '🎉');
    setSaving(false);
    close();
  };

  const eventRow = (e: EventItem) => {
    const ended = e.ended === true;
    return (
      <div key={e.id} className={cx('flex items-center gap-3 rounded-card bg-paper p-3 shadow-card', ended && 'opacity-65')}>
        <button onClick={() => onOpenDetail(e.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80">
          {e.photo
            ? <img src={e.photo} alt="" className={cx('h-11 w-11 shrink-0 rounded-xl object-cover', ended && 'grayscale')} />
            : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: CATEGORY_META[e.category].color + '22' }}>{e.emoji}</span>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-bold text-ink">{e.title}</p>
            {ended ? (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-ink/10 px-1.5 py-0.5 text-[10px] font-bold text-ink/55">Zakończone</span>
            ) : (
              <p className="flex items-center gap-1 text-[11.5px] text-subtle"><MapPin size={11} className="shrink-0" /> <span className="truncate">{e.place}</span></p>
            )}
            <p className="text-[11px] text-ink/40">{e.dateIso.slice(8, 10)}.{e.dateIso.slice(5, 7)} {e.dateIso.slice(11, 16)}{e.endIso ? `–${e.endIso.slice(11, 16)}` : ''}{e.eventCategory ? ` · ${e.eventCategory}` : ''}</p>
          </div>
        </button>
        {isOwn(e.id) && (
          <div className="flex shrink-0 items-center gap-1">
            {!ended && <button onClick={() => startEdit(e)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink/50 active:scale-90"><Pencil size={14} /></button>}
            {ended && <button onClick={() => removeOwnerEvent(e.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink/40 active:scale-90"><Trash2 size={14} /></button>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-2">
      <ConfirmDialog
        open={confirm}
        title={editingId ? 'Zapisać zmiany?' : 'Opublikować wydarzenie?'}
        message={editingId ? 'Zmiany od razu zobaczą użytkownicy aplikacji.' : 'Wydarzenie pojawi się w aplikacji dla użytkowników.'}
        confirmLabel={editingId ? 'Zapisz' : 'Tak, opublikuj'}
        onConfirm={doPublish}
        onCancel={() => setConfirm(false)}
      />
      {!open && (
        <button onClick={startAdd} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3 text-[14.5px] font-bold text-white shadow-coral active:scale-[0.98]">
          <Plus size={18} /> Dodaj wydarzenie
        </button>
      )}

      {open && (
        <div className="mb-4 space-y-3 rounded-card bg-paper p-3.5 shadow-card">
          <p className="text-[14px] font-extrabold text-ink">{editingId ? 'Edytuj wydarzenie' : 'Nowe wydarzenie'}</p>
          {preview ? (
            <EventPreviewScreen ev={buildEvent()} />
          ) : (
          <>
          <PhotoPicker value={f.photo} onChange={(v) => set('photo', v)} category={eventMainCat(f.eventCat)} seed={orgId + 'event'} label="Zdjęcie" />
          <Field label="Nazwa wydarzenia"><input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="np. Noc Muzeów" className={inputCls} /></Field>
          <Field label="Kategoria"><CategorySelect value={f.eventCat} onChange={(v) => set('eventCat', v)} groups={EVENT_GROUPS} /></Field>
          <SectionTitle>Lokalizacja wydarzenia</SectionTitle>
          <p className="-mt-1 flex items-center gap-1 text-[11.5px] text-subtle"><MapPin size={11} /> Każde wydarzenie może odbywać się w innym miejscu.</p>
          <AddressBlock v={f.addr} onChange={(p) => setF((s) => ({ ...s, addr: { ...s.addr, ...p }, coords: undefined }))} />
          <LocationMap addr={f.addr} coords={f.coords} onChange={(c) => set('coords', c)} />
          <div className="flex gap-3">
            <Field label="Data rozpoczęcia" className="flex-1"><input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} /></Field>
            <Field label="Godz. rozpoczęcia" className="flex-1"><input type="time" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="flex gap-3">
            <Field label="Data zakończenia" className="flex-1"><input type="date" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} /></Field>
            <Field label="Godz. zakończenia" className="flex-1"><input type="time" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[13.5px] font-medium text-ink/80">
              <input type="checkbox" checked={f.free} onChange={(e) => set('free', e.target.checked)} className="h-4 w-4 accent-coral" /> Wstęp wolny
            </label>
            {!f.free && <input value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="np. 40 zł" className="flex-1 rounded-xl border border-black/10 bg-paper px-3 py-2 text-[14px] outline-none focus:border-coral" />}
          </div>
          <Field label="Opis"><textarea value={f.desc} onChange={(e) => set('desc', e.target.value)} rows={2} placeholder="Krótki opis…" className={inputCls} /></Field>
          <p className="pt-1 text-[12px] font-extrabold uppercase tracking-wide text-ink/45">Linki (opcjonalne)</p>
          <Field label="Link do wydarzenia"><input value={f.eventUrl} onChange={(e) => set('eventUrl', e.target.value)} placeholder="np. facebook.com/events/…" className={inputCls} /></Field>
          <Field label="Link do biletu"><input value={f.ticketUrl} onChange={(e) => set('ticketUrl', e.target.value)} placeholder="np. ebilet.pl/…" className={inputCls} /></Field>
          <EventSeoSection
            seoTitle={f.seoTitle} seoDescription={f.seoDescription} seoKeywords={f.seoKeywords} seoIndex={f.seoIndex}
            onSeo={(patch) => setF((s) => ({ ...s, ...patch }))}
          />
          </>
          )}
          {preview ? (
            <div className="flex gap-2">
              <button onClick={() => setPreview(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-black/5 py-3 text-[14px] font-bold text-ink/60 active:scale-[0.98]"><Pencil size={15} /> Wróć do edycji</button>
              <button onClick={publish} disabled={!canPublish} className={cx('flex flex-[2] items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-bold transition active:scale-[0.98]', canPublish ? 'bg-coral text-white shadow-coral' : 'bg-black/10 text-ink/40')}><Sparkles size={16} /> {editingId ? 'Zapisz' : 'Opublikuj'}</button>
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={() => setPreview(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-coral/30 bg-coral/5 py-2.5 text-[13.5px] font-bold text-coral active:scale-[0.98]"><Eye size={16} /> Podgląd przed publikacją</button>
              <div className="flex gap-2">
                <button onClick={close} className="flex-1 rounded-2xl bg-black/5 py-3 text-[14px] font-bold text-ink/60 active:scale-[0.98]">Anuluj</button>
                <button onClick={publish} disabled={!canPublish} className={cx('flex-[2] flex items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-bold transition active:scale-[0.98]', canPublish ? 'bg-coral text-white shadow-coral' : 'bg-black/10 text-ink/40')}><Sparkles size={16} /> {editingId ? 'Zapisz' : 'Opublikuj'}</button>
              </div>
              {!canPublish && <p className="text-center text-[11.5px] text-ink/45">Uzupełnij tytuł, żeby opublikować.</p>}
            </div>
          )}
        </div>
      )}

      {!open && (list.length ? (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Aktywne{activeList.length ? ` · ${activeList.length}` : ''}</p>
            {activeList.length ? (
              <div className="space-y-2">{activeList.map(eventRow)}</div>
            ) : (
              <p className="rounded-card bg-paper px-3.5 py-3 text-[12.5px] text-subtle shadow-card">Brak aktywnych wydarzeń.</p>
            )}
          </div>
          {endedList.length > 0 && (
            <div>
              <p className="mb-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Zakończone · {endedList.length}</p>
              <div className="space-y-2">{endedList.map(eventRow)}</div>
            </div>
          )}
        </div>
      ) : (
        <EmptyHint emoji="📅" text="Brak wydarzeń. Dodaj pierwsze — z własną lokalizacją — pojawi się w aplikacji." />
      ))}
    </div>
  );
}

// ============================================================
function TicketsView() {
  return (
    <div className="mt-2 space-y-3">
      <div className="rounded-card bg-gradient-to-br from-coral/12 to-coral/[0.03] p-5 text-center ring-1 ring-coral/15">
        <span className="text-4xl">🎫</span>
        <p className="mt-2 text-[16px] font-extrabold text-ink">Bilety — wkrótce</p>
        <p className="mx-auto mt-1 max-w-[280px] text-[12.5px] leading-snug text-subtle">Sprzedaż i kontrola biletów na wydarzenia pojawi się w kolejnej wersji panelu.</p>
      </div>
      <div className="space-y-2">
        {['Sprzedaż biletów online', 'Pula miejsc i cennik', 'Kontrola wejść (skan QR)'].map((t) => (
          <div key={t} className="flex items-center gap-3 rounded-card bg-paper p-3.5 shadow-card">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink/40"><Ticket size={16} /></span>
            <p className="text-[13.5px] font-semibold text-ink/70">{t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
function OrgStats({ orgId, events }: { orgId: string; events: EventItem[] }) {
  const h = hashId(orgId);
  const views = 1200 + (h % 3000);
  const followers = 200 + (h % 1600);
  const totalAttend = events.reduce((s, e) => s + statAttend(e.id), 0);
  const top = [...events].map((e) => ({ e, a: statAttend(e.id), i: statInterest(e.id) })).sort((x, y) => y.a - x.a).slice(0, 4);
  // przyrost obserwujących w tygodniu (deterministyczny)
  const byDay = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((label, d) => ({ label, value: 3 + (hashId(orgId + 'fg' + d) % 18) }));
  const maxDay = Math.max(1, ...byDay.map((d) => d.value));

  return (
    <div className="mt-2 space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile icon={Eye} tint="#FF5A4D" value={views.toLocaleString('pl-PL')} label="Wyświetlenia (30 dni)" delta="+22%" />
        <StatTile icon={Heart} tint="#7A5C99" value={`${followers}`} label="Obserwujący" delta="+9%" />
        <StatTile icon={CalendarDays} tint="#E0892B" value={`${events.length}`} label="Aktywne wydarzenia" delta={`+${events.length}`} />
        <StatTile icon={Users} tint="#3FAE83" value={totalAttend.toLocaleString('pl-PL')} label="Łącznie zainteresowanych udziałem" delta="+14%" />
      </div>

      <div className="rounded-card bg-paper p-4 shadow-card">
        <p className="mb-3 text-[14px] font-bold text-ink">Nowi obserwujący w tygodniu</p>
        <div className="flex items-end justify-between gap-1.5" style={{ height: 80 }}>
          {byDay.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-md bg-coral/60" style={{ height: `${Math.max(6, (d.value / maxDay) * 62)}px` }} />
              <span className="text-[10px] font-semibold text-ink/45">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-card bg-paper p-4 shadow-card">
        <p className="mb-2 text-[14px] font-bold text-ink">Najlepsze wydarzenia</p>
        {top.length ? (
          <div className="space-y-2.5">
            {top.map(({ e, a, i }) => (
              <div key={e.id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: CATEGORY_META[e.category].color + '22' }}>{e.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-ink">{e.title}</p>
                  <p className="text-[11px] text-subtle">{i} zainteresowanych · {a} weźmie udział</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-subtle">Dodaj wydarzenia, a tu zobaczysz, które przyciągają najwięcej osób.</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
function OrgGallery({ seed, onCancel }: { seed: string; onCancel: () => void }) {
  const { ownerBusiness, updateOwnerBusiness, showToast } = useApp();
  const MAX = 5;
  const saved = ownerBusiness?.profile?.gallery;
  const [photos, setPhotos] = useState<string[]>(() => (saved?.length ? [...saved] : [0, 1, 2].map((i) => photoUrl('culture', seed + '-g' + i, 400, 400))));
  const save = () => { updateOwnerBusiness({ profile: { ...(ownerBusiness?.profile ?? {}), gallery: photos } }); showToast('Zapisano galerię', '✅'); };
  return (
    <div className="mt-2">
      <p className="mb-3 text-[12.5px] text-subtle">Maksymalnie {MAX} zdjęć z wydarzeń. <span className="font-bold text-ink/60">{photos.length}/{MAX}</span></p>
      <div className="grid grid-cols-3 gap-2">
        {photos.length < MAX && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-coral/40 bg-coral/5 text-coral active:scale-95">
            <Plus size={22} /><span className="text-[10.5px] font-bold">Dodaj</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFileAsDataURL(f, (url) => setPhotos((p) => (p.length < MAX ? [...p, url] : p))); e.target.value = ''; }} />
          </label>
        )}
        {photos.map((src, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-muted/40">
            <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <button onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white active:scale-90"><X size={13} /></button>
            {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-coral px-1.5 py-0.5 text-[9px] font-bold text-white">Główne</span>}
          </div>
        ))}
      </div>
      <button onClick={save} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3.5 text-[15px] font-bold text-white shadow-coral active:scale-[0.98]">
        <Check size={18} /> Zapisz galerię
      </button>
      <button onClick={onCancel} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-black/5 py-3 text-[14px] font-bold text-ink/60 active:scale-[0.98]">
        Anuluj
      </button>
    </div>
  );
}
