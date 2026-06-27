import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, ChevronRight, ChevronDown, Store, LogOut, Plus, Sparkles, Check, Percent, Ticket,
  CalendarDays, Image as ImageIcon, BarChart3, UserCircle, Eye, MapPin, Trash2, Clock,
  Pencil, X, ImagePlus, Users, Heart, ExternalLink, Search, Shield, Mail, Upload, Lock,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { CATEGORY_META } from '../theme';
import { photoUrl, hashId } from '../lib/photos';
import { todayISODate, isoDatePlus } from '../lib/format';
import { LOKAL_PANEL_FNS, fnsForRole, EVENT_GROUPS, eventMainCat, DEFAULT_EVENT_CAT, VENUE_GROUPS, venueMainCat, DEFAULT_VENUE_CAT, OFFER_GROUPS, offerMainCat, DEFAULT_OFFER_CAT, SOCIALS, COUNTRIES, type TeamRole } from '../lib/business';
import { venueById, organizerById } from '../data/seed';
import { statViews, statInterest, statUsed, statAttend } from '../lib/stats';
import { venueStats, venueProfileCheckin } from '../lib/venueStats';
import { geocodeAddr } from '../lib/geocode';
import { MiniMap } from '../components/MiniMap';
import type { AdvisorCtx, AdvisorAction } from '../lib/advisor';
import { OfferDetailContent } from './OfferDetail';
import { EventDetailContent } from './EventDetail';
import { VenueDetailContent } from './VenueDetail';
import { BusinessAdvisor } from './BusinessAdvisor';
import { cx } from '../components/ui';
import type { CategoryKey, EventItem, LatLng, Offer, OfferKind, Venue } from '../types';

function makeOwnerVenue(name: string, venueType: string, coords: LatLng, district: string): Venue {
  const category = venueMainCat(venueType);
  const meta = CATEGORY_META[category];
  const id = `own-v-${Date.now()}`;
  return {
    id, name: name.trim() || 'Nowy lokal', category, tags: [], emoji: meta.emoji, color: meta.color,
    coords, address: '', district, rating: 0, reviews: 0, priceLevel: 2, description: '', venueType,
    // Realistyczny profil (wg kategorii) zamiast zer — ekran lokalu, Statystyki i Doradca mają od razu dane.
    checkin: venueProfileCheckin(id, category),
  };
}

// ——— Rozbity adres — JEDEN wspólny blok dla lokalu i wydarzeń (ten sam wygląd i pola) ———
export interface AddrFields { placeName: string; line1: string; line2: string; city: string; region: string; postal: string; country: string }
export const emptyAddr = (): AddrFields => ({ placeName: '', line1: '', line2: '', city: '', region: '', postal: '', country: 'Polska' });
// Składa adres do jednej linii na potrzeby wyświetlania (np. „Rynek Główny 1, Kraków").
export const joinAddr = (a: AddrFields): string => [a.placeName, a.line1, a.line2, a.city].map((s) => (s || '').trim()).filter(Boolean).join(', ');
// EventItem → pola formularza (z fallbackiem starego, jednoliniowego `place`).
export const eventAddr = (e: EventItem): AddrFields => {
  const structured = e.addrLine1 || e.addrPlaceName || e.addrLine2 || e.city;
  return {
    placeName: e.addrPlaceName ?? '',
    line1: e.addrLine1 ?? (structured ? '' : (e.place ?? '')),
    line2: e.addrLine2 ?? '', city: e.city ?? '', region: e.region ?? '', postal: e.postal ?? '', country: e.country ?? 'Polska',
  };
};
// Pola formularza → fragment EventItem (do zapisania).
export const addrToEvent = (a: AddrFields) => ({
  addrPlaceName: a.placeName.trim() || undefined, addrLine1: a.line1.trim() || undefined, addrLine2: a.line2.trim() || undefined,
  city: a.city.trim() || undefined, region: a.region.trim() || undefined, postal: a.postal.trim() || undefined, country: a.country || undefined,
});

export function AddressBlock({ v, onChange, placeNameLabel = 'Nazwa miejsca' }: { v: AddrFields; onChange: (patch: Partial<AddrFields>) => void; placeNameLabel?: string }) {
  return (
    <>
      <Field label={placeNameLabel}><input value={v.placeName} onChange={(e) => onChange({ placeName: e.target.value })} placeholder="opcjonalnie" className={inputCls} /></Field>
      <div className="flex gap-3">
        <Field label="Linia adresu 1" className="flex-1"><input value={v.line1} onChange={(e) => onChange({ line1: e.target.value })} placeholder="ul. Marszałkowska 1" className={inputCls} /></Field>
        <Field label="Linia adresu 2" className="flex-1"><input value={v.line2} onChange={(e) => onChange({ line2: e.target.value })} placeholder="lok. 10" className={inputCls} /></Field>
      </div>
      <div className="flex gap-3">
        <Field label="Miasto" className="flex-1"><input value={v.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="Sandomierz" className={inputCls} /></Field>
        <Field label="Województwo / region" className="flex-1"><input value={v.region} onChange={(e) => onChange({ region: e.target.value })} placeholder="świętokrzyskie" className={inputCls} /></Field>
      </div>
      <div className="flex gap-3">
        <Field label="Kod pocztowy" className="flex-1"><input value={v.postal} onChange={(e) => onChange({ postal: e.target.value })} placeholder="27-600" className={inputCls} /></Field>
        <Field label="Kraj" className="flex-1">
          <select value={v.country} onChange={(e) => onChange({ country: e.target.value })} className={inputCls}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>
    </>
  );
}

// Przycisk „Pokaż na mapie" + mini-mapka z przeciąganą pinezką — wspólny dla formularzy wydarzeń.
export function LocationMap({ addr, coords, onChange }: { addr: AddrFields; coords?: LatLng; onChange: (c: LatLng) => void }) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const hasAddr = !!(addr.line1.trim() || addr.placeName.trim());
  const check = async () => {
    setLoading(true);
    const c = await geocodeAddr(addr);
    setLoading(false);
    if (c) onChange(c);
    else showToast('Nie znaleziono adresu — sprawdź pisownię', '⚠️');
  };
  return (
    <div className="space-y-2">
      <button type="button" onClick={check} disabled={!hasAddr || loading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-coral/30 bg-coral/5 py-2.5 text-[13px] font-bold text-coral active:scale-[0.98] disabled:opacity-50">
        <MapPin size={15} /> {loading ? 'Szukam adresu…' : coords ? 'Odśwież pinezkę z adresu' : 'Pokaż na mapie'}
      </button>
      {coords && (
        <div>
          <div className="h-44 overflow-hidden rounded-xl border border-black/10"><MiniMap coords={coords} onChange={onChange} /></div>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-subtle"><MapPin size={11} /> Tu trafi pinezka w aplikacji. Nie pasuje? Przeciągnij ją w dobre miejsce.</p>
        </div>
      )}
    </div>
  );
}

// Potwierdzenie przed publikacją (wydarzenia / promocje / lokale) — wspólne okienko.
// Portal do body, by okno było nad dolną nawigacją (fixed wewnątrz animowanego kontenera nie wystarcza).
export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: { open: boolean; title: string; message?: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-5" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-card bg-paper p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
        <p className="text-[16.5px] font-extrabold text-ink">{title}</p>
        {message && <p className="mt-1.5 text-[13.5px] leading-snug text-subtle">{message}</p>}
        <div className="mt-4 flex gap-2.5">
          <button onClick={onCancel} className="flex-1 rounded-2xl bg-black/5 py-3 text-[14px] font-bold text-ink/60 active:scale-[0.98]">Anuluj</button>
          <button onClick={onConfirm} className="flex-[1.5] rounded-2xl bg-coral py-3 text-[14px] font-bold text-white shadow-coral active:scale-[0.98]">{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export const inputCls = 'mt-1.5 w-full rounded-xl border border-black/10 bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-coral';
export const timeInputCls = 'flex-1 rounded-xl border border-black/10 bg-paper px-3 py-2.5 text-[14px] outline-none focus:border-coral';
const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

// Etykieta rabatu na kartę (np. „-20%") wyciągana z nazwy promocji lub kategorii.
function formatDays(days?: number[]): string {
  if (!days || days.length === 0 || days.length === 7) return 'Codziennie';
  const s = [...days].sort((a, b) => a - b);
  const contiguous = s.every((d, i) => i === 0 || d === s[i - 1] + 1);
  if (contiguous && s.length > 2) return `${DAYS[s[0]]}–${DAYS[s[s.length - 1]]}`;
  return s.map((d) => DAYS[d]).join(', ');
}
const shortDate = (d?: string) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '');
const toHref = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
const isOwn = (id: string) => id.startsWith('own-');
// Wczytuje plik i ZMNIEJSZA go (canvas → JPEG), by data-URL zmieścił się w localStorage
// (inaczej duże zdjęcia przepełniają pamięć i NIC się nie zapisuje).
export function readFileAsDataURL(file: File, cb: (url: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    const src = typeof reader.result === 'string' ? reader.result : '';
    if (!src) return cb('');
    const img = new Image();
    img.onload = () => {
      const MAX = 900;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r); }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return cb(src);
      ctx.drawImage(img, 0, 0, w, h);
      try { cb(canvas.toDataURL('image/jpeg', 0.72)); } catch { cb(src); }
    };
    img.onerror = () => cb(src);
    img.src = src;
  };
  reader.readAsDataURL(file);
}

type View = 'hub' | 'profile' | 'promos' | 'vouchers' | 'events' | 'gallery' | 'stats' | 'team' | 'advisor';
const FN_ICON: Record<string, typeof Store> = {
  advisor: Sparkles, profile: UserCircle, promos: Percent, vouchers: Ticket, events: CalendarDays, gallery: ImageIcon, stats: BarChart3, team: Users,
};
const VIEW_TITLE: Record<View, string> = {
  hub: 'Panel firmowy', advisor: 'Doradca AI', profile: 'Profil lokalu', promos: 'Promocje', vouchers: 'Oferty Lokalio',
  events: 'Wydarzenia', gallery: 'Galeria', stats: 'Statystyki', team: 'Zespół',
};
const ADMIN_ONLY_VIEWS: View[] = ['advisor', 'profile', 'stats', 'team'];

export interface TeamMember { id: string; name: string; email: string; role: TeamRole; owner?: boolean; }
export function loadTeam(key: string, ownerName?: string, ownerEmail?: string): TeamMember[] {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) as TeamMember[]; } catch { /* ignore */ }
  return [{ id: 'owner', name: ownerName || 'Ty', email: ownerEmail || '', role: 'admin', owner: true }];
}

type Detail = { kind: 'offer' | 'event'; id: string };
// Szkic z Doradcy AI, który ma się wlać do formularza po przejściu do danej zakładki.
type AdvisorDraft = { target: 'promo' | 'bon'; form: Partial<OfferForm> } | { target: 'event'; form: Partial<EventForm> };

export function LokalPanel() {
  const { back, logoutOwner, ownerBusiness, ownerVenues, ownerVenueIds, addOwnerVenue, currentCity, offers, ownerOffers, events, ownerEvents, updateOwnerOffer, updateOwnerEvent, ownerSetup, setOwnerSetup } = useApp();
  const [view, setView] = useState<View>('hub');
  const [profileSetup, setProfileSetup] = useState(false); // świeża rejestracja → otwórz formularz lokalu od razu w edycji
  const [role, setRole] = useState<TeamRole>('admin'); // efektywna rola (podgląd „jako")
  const [advisorDraft, setAdvisorDraft] = useState<AdvisorDraft | null>(null);
  const onAdvisorAction = (a: AdvisorAction) => {
    if (a.kind === 'open') { setView(a.view as View); return; }
    if (a.kind === 'promo') { const { target, ...form } = a.draft; setAdvisorDraft({ target, form }); setView(target === 'bon' ? 'vouchers' : 'promos'); }
    else if (a.kind === 'event') { setAdvisorDraft({ target: 'event', form: a.draft }); setView('events'); }
  };
  const [team, setTeam] = useState<TeamMember[]>(() => loadTeam('lokalio.team', ownerBusiness?.name, ownerBusiness?.email));
  useEffect(() => { try { localStorage.setItem('lokalio.team', JSON.stringify(team)); } catch { /* ignore */ } }, [team]);
  // Moderator nie ma dostępu do ekranów administracyjnych — wróć do huba.
  useEffect(() => { if (role === 'moderator' && ADMIN_ONLY_VIEWS.includes(view)) setView('hub'); }, [role, view]);
  const myVenues = useMemo(
    () => ownerVenueIds.map((id) => ownerVenues.find((v) => v.id === id) ?? venueById(id)).filter((v): v is Venue => !!v),
    [ownerVenueIds, ownerVenues],
  );
  const [venueId, setVenueId] = useState(() => myVenues[0]?.id ?? '');
  const [detail, setDetail] = useState<Detail | null>(null);
  // Pozwala otwartemu formularzowi (OffersView) przejąć przycisk „wstecz": podgląd → edycja → lista.
  const formBackRef = useRef<null | (() => boolean)>(null);
  const venue = myVenues.find((v) => v.id === venueId) ?? myVenues[0];

  // Po rejestracji (ekran „Dane konta" → kod): od razu stwórz lokal i otwórz formularz dodawania.
  const setupDone = useRef(false);
  useEffect(() => {
    if (!ownerSetup || setupDone.current) return;
    setupDone.current = true;
    const v = makeOwnerVenue(ownerBusiness?.name || 'Mój lokal', DEFAULT_VENUE_CAT, currentCity.center, currentCity.districts[0]?.district ?? '');
    addOwnerVenue(v);
    setVenueId(v.id);
    setView('profile');
    setProfileSetup(true);
    setOwnerSetup(false);
  }, [ownerSetup, ownerBusiness, currentCity, addOwnerVenue, setOwnerSetup]);
  // Wyłącz „od razu edycja" dopiero przy WYJŚCIU z profilu (nie na starcie), by kolejne wejścia startowały od podglądu.
  const prevView = useRef(view);
  useEffect(() => { if (prevView.current === 'profile' && view !== 'profile') setProfileSetup(false); prevView.current = view; }, [view]);

  const onAddVenue = (name: string, type: string) => {
    const v = makeOwnerVenue(name, type, currentCity.center, currentCity.districts[0]?.district ?? '');
    addOwnerVenue(v);
    setVenueId(v.id);
    setView('hub');
  };

  if (!venue) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-cream px-8 text-center">
        <span className="text-4xl">🏪</span>
        <p className="text-[14px] font-bold text-ink">Nie masz jeszcze żadnego lokalu</p>
        <button onClick={() => onAddVenue('Mój lokal', DEFAULT_VENUE_CAT)} className="rounded-full bg-coral px-5 py-2.5 text-[13.5px] font-bold text-white shadow-coral">+ Dodaj lokal</button>
        <button onClick={back} className="text-[13px] font-semibold text-ink/50">Wróć</button>
      </div>
    );
  }

  const detailItem = detail
    ? detail.kind === 'offer'
      ? (offers.find((o) => o.id === detail.id) ?? ownerOffers.find((o) => o.id === detail.id)) // ownerOffers — by otwierać też zakończone
      : (events.find((e) => e.id === detail.id) ?? ownerEvents.find((e) => e.id === detail.id))
    : null;

  const onBack = () => {
    if (formBackRef.current && formBackRef.current()) return; // podgląd → edycja → zamknij formularz
    if (detail) return setDetail(null);
    if (view !== 'hub') return setView('hub');
    back();
  };
  const headerTitle = detailItem ? detailItem.title : VIEW_TITLE[view];

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-cream pb-10">
      <div className="flex items-center gap-3 px-4 pb-2 pt-5">
        <button onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 active:scale-90"><ChevronLeft size={22} /></button>
        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 items-center gap-2 text-[19px] font-extrabold tracking-tight text-ink">
            {view === 'hub' && !detail ? <Store size={19} className="shrink-0 text-coral" /> : null}<span className="truncate">{headerTitle}</span>
          </h1>
          <p className="truncate text-[12px] text-subtle">{venue.name} · {venue.district}</p>
        </div>
      </div>

      <div className="px-4">
        {detail && detailItem ? (
          <DetailView kind={detail.kind} item={detailItem} venue={venue} onEndOffer={(o) => { updateOwnerOffer({ ...o, ended: true }); setDetail(null); }} onEndEvent={(e) => { updateOwnerEvent({ ...e, ended: true }); setDetail(null); }} />
        ) : (
          <>
            {view === 'hub' && <Hub venue={venue} venues={myVenues} venueId={venueId} setVenueId={setVenueId} onOpen={setView} onAddVenue={onAddVenue} onLogout={logoutOwner} role={role} setRole={setRole} />}
            {view === 'advisor' && (
              <BusinessAdvisor
                ctx={{
                  kind: 'lokal', name: venue.name, category: venue.category, checkin: venue.checkin, stats: venueStats(venue),
                  followers: organizerById(venue.organizerId)?.followers ?? (60 + (hashId(venue.id + 'f') % 540)),
                  offers: ownerOffers.filter((o) => o.venueId === venue.id && !o.ended),
                  events: ownerEvents.filter((e) => e.venueId === venue.id && !e.ended),
                } as AdvisorCtx}
                onAction={onAdvisorAction}
              />
            )}
            {view === 'profile' && <ProfilSection venue={venue} isAdmin={role === 'admin'} onDeleted={() => setView('hub')} backRef={formBackRef} initialEditing={profileSetup} />}
            {view === 'promos' && <OffersView venue={venue} kind="promo" onOpenDetail={(id) => setDetail({ kind: 'offer', id })} backRef={formBackRef} initialDraft={advisorDraft?.target === 'promo' ? advisorDraft.form : undefined} onDraftConsumed={() => setAdvisorDraft(null)} />}
            {view === 'vouchers' && <OffersView venue={venue} kind="bon" onOpenDetail={(id) => setDetail({ kind: 'offer', id })} backRef={formBackRef} initialDraft={advisorDraft?.target === 'bon' ? advisorDraft.form : undefined} onDraftConsumed={() => setAdvisorDraft(null)} />}
            {view === 'events' && <EventsView venue={venue} onOpenDetail={(id) => setDetail({ kind: 'event', id })} backRef={formBackRef} initialDraft={advisorDraft?.target === 'event' ? advisorDraft.form : undefined} onDraftConsumed={() => setAdvisorDraft(null)} />}
            {view === 'gallery' && <GalleryView venue={venue} onCancel={() => setView('hub')} />}
            {view === 'stats' && <StatsView venue={venue} />}
            {view === 'team' && <TeamView team={team} setTeam={setTeam} role={role} setRole={setRole} />}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Szczegóły pozycji (promocja / bon / wydarzenie) ze statystykami
export function DetailView({ kind, item, venue, onEndOffer, onEndEvent }: { kind: 'offer' | 'event'; item: Offer | EventItem; venue?: Venue; onEndOffer?: (o: Offer) => void; onEndEvent?: (e: EventItem) => void }) {
  const isOffer = kind === 'offer';
  const [confirmEnd, setConfirmEnd] = useState(false);
  const offer = isOffer ? (item as Offer) : null;
  const event = !isOffer ? (item as EventItem) : null;
  const id = item.id;
  const color = offer ? offer.color : CATEGORY_META[event!.category].color;
  const emoji = offer ? offer.emoji : event!.emoji;
  const photo = item.photo;
  const schedule = offer
    ? offer.validLabel
    : `${event!.dateIso.slice(8, 10)}.${event!.dateIso.slice(5, 7)} ${event!.dateIso.slice(11, 16)}${event!.endIso ? `–${event!.endIso.slice(11, 16)}` : ''}`;
  const views = statViews(id);
  const interest = statInterest(id);
  const third = isOffer ? statUsed(id) : statAttend(id);
  const conv = Math.round((third / views) * 100);

  return (
    <div className="mt-2 space-y-4">
      {isOffer && offer && venue ? (
        <div className="overflow-hidden rounded-card border border-black/10 shadow-card">
          <OfferDetailContent offer={offer} venue={venue} preview />
        </div>
      ) : !isOffer && event ? (
        <div className="overflow-hidden rounded-card border border-black/10 shadow-card">
          <EventDetailContent event={event} preview />
        </div>
      ) : (
        <div className="relative h-36 overflow-hidden rounded-card shadow-card" style={!photo ? { background: `linear-gradient(135deg, ${color}, ${color}bb)` } : undefined}>
          {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-black/10" />
          <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-lg">{emoji}</span>
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10.5px] font-bold text-ink">{isOffer ? (offer!.kind === 'bon' ? 'Oferta Lokalio' : 'Promocja') : 'Wydarzenie'}</span>
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-[16px] font-extrabold leading-tight text-white drop-shadow">{item.title}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[12px] text-white/85"><Clock size={12} /> {schedule}{offer?.quantity != null ? ` · ${offer.quantity} szt.` : ''}</p>
          </div>
        </div>
      )}

      <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink/45">Statystyki</p>
      <div className="grid grid-cols-3 gap-2.5">
        <StatTile icon={Eye} tint="#FF5A4D" value={views.toLocaleString('pl-PL')} label="Wyświetlenia" delta="+18%" />
        <StatTile icon={Heart} tint="#7A5C99" value={`${interest}`} label="Zainteresowanie" delta="+9%" />
        <StatTile icon={isOffer ? Ticket : Users} tint="#3FAE83" value={`${third}`} label={isOffer ? 'Skorzystało' : 'Weźmie udział'} delta="+5%" />
      </div>

      <div className="rounded-card bg-paper p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold text-ink">{isOffer ? 'Konwersja' : 'Udział'}</p>
          <span className="text-[14px] font-extrabold text-coral">{conv}%</span>
        </div>
        <p className="mt-0.5 text-[12px] leading-snug text-subtle">
          {isOffer
            ? `${conv}% osób, które zobaczyły ofertę, skorzystało z niej.`
            : `${conv}% osób, które zobaczyły wydarzenie, deklaruje udział.`}
        </p>
        <div className="mt-3"><WeekChart seed={hashId(id)} /></div>
      </div>

      {event && (event.eventUrl || event.ticketUrl) && (
        <div className="flex gap-2">
          {event.eventUrl && <a href={toHref(event.eventUrl)} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-black/5 py-3 text-[13.5px] font-bold text-ink/70 active:scale-[0.98]"><ExternalLink size={15} /> Strona wydarzenia</a>}
          {event.ticketUrl && <a href={toHref(event.ticketUrl)} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-coral py-3 text-[13.5px] font-bold text-white shadow-coral active:scale-[0.98]"><Ticket size={15} /> Kup bilet</a>}
        </div>
      )}

      {isOffer && offer && onEndOffer && (
        offer.ended ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink/8 py-3.5 text-[14.5px] font-bold text-ink/55"><Check size={17} /> {offer.kind === 'bon' ? 'Oferta zakończona' : 'Promocja zakończona'}</div>
        ) : !confirmEnd ? (
          <button onClick={() => setConfirmEnd(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3.5 text-[15px] font-bold text-white shadow-coral active:scale-[0.98]"><X size={18} /> Zakończ {offer.kind === 'bon' ? 'ofertę' : 'promocję'}</button>
        ) : (
          <div className="space-y-2.5 rounded-card bg-coral/5 p-3.5">
            <p className="text-[13px] font-semibold leading-snug text-ink/80">Na pewno zakończyć tę {offer.kind === 'bon' ? 'ofertę' : 'promocję'}? Zniknie z aplikacji i trafi do „Zakończone".</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmEnd(false)} className="flex-1 rounded-2xl bg-black/5 py-2.5 text-[13px] font-bold text-ink/60 active:scale-[0.98]">Anuluj</button>
              <button onClick={() => onEndOffer(offer)} className="flex-1 rounded-2xl bg-coral py-2.5 text-[13px] font-bold text-white active:scale-[0.98]">Zakończ</button>
            </div>
          </div>
        )
      )}

      {!isOffer && event && onEndEvent && (
        event.ended ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink/8 py-3.5 text-[14.5px] font-bold text-ink/55"><Check size={17} /> Wydarzenie zakończone</div>
        ) : !confirmEnd ? (
          <button onClick={() => setConfirmEnd(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3.5 text-[15px] font-bold text-white shadow-coral active:scale-[0.98]"><X size={18} /> Zakończ wydarzenie</button>
        ) : (
          <div className="space-y-2.5 rounded-card bg-coral/5 p-3.5">
            <p className="text-[13px] font-semibold leading-snug text-ink/80">Na pewno zakończyć to wydarzenie? Zniknie z aplikacji i trafi do „Zakończone".</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmEnd(false)} className="flex-1 rounded-2xl bg-black/5 py-2.5 text-[13px] font-bold text-ink/60 active:scale-[0.98]">Anuluj</button>
              <button onClick={() => onEndEvent(event)} className="flex-1 rounded-2xl bg-coral py-2.5 text-[13px] font-bold text-white active:scale-[0.98]">Zakończ</button>
            </div>
          </div>
        )
      )}

      <p className="text-center text-[11.5px] text-subtle">Edytujesz i usuwasz na liście — wróć strzałką wstecz.</p>
    </div>
  );
}

// ============================================================
function Hub({ venue, venues, venueId, setVenueId, onOpen, onAddVenue, onLogout, role, setRole }: { venue: Venue; venues: Venue[]; venueId: string; setVenueId: (id: string) => void; onOpen: (v: View) => void; onAddVenue: (name: string, type: string) => void; onLogout: () => void; role: TeamRole; setRole: (r: TeamRole) => void }) {
  const { liveCount } = useApp();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState(DEFAULT_VENUE_CAT);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const isAdmin = role === 'admin';

  return (
    <>
      {!isAdmin && (
        <div className="mt-2 flex items-center gap-2 rounded-card bg-info/10 px-3.5 py-2.5 text-info">
          <Shield size={15} className="shrink-0" />
          <p className="flex-1 text-[12px] font-semibold">Oglądasz panel jako Moderator (ograniczony dostęp).</p>
          <button onClick={() => setRole('admin')} className="shrink-0 rounded-full bg-info/15 px-2.5 py-1 text-[11.5px] font-bold">Jako Administrator</button>
        </div>
      )}
      <div className="mt-2 overflow-hidden rounded-card bg-paper shadow-card">
        <div className="relative h-28">
          <img src={venue.photo || photoUrl(venue.category, venue.id, 700, 280)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-extrabold text-white drop-shadow">{venue.name}</p>
              <p className="text-[11.5px] text-white/85">{[venue.address, venue.district].filter(Boolean).join(', ') || 'Uzupełnij adres w profilu'}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ink">👥 {liveCount(venue)} teraz</span>
          </div>
        </div>
        <div className="space-y-2 p-2.5">
          {venues.length > 1 && (
            <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className="w-full rounded-xl border border-black/10 bg-paper px-3 py-2 text-[13px] font-semibold outline-none focus:border-coral">
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}{v.district ? ` · ${v.district}` : ''}</option>)}
            </select>
          )}
          {isAdmin && (!adding ? (
            <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-coral/40 bg-coral/5 py-2 text-[13px] font-bold text-coral active:scale-[0.99]">
              <Plus size={15} /> Dodaj lokal
            </button>
          ) : (
            <div className="space-y-2 rounded-xl bg-black/[0.03] p-2.5">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nazwa lokalu" className={inputCls.replace('mt-1.5 ', '')} />
              <CategorySelect value={newType} onChange={setNewType} groups={VENUE_GROUPS} />
              <div className="flex gap-2">
                <button onClick={() => { setAdding(false); setNewName(''); }} className="flex-1 rounded-xl bg-black/5 py-2 text-[13px] font-bold text-ink/60">Anuluj</button>
                <button onClick={() => { onAddVenue(newName, newType); setAdding(false); setNewName(''); }} className="flex-[2] rounded-xl bg-coral py-2 text-[13px] font-bold text-white shadow-coral">Dodaj</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="mb-2 mt-5 text-[13px] font-bold uppercase tracking-wide text-ink/45">Zarządzaj</h2>
      <div className="space-y-2">
        {fnsForRole(LOKAL_PANEL_FNS, role).map((f) => {
          const Icon = FN_ICON[f.key] ?? Store;
          return (
            <button key={f.key} onClick={() => onOpen(f.key as View)} className="flex w-full items-center gap-3 rounded-card bg-paper p-3.5 text-left shadow-card active:scale-[0.99]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral"><Icon size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-bold text-ink">{f.label}</p>
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
// Zespół — osoby i role (dostępne tylko dla Administratora)
export function TeamView({ team, setTeam, role, setRole }: { team: TeamMember[]; setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>; role: TeamRole; setRole: (r: TeamRole) => void }) {
  const { showToast } = useApp();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [newRole, setNewRole] = useState<TeamRole>('moderator');

  const invite = () => {
    if (!email.trim()) return;
    setTeam((t) => [...t, { id: `m-${Date.now()}`, name: name.trim() || email.split('@')[0], email: email.trim(), role: newRole }]);
    setEmail(''); setName('');
    showToast('Zaproszenie wysłane', '✉️');
  };
  const remove = (id: string) => setTeam((t) => t.filter((m) => m.id !== id));
  const changeRole = (id: string, r: TeamRole) => setTeam((t) => t.map((m) => (m.id === id ? { ...m, role: r } : m)));

  return (
    <div className="mt-2 space-y-4">
      {/* Podgląd jako rola */}
      <div className="rounded-card bg-paper p-3.5 shadow-card">
        <p className="text-[13px] font-bold text-ink/70">Podgląd panelu jako</p>
        <div className="mt-2 flex gap-2">
          {(['admin', 'moderator'] as TeamRole[]).map((r) => (
            <button key={r} onClick={() => setRole(r)} className={cx('flex-1 rounded-xl py-2 text-[12.5px] font-bold active:scale-95', role === r ? 'bg-coral text-white' : 'bg-black/5 text-ink/55')}>{r === 'admin' ? 'Administrator' : 'Moderator'}</button>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-subtle">Zobacz, jak panel wygląda dla danej roli.</p>
      </div>

      {/* Uprawnienia */}
      <div className="space-y-2.5 rounded-card bg-paper p-4 shadow-card">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral"><Shield size={16} /></span>
          <div><p className="text-[13.5px] font-bold text-ink">Administrator</p><p className="text-[12px] leading-snug text-subtle">Profil, lokale, promocje/oferty, wydarzenia, statystyki, zapraszanie i usuwanie osób, ustawienia — pełny dostęp.</p></div>
        </div>
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info/12 text-info"><Pencil size={15} /></span>
          <div><p className="text-[13.5px] font-bold text-ink">Moderator</p><p className="text-[12px] leading-snug text-subtle">Dodaje i edytuje treści: promocje, oferty Lokalio, wydarzenia, galeria. Bez zapraszania osób, usuwania lokalu i wrażliwych ustawień.</p></div>
        </div>
      </div>

      {/* Członkowie */}
      <div>
        <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink/45">Osoby ({team.length})</h2>
        <div className="space-y-2">
          {team.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-card bg-paper p-3 shadow-card">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/12 text-[15px] font-extrabold uppercase text-coral">{(m.name || m.email || '?').slice(0, 1)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-ink">{m.name}{m.owner ? ' (Ty)' : ''}</p>
                <p className="truncate text-[11.5px] text-subtle">{m.email || 'bez e-maila'}</p>
              </div>
              {m.owner ? (
                <span className="shrink-0 rounded-full bg-coral/10 px-2.5 py-1 text-[11px] font-bold text-coral">Administrator</span>
              ) : (
                <div className="flex shrink-0 items-center gap-1.5">
                  <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value as TeamRole)} className="rounded-lg border border-black/10 bg-paper px-2 py-1 text-[11.5px] font-bold outline-none focus:border-coral">
                    <option value="admin">Administrator</option>
                    <option value="moderator">Moderator</option>
                  </select>
                  <button onClick={() => remove(m.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink/40 active:scale-90"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Zaproś osobę */}
      <div className="space-y-3 rounded-card bg-paper p-3.5 shadow-card">
        <p className="text-[14px] font-extrabold text-ink">Zaproś osobę</p>
        <Field label="E-mail"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="osoba@email.pl" className={inputCls} /></Field>
        <Field label="Imię (opcjonalnie)"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Kasia" className={inputCls} /></Field>
        <Field label="Rola">
          <select value={newRole} onChange={(e) => setNewRole(e.target.value as TeamRole)} className={inputCls}>
            <option value="moderator">Moderator</option>
            <option value="admin">Administrator</option>
          </select>
        </Field>
        <button onClick={invite} disabled={!email.trim()} className={cx('flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-bold transition active:scale-[0.98]', email.trim() ? 'bg-coral text-white shadow-coral' : 'bg-black/10 text-ink/40')}>
          <Mail size={16} /> Wyślij zaproszenie
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Profil lokalu — zdjęcie, dane, adres (rozbity), godziny (wiele bloków), www/menu, social
interface Hours { days: number[]; from: string; to: string; }

// Profil lokalu: domyślnie pokazuje ekran lokalu (podgląd) z przyciskiem „Edytuj profil",
// a po tapnięciu — ten sam formularz, którym dodaje się i edytuje dane.
function ProfilSection({ venue, isAdmin, onDeleted, backRef, initialEditing = false }: { venue: Venue; isAdmin: boolean; onDeleted: () => void; backRef: React.MutableRefObject<null | (() => boolean)>; initialEditing?: boolean }) {
  const [editing, setEditing] = useState(initialEditing);
  // Przejmij „wstecz": z formularza wróć do podglądu (a nie od razu do panelu).
  useEffect(() => {
    backRef.current = editing ? () => { setEditing(false); return true; } : null;
    return () => { backRef.current = null; };
  }, [editing, backRef]);

  if (editing) return <ProfilView venue={venue} isAdmin={isAdmin} onDeleted={onDeleted} onCancel={() => setEditing(false)} />;
  return (
    <div className="mt-2 overflow-hidden rounded-card border border-black/10 shadow-card">
      <VenueDetailContent venue={venue} preview onEdit={() => setEditing(true)} />
    </div>
  );
}

function ProfilView({ venue, isAdmin, onDeleted, onCancel }: { venue: Venue; isAdmin: boolean; onDeleted: () => void; onCancel: () => void }) {
  const { showToast, updateOwnerVenue, removeOwnerVenue, ownerBusiness, offers, events, currentCity } = useApp();
  const [photo, setPhoto] = useState<string | undefined>(venue.photo);
  const [name, setName] = useState(venue.name);
  const [venueType, setVenueType] = useState(venue.venueType ?? DEFAULT_VENUE_CAT);
  const [desc, setDesc] = useState(venue.description);
  const [phone, setPhone] = useState(venue.phone ?? '');
  const [website, setWebsite] = useState(venue.website ?? '');
  const [menu, setMenu] = useState(venue.menu ?? '');
  // adres rozbity
  const [placeName, setPlaceName] = useState(venue.addrPlaceName ?? '');
  const [line1, setLine1] = useState(venue.address);
  const [line2, setLine2] = useState(venue.addrLine2 ?? '');
  const [city, setCity] = useState(venue.city ?? venue.district);
  const [region, setRegion] = useState(venue.region ?? '');
  const [postal, setPostal] = useState(venue.postal ?? '');
  const [country, setCountry] = useState(venue.country ?? 'Polska');
  // Lokalizacja lokalu (pinezka na mapie). Świeży lokal startuje w środku miasta — geokodujemy adres.
  const [coords, setCoords] = useState<LatLng | undefined>(venue.coords);
  const [coordsTouched, setCoordsTouched] = useState(false); // właściciel ustawił pinezkę ręcznie (geokod/przeciągnięcie)
  const isCenter = (c?: LatLng) => !!c && Math.abs(c.lat - currentCity.center.lat) < 1e-4 && Math.abs(c.lng - currentCity.center.lng) < 1e-4;
  const [del, setDel] = useState<'no' | 'confirm' | 'code'>('no');
  const [delCode, setDelCode] = useState('');
  // godziny — wiele bloków
  const [hours, setHours] = useState<Hours[]>(() => venue.hours?.length ? venue.hours.map((h) => ({ ...h })) : [
    { days: [0, 1, 2, 3, 4], from: '09:00', to: '22:00' },
    { days: [5, 6], from: '10:00', to: '23:59' },
  ]);
  // social
  const [social, setSocial] = useState<Record<string, string>>(() => {
    const s: Record<string, string> = {};
    if (venue.socials) for (const [k, v] of Object.entries(venue.socials)) if (v) s[k] = v;
    return s;
  });
  const setHour = (i: number, patch: Partial<Hours>) => setHours((hs) => hs.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  const addHour = () => setHours((hs) => [...hs, { days: [], from: '09:00', to: '18:00' }]);
  const removeHour = (i: number) => setHours((hs) => hs.filter((_, j) => j !== i));

  const [confirm, setConfirm] = useState(false);
  const save = () => setConfirm(true);
  const doSave = async () => {
    setConfirm(false);
    // Współrzędne pinezki: ręcznie ustawiona wygrywa; w innym razie, jeśli lokal wciąż jest
    // w domyślnym środku miasta, geokodujemy adres, żeby znacznik/miniatura trafiły w lokal.
    let resolved = coords;
    if (!coordsTouched && isCenter(coords)) {
      const geo = await geocodeAddr({ placeName, line1, line2, city, region, postal, country });
      if (geo) resolved = geo;
    }
    const socials = Object.fromEntries(Object.entries(social).filter(([, v]) => v && v.trim())) as Venue['socials'];
    updateOwnerVenue({
      ...venue,
      name: name.trim() || venue.name, venueType, category: venueMainCat(venueType), description: desc,
      address: line1, addrPlaceName: placeName || undefined, addrLine2: line2 || undefined,
      city: city || undefined, district: city || venue.district, region: region || undefined, postal: postal || undefined, country,
      phone: phone || undefined, website: website || undefined, menu: menu || undefined,
      hours: hours.length ? hours : undefined,
      socials: socials && Object.keys(socials).length ? socials : undefined,
      photo,
      coords: resolved ?? venue.coords,
    });
    showToast(resolved && !isCenter(resolved) ? 'Zapisano profil i lokalizację 📍' : 'Zapisano zmiany profilu', '✅');
  };

  // Lokal „z danymi" — usuwanie wymaga kodu z e-maila; pusty (świeżo dodany) — tylko potwierdzenie.
  const hasContent = !!(venue.description?.trim() || venue.address?.trim() || venue.phone?.trim() || venue.website?.trim()
    || offers.some((o) => o.venueId === venue.id) || events.some((e) => e.venueId === venue.id));
  const doDelete = () => { removeOwnerVenue(venue.id); showToast('Lokal usunięty', '🗑️'); onDeleted(); };

  return (
    <div className="mt-2 space-y-3">
      <ConfirmDialog
        open={confirm}
        title="Zapisać i opublikować lokal?"
        message="Lokal i jego dane będą widoczne dla użytkowników aplikacji."
        confirmLabel="Tak, zapisz"
        onConfirm={doSave}
        onCancel={() => setConfirm(false)}
      />
      <div className="relative h-32 overflow-hidden rounded-card shadow-card">
        <img src={photo || photoUrl(venue.category, venue.id, 800, 320)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <PhotoPicker value={photo} onChange={setPhoto} category={venue.category} seed={venue.id + 'profil'} label="Zdjęcie główne" />
      <Field label="Nazwa lokalu"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
      <Field label="Rodzaj lokalu"><CategorySelect value={venueType} onChange={setVenueType} groups={VENUE_GROUPS} /></Field>
      <Field label="Opis"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className={inputCls} /></Field>
      <Field label="Telefon"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48…" className={inputCls} /></Field>

      {/* Adres rozbity — wspólny blok (taki sam jak w wydarzeniach) */}
      <SectionTitle>Adres</SectionTitle>
      <AddressBlock
        placeNameLabel="Nazwa biura lub miejsca"
        v={{ placeName, line1, line2, city, region, postal, country }}
        onChange={(p) => {
          if (p.placeName !== undefined) setPlaceName(p.placeName);
          if (p.line1 !== undefined) setLine1(p.line1);
          if (p.line2 !== undefined) setLine2(p.line2);
          if (p.city !== undefined) setCity(p.city);
          if (p.region !== undefined) setRegion(p.region);
          if (p.postal !== undefined) setPostal(p.postal);
          if (p.country !== undefined) setCountry(p.country);
        }}
      />

      {/* Pinezka lokalu na mapie — geokodowanie adresu + przeciąganie (jak w wydarzeniach).
          Świeży lokal (wciąż w środku miasta) nie pokazuje mapy, dopóki nie ustali pinezki. */}
      <LocationMap
        addr={{ placeName, line1, line2, city, region, postal, country }}
        coords={coordsTouched || !isCenter(coords) ? coords : undefined}
        onChange={(c) => { setCoords(c); setCoordsTouched(true); }}
      />

      {/* Godziny otwarcia — wiele bloków */}
      <SectionTitle>Godziny otwarcia</SectionTitle>
      <p className="-mt-1 text-[11.5px] text-subtle">Dodaj różne godziny dla różnych dni (np. Pn–Pt 9–22, weekend 10–24).</p>
      <div className="space-y-2">
        {hours.map((h, i) => (
          <div key={i} className="space-y-2 rounded-card border border-black/10 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-ink/60">Dni</p>
              {hours.length > 1 && <button onClick={() => removeHour(i)} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-ink/40 active:scale-90"><X size={14} /></button>}
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
      <button onClick={addHour} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-black/15 py-2.5 text-[13px] font-bold text-ink/55 active:scale-[0.99]">
        <Plus size={16} /> Dodaj godziny
      </button>

      <Field label="Strona www"><input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="twojlokal.pl" className={inputCls} /></Field>
      <Field label="Menu (link)"><input value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="twojlokal.pl/menu" className={inputCls} /></Field>

      {/* Linki społeczne */}
      <SectionTitle>Linki społeczne</SectionTitle>
      <p className="-mt-1 text-[11.5px] text-subtle">Pokażą się na publicznej stronie lokalu.</p>
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

      {isAdmin && (
        <div className="mt-2 border-t border-black/10 pt-3">
          {del === 'no' && (
            <button onClick={() => setDel(hasContent ? 'code' : 'confirm')} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-coral/30 py-3 text-[13.5px] font-bold text-coral active:scale-[0.98]">
              <Trash2 size={15} /> Usuń lokal
            </button>
          )}
          {del === 'confirm' && (
            <div className="space-y-2 rounded-card bg-coral/5 p-3.5">
              <p className="text-[13px] font-semibold text-ink/80">Usunąć lokal „{venue.name}"? Tej operacji nie można cofnąć.</p>
              <div className="flex gap-2">
                <button onClick={() => setDel('no')} className="flex-1 rounded-2xl bg-black/5 py-2.5 text-[13px] font-bold text-ink/60">Anuluj</button>
                <button onClick={doDelete} className="flex-1 rounded-2xl bg-coral py-2.5 text-[13px] font-bold text-white">Usuń</button>
              </div>
            </div>
          )}
          {del === 'code' && (
            <div className="space-y-2 rounded-card bg-coral/5 p-3.5">
              <p className="text-[13px] font-semibold leading-snug text-ink/80">Lokal ma zapisane dane. Wpisz kod wysłany na <span className="font-bold text-ink">{ownerBusiness?.email || 'Twój e-mail'}</span>, aby potwierdzić usunięcie. <span className="text-subtle">(Demo: dowolny kod.)</span></p>
              <input value={delCode} onChange={(e) => setDelCode(e.target.value)} inputMode="numeric" placeholder="• • • •" className="w-full rounded-xl border border-black/10 bg-paper px-3.5 py-2.5 text-center text-[18px] font-extrabold tracking-[0.3em] outline-none focus:border-coral" />
              <div className="flex gap-2">
                <button onClick={() => { setDel('no'); setDelCode(''); }} className="flex-1 rounded-2xl bg-black/5 py-2.5 text-[13px] font-bold text-ink/60">Anuluj</button>
                <button onClick={doDelete} disabled={delCode.trim().length < 4} className={cx('flex-1 rounded-2xl py-2.5 text-[13px] font-bold', delCode.trim().length >= 4 ? 'bg-coral text-white' : 'bg-black/10 text-ink/40')}>Usuń lokal</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Promocje / Bony — z edycją, harmonogramem, zdjęciem, liczbą (bon)
interface OfferForm {
  photo?: string; title: string; desc: string; adult: boolean;
  category: string; startDate: string; startTime: string; endDate: string; endTime: string;
  days: number[]; // promocja / oferta cykliczna
  valueType: 'percent' | 'amount' | 'price'; value: string; quantity: string; perPerson: string; // bon
  reqCheckin: boolean; reqFollow: boolean; recurring: boolean; hasHours: boolean; // oferta Lokalio: zadania + cykliczność + godziny
}
function emptyForm(kind: OfferKind): OfferForm {
  return {
    photo: undefined, title: '', desc: '', adult: false,
    category: DEFAULT_OFFER_CAT,
    startDate: todayISODate(), startTime: kind === 'bon' ? '12:00' : '18:00', endDate: isoDatePlus(14), endTime: '20:00',
    days: [0, 1, 2, 3, 4],
    valueType: 'percent', value: '15', quantity: '', perPerson: '0',
    reqCheckin: false, reqFollow: false, recurring: false, hasHours: false,
  };
}
function formFromOffer(o: Offer): OfferForm {
  return {
    photo: o.photo, title: o.title, desc: o.description, adult: !!o.ageMin,
    category: o.promoCategory ?? DEFAULT_OFFER_CAT,
    startDate: o.startDate ?? todayISODate(), startTime: o.timeFrom ?? '12:00',
    endDate: o.endDate ?? isoDatePlus(14), endTime: o.timeTo ?? '20:00',
    days: o.days ?? [0, 1, 2, 3, 4],
    valueType: o.valueType ?? 'percent', value: o.value != null ? String(o.value) : '15',
    quantity: o.quantity != null ? String(o.quantity) : '',
    perPerson: o.perPersonLimit != null ? String(o.perPersonLimit) : '0',
    reqCheckin: !!o.requireCheckin, reqFollow: !!o.requireFollow, recurring: !!o.recurring, hasHours: !!(o.timeFrom && o.timeTo),
  };
}

function OffersView({ venue, kind, onOpenDetail, backRef, initialDraft, onDraftConsumed }: { venue: Venue; kind: OfferKind; onOpenDetail: (id: string) => void; backRef?: React.MutableRefObject<null | (() => boolean)>; initialDraft?: Partial<OfferForm>; onDraftConsumed?: () => void }) {
  const { ownerOffers, addOwnerOffer, updateOwnerOffer, removeOwnerOffer, showToast } = useApp();
  const isBon = kind === 'bon';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [f, setF] = useState<OfferForm>(() => emptyForm(kind));

  // Szkic z Doradcy AI → otwórz formularz wstępnie wypełniony (jednorazowo).
  const draftDone = useRef(false);
  useEffect(() => {
    if (!initialDraft || draftDone.current) return;
    draftDone.current = true;
    setEditingId(null);
    setF({ ...emptyForm(kind), ...initialDraft });
    setPreview(false);
    setOpen(true);
    onDraftConsumed?.();
  }, [initialDraft, kind, onDraftConsumed]);

  const list = useMemo(() => ownerOffers.filter((o) => o.venueId === venue.id && o.kind === kind), [ownerOffers, venue.id, kind]);
  const activeList = useMemo(() => list.filter((o) => !o.ended), [list]);
  const endedList = useMemo(() => list.filter((o) => o.ended), [list]);
  const noun = isBon ? 'ofertę Lokalio' : 'promocję';
  const set = <K extends keyof OfferForm>(k: K, v: OfferForm[K]) => setF((s) => ({ ...s, [k]: v }));

  const startAdd = () => { setEditingId(null); setF(emptyForm(kind)); setPreview(false); setOpen(true); };
  const startEdit = (o: Offer) => { setEditingId(o.id); setF(formFromOffer(o)); setPreview(false); setOpen(true); };
  const close = () => { setOpen(false); setEditingId(null); setPreview(false); };

  // Przejmij przycisk „wstecz": z podglądu wróć do edycji, z edycji zamknij formularz.
  useEffect(() => {
    if (!backRef) return;
    backRef.current = () => {
      if (preview) { setPreview(false); return true; }
      if (open) { close(); return true; }
      return false;
    };
    return () => { backRef.current = null; };
  }, [backRef, open, preview]);

  const buildOffer = (): Offer => {
    // Kolor i emoji wg KATEGORII OFERTY (a nie lokalu) — żeby pinezka i filtr na mapie wynikały z formularza.
    const offerCat = offerMainCat(f.category);
    const offerMeta = CATEGORY_META[offerCat];
    const base = {
      id: editingId ?? `own-o-${Date.now()}`,
      venueId: venue.id,
      kind,
      subtitle: venue.name,
      description: f.desc || 'Oferta dodana w panelu firmowym.',
      activationMinutes: 15,
      ageMin: f.adult ? 18 : undefined,
      emoji: offerMeta.emoji,
      color: offerMeta.color,
      photo: f.photo,
    };
    const bonBase = f.recurring && !f.reqFollow ? formatDays(f.days) : `${shortDate(f.startDate)}–${shortDate(f.endDate)}`;
    const bonValid = f.hasHours ? `${bonBase} ${f.startTime}–${f.endTime}` : bonBase;
    return isBon
      ? {
          ...base,
          title: f.title || f.category || 'Oferta Lokalio',
          discountLabel: f.valueType === 'price' ? `${f.value} zł` : f.valueType === 'percent' ? `-${f.value}%` : `-${f.value} zł`,
          terms: [
            ...(f.reqCheckin ? ['Za zameldowanie w lokalu'] : []),
            ...(f.reqFollow ? ['Tylko dla obserwujących'] : []),
            ...(f.adult ? ['Tylko 18+'] : []),
            Number(f.perPerson) > 0 ? `Limit ${f.perPerson} na osobę` : 'Bez limitu na osobę',
          ],
          validLabel: bonValid,
          promoCategory: f.category,
          valueType: f.valueType,
          value: Number(f.value) || undefined,
          quantity: Number(f.quantity) || undefined,
          perPersonLimit: Number(f.perPerson) || undefined,
          startDate: f.startDate || undefined,
          endDate: f.endDate || undefined,
          timeFrom: f.hasHours ? f.startTime || undefined : undefined,
          timeTo: f.hasHours ? f.endTime || undefined : undefined,
          requireCheckin: f.reqCheckin || undefined,
          requireFollow: f.reqFollow || undefined,
          recurring: f.recurring && !f.reqFollow ? true : undefined,
          days: f.recurring && !f.reqFollow ? f.days : undefined,
        }
      : {
          ...base,
          title: f.title || f.category || 'Nowa promocja',
          discountLabel: f.valueType === 'price' ? `${f.value} zł` : f.valueType === 'percent' ? `-${f.value}%` : `-${f.value} zł`,
          terms: f.adult ? ['Tylko 18+'] : [],
          validLabel: bonValid,
          promoCategory: f.category,
          valueType: f.valueType,
          value: Number(f.value) || undefined,
          startDate: f.startDate || undefined,
          endDate: f.endDate || undefined,
          timeFrom: f.hasHours ? f.startTime || undefined : undefined,
          timeTo: f.hasHours ? f.endTime || undefined : undefined,
          recurring: f.recurring ? true : undefined,
          days: f.recurring ? f.days : undefined,
        };
  };

  const [confirm, setConfirm] = useState(false);
  const publish = () => setConfirm(true);
  const doPublish = () => {
    setConfirm(false);
    const off = buildOffer();
    if (editingId) updateOwnerOffer(off); else addOwnerOffer(off);
    showToast(editingId ? 'Zapisano zmiany' : isBon ? 'Oferta opublikowana' : 'Promocja opublikowana', '🎉');
    close();
  };

  return (
    <div className="mt-2">
      <ConfirmDialog
        open={confirm}
        title={editingId ? 'Zapisać zmiany?' : isBon ? 'Opublikować ofertę Lokalio?' : 'Opublikować promocję?'}
        message={editingId ? 'Zmiany od razu zobaczą użytkownicy aplikacji.' : `${isBon ? 'Oferta' : 'Promocja'} pojawi się w aplikacji dla użytkowników.`}
        confirmLabel={editingId ? 'Zapisz' : 'Tak, opublikuj'}
        onConfirm={doPublish}
        onCancel={() => setConfirm(false)}
      />
      {isBon && !open && (
        <div className="mb-3 rounded-card border border-success/25 bg-success/8 p-3.5">
          <p className="text-[12.5px] text-ink/75"><span className="font-bold text-ink">Oferty tylko w aplikacji.</span> Odblokowują się <span className="font-semibold">za zameldowanie w lokalu</span> albo są dostępne <span className="font-semibold">tylko dla obserwujących</span>. Realizacja jak zwykle: klient pokazuje aktywną ofertę, naciskasz „Zrealizowane" — znika i nie da się jej użyć ponownie.</p>
        </div>
      )}

      {!open && (
        <button onClick={startAdd} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3 text-[14.5px] font-bold text-white shadow-coral active:scale-[0.98]">
          <Plus size={18} /> Dodaj {noun}
        </button>
      )}

      {open && (
        <div className="mb-4 space-y-3.5 rounded-card bg-paper p-3.5 shadow-card">
          <p className="text-[15px] font-extrabold text-ink">{editingId ? `Edytuj ${noun}` : isBon ? 'Nowa oferta Lokalio' : 'Nowa promocja'}</p>
          {preview ? (
            <OfferPreviewScreen off={buildOffer()} isBon={isBon} venue={venue} />
          ) : (
          <>
          <PhotoPicker value={f.photo} onChange={(v) => set('photo', v)} category={venue.category} seed={venue.id + kind} label="Zdjęcie" />

          {isBon && (
            <div>
                <p className="text-[13px] font-bold text-ink/70">Dla kogo ta oferta? <span className="font-medium text-ink/40">(opcjonalnie)</span></p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {([['reqCheckin', '📍 Za meldunek', 'Po zameldowaniu w lokalu (GPS)'], ['reqFollow', '❤️ Dla obserwujących', 'Tylko dla obserwujących lokal']] as const).map(([k, lbl, hint]) => {
                    const on = f[k];
                    return (
                      <button key={k} type="button" onClick={() => set(k, !on)} className={cx('rounded-xl border px-3 py-2.5 text-left active:scale-[0.98]', on ? 'border-coral bg-coral/8' : 'border-black/10 bg-paper')}>
                        <span className={cx('flex items-center gap-1.5 text-[13px] font-bold', on ? 'text-coral' : 'text-ink')}>
                          <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border', on ? 'border-coral bg-coral text-white' : 'border-black/20')}>{on ? <Check size={11} /> : null}</span>
                          {lbl}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] leading-tight text-ink/45">{hint}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11.5px] leading-snug text-ink/55">
                  {!f.reqCheckin && !f.reqFollow
                    ? 'Bez zaznaczenia — zwykła oferta dostępna dla zalogowanych w aplikacji.'
                    : f.reqFollow && !f.reqCheckin
                      ? 'Nagradzasz obserwujących, nie sam akt obserwowania. Publikuj takie oferty co jakiś czas (np. raz w miesiącu).'
                      : f.reqCheckin && f.reqFollow
                        ? 'Trzeba obserwować lokal i być w nim zameldowanym (GPS).'
                        : 'Meldunek wymaga włączonego GPS i bycia w lokalu — z domu nie da się odblokować.'}
                </p>
            </div>
          )}

          <SectionTitle>Podstawowe informacje</SectionTitle>
          <ReqField label={isBon ? 'Nazwa oferty' : 'Nazwa promocji'}><input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder={isBon ? 'np. -15% na dania główne' : 'np. Happy Hours -20%'} className={inputCls} /></ReqField>
              <Field label="Kategoria">
                <CategorySelect value={f.category} onChange={(v) => set('category', v)} groups={OFFER_GROUPS} />
              </Field>
              <div>
                <p className="text-[13px] font-bold text-ink/70">Rodzaj oferty <span className="text-coral">*</span></p>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {([['percent', 'Rabat procentowy', 'np. -20%'], ['amount', 'Rabat kwotowy', 'np. -10 zł'], ['price', 'Oferta cenowa', 'np. zestaw 25 zł']] as const).map(([k, lbl, hint]) => (
                    <button key={k} onClick={() => set('valueType', k)} className={cx('rounded-xl border px-2.5 py-2.5 text-left active:scale-[0.98]', f.valueType === k ? 'border-coral bg-coral/8' : 'border-black/10 bg-paper')}>
                      <span className={cx('block text-[12.5px] font-bold leading-tight', f.valueType === k ? 'text-coral' : 'text-ink')}>{lbl}</span>
                      <span className="mt-0.5 block text-[10.5px] leading-tight text-ink/45">{hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <ReqField label={f.valueType === 'price' ? 'Cena oferty' : 'Wartość rabatu'}>
                <div className="relative">
                  <input value={f.value} onChange={(e) => set('value', e.target.value.replace(/[^\d.]/g, ''))} inputMode="numeric" className={`${inputCls} pr-10`} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-ink/40">{f.valueType === 'percent' ? '%' : 'zł'}</span>
                </div>
              </ReqField>
              <ReqField label={isBon ? 'Opis oferty' : 'Opis promocji'}>
                <textarea value={f.desc} onChange={(e) => set('desc', e.target.value.slice(0, 500))} rows={3} maxLength={500} placeholder={isBon ? 'Opisz, do czego uprawnia oferta…' : 'Opisz szczegóły promocji…'} className={inputCls} />
                <p className="mt-1 text-right text-[11px] text-ink/40">{f.desc.length}/500</p>
              </ReqField>

              <SectionTitle>Okres ważności</SectionTitle>
              <div className="flex gap-3">
                <ReqField label="Data rozpoczęcia" className="flex-1"><input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} /></ReqField>
                <ReqField label="Data zakończenia" className="flex-1"><input type="date" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} /></ReqField>
              </div>
              <div>
                <label className="flex items-center gap-2 text-[13.5px] font-medium text-ink/80">
                  <input type="checkbox" checked={f.hasHours} onChange={(e) => set('hasHours', e.target.checked)} className="h-4 w-4 accent-coral" /> Określ godziny obowiązywania
                </label>
                {f.hasHours && (
                  <div className="mt-2 flex gap-3">
                    <Field label="Godzina rozpoczęcia" className="flex-1"><input type="time" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} className={inputCls} /></Field>
                    <Field label="Godzina zakończenia" className="flex-1"><input type="time" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} className={inputCls} /></Field>
                  </div>
                )}
              </div>

              {!f.reqFollow && (
                <div>
                  <label className="flex items-center gap-2 text-[13.5px] font-medium text-ink/80">
                    <input type="checkbox" checked={f.recurring} onChange={(e) => set('recurring', e.target.checked)} className="h-4 w-4 accent-coral" /> Oferta cykliczna (powtarza się w wybrane dni)
                  </label>
                  {f.recurring && (
                    <div className="mt-2"><DayPicker value={f.days} onChange={(d) => set('days', d)} /></div>
                  )}
                </div>
              )}

          {isBon && (
            <>
              <SectionTitle>Ustawienia oferty</SectionTitle>
              <div className="flex gap-3">
                <Field label="Limit pobrań" className="flex-1">
                  <input value={f.quantity} onChange={(e) => set('quantity', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="bez limitu" className={inputCls} />
                  <p className="mt-1 text-[11px] text-ink/40">{f.quantity ? `pozostało: ${f.quantity}` : 'puste = bez limitu'}</p>
                </Field>
                <Field label="Limit użyć na osobę" className="flex-1">
                  <select value={f.perPerson} onChange={(e) => set('perPerson', e.target.value)} className={inputCls}>
                    <option value="0">Bez limitu</option>
                    <option value="1">1 raz</option>
                    <option value="2">2 razy</option>
                    <option value="3">3 razy</option>
                  </select>
                </Field>
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-[13.5px] font-medium text-ink/80">
            <input type="checkbox" checked={f.adult} onChange={(e) => set('adult', e.target.checked)} className="h-4 w-4 accent-coral" /> Tylko dla pełnoletnich (18+)
          </label>
          </>
          )}
          {preview ? (
            <div className="flex gap-2">
              <button onClick={() => setPreview(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-black/5 py-3 text-[14px] font-bold text-ink/60 active:scale-[0.98]"><Pencil size={15} /> Wróć do edycji</button>
              <button onClick={publish} className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-coral py-3 text-[14px] font-bold text-white shadow-coral active:scale-[0.98]"><Sparkles size={16} /> {editingId ? 'Zapisz' : 'Opublikuj'}</button>
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={() => setPreview(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-coral/30 bg-coral/5 py-2.5 text-[13.5px] font-bold text-coral active:scale-[0.98]"><Eye size={16} /> Podgląd przed publikacją</button>
              <div className="flex gap-2">
                <button onClick={close} className="flex-1 rounded-2xl bg-black/5 py-3 text-[14px] font-bold text-ink/60 active:scale-[0.98]">Anuluj</button>
                <button onClick={publish} className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-coral py-3 text-[14px] font-bold text-white shadow-coral active:scale-[0.98]"><Sparkles size={16} /> {editingId ? 'Zapisz' : 'Opublikuj'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {!open && (list.length ? (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Aktywne{activeList.length ? ` · ${activeList.length}` : ''}</p>
            {activeList.length ? (
              <div className="space-y-2">
                {activeList.map((o) => <OfferRow key={o.id} offer={o} editable={isOwn(o.id)} onOpen={() => onOpenDetail(o.id)} onEdit={() => startEdit(o)} onDelete={() => removeOwnerOffer(o.id)} />)}
              </div>
            ) : (
              <p className="rounded-card bg-paper px-3.5 py-3 text-[12.5px] text-subtle shadow-card">Brak aktywnych {isBon ? 'ofert' : 'promocji'}.</p>
            )}
          </div>
          {endedList.length > 0 && (
            <div>
              <p className="mb-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Zakończone · {endedList.length}</p>
              <div className="space-y-2">
                {endedList.map((o) => <OfferRow key={o.id} offer={o} editable={isOwn(o.id)} onOpen={() => onOpenDetail(o.id)} onEdit={() => startEdit(o)} onDelete={() => removeOwnerOffer(o.id)} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyHint emoji={isBon ? '🎁' : '🏷️'} text={`Nie masz jeszcze ${isBon ? 'żadnych ofert Lokalio' : 'żadnych promocji'}. Dodaj pierwszą — pojawi się w aplikacji od razu.`} />
      ))}
    </div>
  );
}

function OfferRow({ offer, editable, onOpen, onEdit, onDelete }: { offer: Offer; editable: boolean; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  const ended = offer.ended === true;
  return (
    <div className={cx('flex items-center gap-3 rounded-card bg-paper p-3 shadow-card', ended && 'opacity-65')}>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80">
        {offer.photo
          ? <img src={offer.photo} alt="" className={cx('h-11 w-12 shrink-0 rounded-xl object-cover', ended && 'grayscale')} />
          : <span className="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl px-0.5 text-center text-[11px] font-extrabold leading-none text-white" style={{ background: offer.color }}>{offer.discountLabel.slice(0, 6)}</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold text-ink">{offer.title}</p>
          {ended ? (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-ink/10 px-1.5 py-0.5 text-[10px] font-bold text-ink/55">Zakończona</span>
          ) : (offer.requireCheckin || offer.requireFollow) && (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-coral/10 px-1.5 py-0.5 text-[10px] font-bold text-coral">{[offer.requireCheckin && '📍 Meldunek', offer.requireFollow && '❤️ Obserwujący'].filter(Boolean).join(' + ')}</span>
          )}
          <p className="flex items-center gap-1 text-[11.5px] text-subtle"><Clock size={11} /> {offer.validLabel}{offer.quantity != null ? ` · ${offer.quantity} szt.` : ''}</p>
        </div>
      </button>
      {editable && (
        <div className="flex shrink-0 items-center gap-1">
          {!ended && <button onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink/50 active:scale-90"><Pencil size={14} /></button>}
          {ended && <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink/40 active:scale-90"><Trash2 size={14} /></button>}
        </div>
      )}
    </div>
  );
}

// Podgląd przed publikacją — renderuje prawdziwy ekran promocji (OfferDetailContent) + replikę przycisku.
function OfferPreviewScreen({ off, isBon, venue }: { off: Offer; isBon: boolean; venue: Venue }) {
  const cta = off.requireCheckin
    ? { t: 'Zamelduj się, aby odblokować', s: 'Wymaga meldunku w lokalu (GPS)', c: 'bg-success', i: <Lock size={18} /> }
    : off.requireFollow
      ? { t: 'Obserwuj, by odblokować', s: 'Oferta tylko dla obserwujących lokal', c: 'bg-[#F0457E]', i: <Lock size={18} /> }
      : { t: `Aktywuj ${isBon ? 'ofertę' : 'promocję'}`, s: 'Pokaż telefon przy kasie', c: 'bg-coral', i: <Ticket size={18} /> };
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink/50"><Eye size={13} /> Podgląd — tak zobaczą to klienci w aplikacji</p>
      <div className="overflow-hidden rounded-card border border-black/10 shadow-card">
        <div className="max-h-[440px] overflow-y-auto no-scrollbar">
          <OfferDetailContent offer={off} venue={venue} preview />
        </div>
        <div className="border-t border-black/5 bg-paper px-4 py-3">
          <div className={cx('flex w-full items-center justify-center gap-2.5 rounded-2xl py-3 font-extrabold text-white', cta.c)}>
            {cta.i}
            <div className="text-center leading-tight">
              <p className="text-[15px]">{cta.t}</p>
              <p className="text-[11px] font-medium text-white/85">{cta.s}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Wydarzenia — dzień + godziny od–do, zdjęcie, edycja
interface EventForm {
  photo?: string; title: string; eventCat: string; startDate: string; startTime: string; endDate: string; endTime: string; free: boolean; price: string; desc: string;
  customLocation: boolean; addr: AddrFields; coords?: LatLng; eventUrl: string; ticketUrl: string;
  seoTitle: string; seoDescription: string; seoKeywords: string; seoIndex: boolean;
}
function emptyEvent(): EventForm {
  return {
    photo: undefined, title: '', eventCat: DEFAULT_EVENT_CAT, startDate: todayISODate(), startTime: '18:00', endDate: todayISODate(), endTime: '21:00', free: true, price: '20 zł', desc: '',
    customLocation: false, addr: emptyAddr(), eventUrl: '', ticketUrl: '',
    seoTitle: '', seoDescription: '', seoKeywords: '', seoIndex: true,
  };
}
function formFromEvent(e: EventItem, venueName: string): EventForm {
  const sd = e.dateIso.slice(0, 10);
  return {
    photo: e.photo, title: e.title, eventCat: e.eventCategory ?? DEFAULT_EVENT_CAT,
    startDate: sd, startTime: e.dateIso.slice(11, 16) || '18:00',
    endDate: e.endIso ? e.endIso.slice(0, 10) : sd, endTime: e.endIso ? e.endIso.slice(11, 16) : '21:00',
    free: e.free, price: e.priceLabel, desc: e.description,
    customLocation: e.place !== venueName, addr: e.place !== venueName ? eventAddr(e) : emptyAddr(), coords: e.place !== venueName ? e.coords : undefined,
    eventUrl: e.eventUrl ?? '', ticketUrl: e.ticketUrl ?? '',
    seoTitle: e.seoTitle ?? '', seoDescription: e.seoDescription ?? '', seoKeywords: e.seoKeywords ?? '', seoIndex: e.seoIndex !== false,
  };
}

// Podgląd wydarzenia przed publikacją — renderuje prawdziwy ekran wydarzenia (EventDetailContent) + replikę przycisku.
export function EventPreviewScreen({ ev }: { ev: EventItem }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink/50"><Eye size={13} /> Podgląd — tak zobaczą to klienci w aplikacji</p>
      <div className="overflow-hidden rounded-card border border-black/10 shadow-card">
        <div className="max-h-[440px] overflow-y-auto no-scrollbar">
          <EventDetailContent event={ev} preview />
        </div>
        <div className="border-t border-black/5 bg-paper px-4 py-3">
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coral py-3 text-[14px] font-bold text-white"><Users size={17} /> Wezmę udział</div>
        </div>
      </div>
    </div>
  );
}

function EventsView({ venue, onOpenDetail, backRef, initialDraft, onDraftConsumed }: { venue: Venue; onOpenDetail: (id: string) => void; backRef?: React.MutableRefObject<null | (() => boolean)>; initialDraft?: Partial<EventForm>; onDraftConsumed?: () => void }) {
  const { ownerEvents, addOwnerEvent, updateOwnerEvent, removeOwnerEvent, showToast } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<EventForm>(() => emptyEvent());
  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setF((s) => ({ ...s, [k]: v }));

  // Szkic z Doradcy AI → otwórz formularz wydarzenia wstępnie wypełniony (jednorazowo).
  const draftDone = useRef(false);
  useEffect(() => {
    if (!initialDraft || draftDone.current) return;
    draftDone.current = true;
    setEditingId(null);
    setF({ ...emptyEvent(), ...initialDraft });
    setPreview(false);
    setOpen(true);
    onDraftConsumed?.();
  }, [initialDraft, onDraftConsumed]);

  const list = useMemo(() => ownerEvents.filter((e) => e.venueId === venue.id), [ownerEvents, venue.id]);
  const activeList = useMemo(() => list.filter((e) => !e.ended), [list]);
  const endedList = useMemo(() => list.filter((e) => e.ended), [list]);
  const startAdd = () => { setEditingId(null); setF(emptyEvent()); setPreview(false); setOpen(true); };
  const startEdit = (e: EventItem) => { setEditingId(e.id); setF(formFromEvent(e, venue.name)); setPreview(false); setOpen(true); };
  const close = () => { setOpen(false); setEditingId(null); setPreview(false); };

  // Przejmij przycisk „wstecz": z podglądu wróć do edycji, z edycji zamknij formularz.
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
      organizerId: venue.organizerId ?? venue.id,
      venueId: venue.id,
      place: f.customLocation ? (joinAddr(f.addr) || 'Inna lokalizacja') : venue.name,
      ...(f.customLocation ? addrToEvent(f.addr) : {}),
      coords: coordsOverride ?? venue.coords,
      dateIso: `${f.startDate}T${f.startTime || '18:00'}`,
      endIso: f.endTime ? `${f.endDate || f.startDate}T${f.endTime}` : undefined,
      free: f.free,
      priceLabel: f.free ? 'Wstęp wolny' : f.price,
      description: f.desc || 'Wydarzenie dodane w panelu firmowym.',
      emoji: venue.emoji,
      gradient: [meta.color, meta.color],
      tags: ['Nowość'],
      source: 'lokal',
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
  const publish = () => setConfirm(true);
  const doPublish = async () => {
    setConfirm(false);
    if (saving) return;
    setSaving(true);
    // Pinezka: gdy właściciel zatwierdził/przeciągnął ją na mapie — użyj jej. Inaczej geokoduj adres.
    let coords = f.coords;
    if (!coords && f.customLocation) {
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
            ) : e.eventCategory && <p className="mt-0.5 text-[11px] font-semibold text-coral">{e.eventCategory}</p>}
            <p className="flex items-center gap-1 text-[11.5px] text-subtle"><CalendarDays size={11} /> {e.dateIso.slice(8, 10)}.{e.dateIso.slice(5, 7)} {e.dateIso.slice(11, 16)}{e.endIso ? `–${e.endIso.slice(11, 16)}` : ''} · {e.free ? 'Wstęp wolny' : e.priceLabel}</p>
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
          <PhotoPicker value={f.photo} onChange={(v) => set('photo', v)} category={eventMainCat(f.eventCat)} seed={venue.id + 'event'} label="Zdjęcie" />
          <Field label="Nazwa wydarzenia"><input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="np. Koncert na żywo" className={inputCls} /></Field>
          <Field label="Kategoria"><CategorySelect value={f.eventCat} onChange={(v) => set('eventCat', v)} groups={EVENT_GROUPS} /></Field>
          <div className="flex gap-3">
            <ReqField label="Data rozpoczęcia" className="flex-1"><input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} /></ReqField>
            <Field label="Godz. rozpoczęcia" className="flex-1"><input type="time" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="flex gap-3">
            <ReqField label="Data zakończenia" className="flex-1"><input type="date" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} /></ReqField>
            <Field label="Godz. zakończenia" className="flex-1"><input type="time" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} className={inputCls} /></Field>
          </div>

          <div>
            <p className="text-[13px] font-bold text-ink/70">Lokalizacja wydarzenia</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {([[false, 'W moim lokalu'], [true, 'W innej lokalizacji']] as const).map(([v, lbl]) => (
                <button key={lbl} onClick={() => set('customLocation', v)} className={cx('rounded-xl py-2 text-[12.5px] font-bold active:scale-95', f.customLocation === v ? 'bg-coral text-white' : 'bg-black/5 text-ink/55')}>{lbl}</button>
              ))}
            </div>
            {f.customLocation ? (
              <div className="mt-2 space-y-3">
                <p className="flex items-center gap-1 text-[11.5px] text-subtle"><MapPin size={11} /> Podaj adres miejsca wydarzenia — tak samo jak adres lokalu.</p>
                <AddressBlock v={f.addr} onChange={(p) => setF((s) => ({ ...s, addr: { ...s.addr, ...p }, coords: undefined }))} />
                <LocationMap addr={f.addr} coords={f.coords} onChange={(c) => set('coords', c)} />
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-3 rounded-card bg-black/[0.03] p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral"><MapPin size={16} /></span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-ink">{venue.name}</p>
                  <p className="truncate text-[11.5px] text-subtle">{venue.address}, {venue.district}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[13.5px] font-medium text-ink/80">
              <input type="checkbox" checked={f.free} onChange={(e) => set('free', e.target.checked)} className="h-4 w-4 accent-coral" /> Wstęp wolny
            </label>
            {!f.free && <input value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="np. 30 zł" className="flex-1 rounded-xl border border-black/10 bg-paper px-3 py-2 text-[14px] outline-none focus:border-coral" />}
          </div>
          <Field label="Opis"><textarea value={f.desc} onChange={(e) => set('desc', e.target.value)} rows={2} placeholder="Krótki opis…" className={inputCls} /></Field>
          <SectionTitle>Linki (opcjonalne)</SectionTitle>
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
              <button onClick={publish} className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-coral py-3 text-[14px] font-bold text-white shadow-coral active:scale-[0.98]"><Sparkles size={16} /> {editingId ? 'Zapisz' : 'Opublikuj'}</button>
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={() => setPreview(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-coral/30 bg-coral/5 py-2.5 text-[13.5px] font-bold text-coral active:scale-[0.98]"><Eye size={16} /> Podgląd przed publikacją</button>
              <div className="flex gap-2">
                <button onClick={close} className="flex-1 rounded-2xl bg-black/5 py-3 text-[14px] font-bold text-ink/60 active:scale-[0.98]">Anuluj</button>
                <button onClick={publish} className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-coral py-3 text-[14px] font-bold text-white shadow-coral active:scale-[0.98]"><Sparkles size={16} /> {editingId ? 'Zapisz' : 'Opublikuj'}</button>
              </div>
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
        <EmptyHint emoji="📅" text="Brak wydarzeń w tym lokalu. Dodaj pierwsze — pojawi się w aplikacji." />
      ))}
    </div>
  );
}

// ============================================================
// Galeria — max 5 zdjęć
function GalleryView({ venue, onCancel }: { venue: Venue; onCancel: () => void }) {
  const { updateOwnerVenue, showToast } = useApp();
  const MAX = 5;
  const [photos, setPhotos] = useState<string[]>(() => venue.gallery?.length ? [...venue.gallery] : [0, 1, 2].map((i) => photoUrl(venue.category, venue.id + '-g' + i, 400, 400)));
  const save = () => { updateOwnerVenue({ ...venue, gallery: photos }); showToast('Zapisano galerię', '✅'); };
  return (
    <div className="mt-2">
      <p className="mb-3 text-[12.5px] text-subtle">Maksymalnie {MAX} zdjęć. Pierwsze widać jako główne w aplikacji. <span className="font-bold text-ink/60">{photos.length}/{MAX}</span></p>
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

// ============================================================
// Statystyki — bez ocen i opinii
function StatsView({ venue }: { venue: Venue }) {
  const s = venueStats(venue);
  const maxDay = Math.max(1, ...s.byDay.map((d) => d.value));
  const maxHour = Math.max(1, ...s.byHour.map((h) => h.value));
  const up = s.trend7dPct >= 0;
  // Najczęstsza grupa wiekowa gości — pokazujemy ją od razu pod liczbami.
  const ageGroups = [
    { label: '18–25 lat', pct: s.age.y18_25 },
    { label: '26–35 lat', pct: s.age.y26_35 },
    { label: '36+ lat', pct: s.age.y36p },
  ];
  const domAge = ageGroups.reduce((a, b) => (b.pct > a.pct ? b : a));

  return (
    <div className="mt-2 space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile icon={Eye} tint="#FF5A4D" value={s.views7d.toLocaleString('pl-PL')} label="Wyświetlenia (7 dni)" delta={`${up ? '+' : ''}${s.trend7dPct}%`} />
        <StatTile icon={MapPin} tint="#3FAE83" value={`${s.checkinsToday}`} label="Meldunki dzisiaj" delta="+12%" />
        <StatTile icon={Ticket} tint="#E0892B" value={`${s.usedOffers7d}`} label="Wykorzystane oferty (7 dni)" delta="+8%" />
        <StatTile icon={Users} tint="#7A5C99" value={`+${s.newFollowers7d}`} label="Nowi obserwujący (7 dni)" delta="+6%" />
      </div>

      {/* Wiek i płeć gości — od razu pod liczbami widać, kto się melduje */}
      <div className="rounded-card bg-paper p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[14px] font-bold text-ink">Kto się melduje (anonimowo)</p>
          <span className="shrink-0 rounded-full bg-coral/10 px-2.5 py-1 text-[11.5px] font-bold text-coral">najczęściej {domAge.label}</span>
        </div>
        <div className="space-y-1.5">
          <AgeBar label="18–25" pct={s.age.y18_25} />
          <AgeBar label="26–35" pct={s.age.y26_35} />
          <AgeBar label="36+" pct={s.age.y36p} />
        </div>
        <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full">
          <div className="h-full bg-coral" style={{ width: `${s.gender.k}%` }} />
          <div className="h-full bg-info" style={{ width: `${s.gender.m}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11.5px] font-semibold">
          <span className="text-coral">♀ {s.gender.k}%</span>
          <span className="text-info">{s.gender.m}% ♂</span>
        </div>
      </div>

      {/* Ruch w tygodniu — z danych dziennych */}
      <div className="rounded-card bg-paper p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold text-ink">Ruch w tygodniu</p>
          <span className={cx('text-[12px] font-bold', up ? 'text-success' : 'text-coral')}>{up ? '↑' : '↓'} {Math.abs(s.trend7dPct)}% vs poprz.</span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-1.5" style={{ height: 84 }}>
          {s.byDay.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className={cx('w-full rounded-t-md', i === s.busiestDay ? 'bg-coral' : i === s.slowestDay ? 'bg-coral/25' : 'bg-coral/55')} style={{ height: `${Math.max(6, (d.value / maxDay) * 64)}px` }} />
              <span className="text-[10px] font-semibold text-ink/45">{d.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-subtle">Najlepszy dzień: <span className="font-bold text-ink/70">{s.busiestDayLabel}</span> · najsłabszy: <span className="font-bold text-coral">{s.slowestDayLabel}</span></p>
      </div>

      {/* Ruch w ciągu dnia — krzywa godzinowa */}
      <div className="rounded-card bg-paper p-4 shadow-card">
        <p className="mb-2 text-[14px] font-bold text-ink">Ruch w ciągu dnia</p>
        <div className="flex items-end justify-between gap-0.5" style={{ height: 64 }}>
          {s.byHour.map((h) => (
            <div key={h.hour} className={cx('flex-1 rounded-t-sm', h.hour === s.peakHour ? 'bg-info' : 'bg-info/40')} style={{ height: `${Math.max(4, (h.value / maxHour) * 54)}px` }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] font-semibold text-ink/40"><span>10:00</span><span className="text-info">szczyt {s.peakHour}:00</span><span>23:00</span></div>
      </div>

      <p className="text-center text-[11.5px] text-subtle">{s.peakLabel}</p>
    </div>
  );
}

export function StatTile({ icon: Icon, tint, value, label, delta }: { icon: typeof Eye; tint: string; value: string; label: string; delta: string }) {
  return (
    <div className="rounded-card bg-paper p-3.5 shadow-card">
      <div className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: tint + '1a', color: tint }}><Icon size={18} /></span>
        <span className="text-[11.5px] font-bold text-success">↑ {delta}</span>
      </div>
      <p className="mt-2.5 text-[22px] font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[11.5px] text-subtle">{label}</p>
    </div>
  );
}

export function WeekChart({ seed }: { seed: number }) {
  const days = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  const vals = days.map((_, i) => 40 + ((seed >> i) % 7) * 9 + i * 5);
  const max = Math.max(...vals);
  return (
    <div>
      <div className="flex h-28 items-end gap-2">
        {vals.map((v, i) => (
          <div key={i} className="flex-1 rounded-t-md bg-coral/80" style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        {days.map((d, i) => <span key={i} className="flex-1 text-center text-[10px] font-semibold text-ink/45">{d}</span>)}
      </div>
    </div>
  );
}

function AgeBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[11.5px] font-semibold text-ink/60">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/[0.08]">
        <div className="h-full rounded-full bg-ink/70" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[11.5px] font-semibold tabular-nums text-ink/60">{pct}%</span>
    </div>
  );
}

// ============================================================
// Wspólne kontrolki
const PICKER_CATS: CategoryKey[] = ['gastro', 'party', 'culture', 'concert', 'social'];
export function PhotoPicker({ value, onChange, category, seed, label }: { value?: string; onChange: (url?: string) => void; category: CategoryKey; seed: string; label: string }) {
  const [open, setOpen] = useState(false);
  // Różnorodne miniatury — własna kategoria + kilka innych, każda z innym ziarnem (unikalne URL-e).
  const cats = [category, ...PICKER_CATS.filter((c) => c !== category)].slice(0, 5);
  const options = cats.map((c, i) => `${photoUrl(c, seed + '-pp' + i, 300, 300)}&v=${i}`);
  return (
    <div>
      <p className="text-[13px] font-bold text-ink/70">{label}</p>
      {value ? (
        <div className="relative mt-1.5 h-28 overflow-hidden rounded-xl">
          <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <button onClick={() => onChange(undefined)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white active:scale-90"><X size={14} /></button>
          <button onClick={() => setOpen((o) => !o)} className="absolute bottom-2 right-2 rounded-full bg-paper/90 px-2.5 py-1 text-[11.5px] font-bold text-ink active:scale-95">Zmień</button>
        </div>
      ) : (
        <button onClick={() => setOpen((o) => !o)} className="mt-1.5 flex h-20 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-black/15 text-ink/40 active:scale-[0.99]">
          <ImagePlus size={20} /><span className="text-[11.5px] font-bold">Dodaj zdjęcie</span>
        </button>
      )}
      {open && (
        <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <label className="flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-coral/40 bg-coral/5 text-coral active:scale-95">
            <Upload size={16} />
            <span className="text-[8px] font-bold leading-tight">Z urządzenia</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFileAsDataURL(f, (url) => { onChange(url); setOpen(false); }); e.target.value = ''; }} />
          </label>
          {options.map((src, i) => (
            <button key={i} onClick={() => { onChange(src); setOpen(false); }} className={cx('h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-2', value === src ? 'ring-coral' : 'ring-transparent')}>
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DayPicker({ value, onChange }: { value: number[]; onChange: (d: number[]) => void }) {
  const toggle = (i: number) => onChange(value.includes(i) ? value.filter((x) => x !== i) : [...value, i].sort((a, b) => a - b));
  return (
    <div className="flex gap-1.5">
      {DAYS.map((d, i) => (
        <button key={d} onClick={() => toggle(i)} className={cx('flex-1 rounded-lg py-2 text-[12px] font-bold active:scale-95', value.includes(i) ? 'bg-coral text-white' : 'bg-black/5 text-ink/55')}>{d}</button>
      ))}
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-[13px] font-bold text-ink/70">{label}</label>
      {children}
    </div>
  );
}

function ReqField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-[13px] font-bold text-ink/70">{label} <span className="text-coral">*</span></label>
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="pt-1 text-[12px] font-extrabold uppercase tracking-wide text-ink/45">{children}</p>;
}

export interface SeoValues { seoTitle?: string; seoDescription?: string; seoKeywords?: string; seoIndex?: boolean; }
export function EventSeoSection({ seoTitle, seoDescription, seoKeywords, seoIndex, onSeo }: SeoValues & { onSeo: (patch: SeoValues) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-card border border-black/10">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3.5 py-3 active:bg-black/[0.02]">
        <span className="flex items-center gap-2 text-[13.5px] font-bold text-ink"><Search size={15} className="text-ink/45" /> Ustawienia SEO</span>
        <ChevronDown size={18} className={cx('text-ink/40 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-black/5 p-3.5">
          <p className="text-[11.5px] leading-snug text-subtle">Jak wydarzenie wygląda w Google i przy udostępnianiu. Puste pola = nazwa i opis wydarzenia.</p>
          <Field label="Tytuł SEO"><input value={seoTitle ?? ''} onChange={(e) => onSeo({ seoTitle: e.target.value })} placeholder="Domyślnie: nazwa wydarzenia" className={inputCls} /></Field>
          <Field label="Opis SEO"><textarea value={seoDescription ?? ''} onChange={(e) => onSeo({ seoDescription: e.target.value })} rows={2} placeholder="Domyślnie: opis wydarzenia" className={inputCls} /></Field>
          <Field label="Słowa kluczowe"><input value={seoKeywords ?? ''} onChange={(e) => onSeo({ seoKeywords: e.target.value })} placeholder="koncert, jazz, Sandomierz…" className={inputCls} /></Field>
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink/80">Zezwól na indeksowanie</p>
              <p className="text-[11.5px] text-subtle">Pokazuj wydarzenie w wyszukiwarkach.</p>
            </div>
            <button onClick={() => onSeo({ seoIndex: !seoIndex })} className={cx('relative h-6 w-11 shrink-0 rounded-full transition', seoIndex !== false ? 'bg-coral' : 'bg-black/15')}>
              <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', seoIndex !== false ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CategorySelect({ value, onChange, groups }: { value: string; onChange: (v: string) => void; groups: { emoji: string; label: string; items: string[] }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {groups.map((g) => (
        <optgroup key={g.label} label={`${g.emoji} ${g.label}`}>
          {g.items.map((it) => <option key={it} value={it}>{it}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export function EmptyHint({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="mt-2 flex flex-col items-center gap-2 rounded-card bg-paper p-6 text-center shadow-card">
      <span className="text-3xl">{emoji}</span>
      <p className="max-w-[260px] text-[12.5px] text-subtle">{text}</p>
    </div>
  );
}
