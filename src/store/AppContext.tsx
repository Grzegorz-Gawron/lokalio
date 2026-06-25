import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  ActiveVoucher,
  CategoryKey,
  EventItem,
  Gender,
  LatLng,
  MapFocus,
  Offer,
  OrgProfile,
  User,
  Venue,
} from '../types';
import type { AccountType, OrganizerCategoryKey } from '../lib/business';
import { EVENTS, OFFERS, eventsForCity, offersForCity, venuesForCity, makeDefaultUser, venueById, offerById, registerLiveData, registerOwnerVenues, registerOwnerOffers, registerOwnerEvents, registerPublishedEvents, publishedEventsForCity, activeVenues, DEMO_NEARBY_EVENT, makeDemoNearbyEvent, registerDemoEvents, type LiveData } from '../data/seed';
import { loadPublishedEvents } from '../lib/published';
import { track, identifyUser, resetAnalytics } from '../lib/analytics';
import { snapRadius, DEFAULT_RADIUS_KM } from '../lib/geo';
import { CITIES, DEFAULT_CITY_ID, cityById, cityIdOf, nearestCity, type City } from '../data/cities';
import { loadLivePlaces } from '../lib/places';
import { buildNotifications, NOTIF_SEEN_KEY, type NotifItem } from '../lib/notifications';
import {
  authEnabled, getSessionInfo, onAuthChange, signInWithEmail, signInWithPassword, signUpWithPassword, signInWithProvider, signOut, upsertProfile, updatePoints, loadProfile,
  dbCheckin, dbActivateVoucher, dbSetVoucherStatus, dbSetSave, dbSetFollow, dbSetFriend,
  dbLoadOwnerContent, dbUpsertOwner, dbDeleteOwner,
  type SessionInfo,
} from '../lib/backend';

export type Tab = 'home' | 'map' | 'agent' | 'vouchers' | 'profile';
export type RouteName =
  | 'event'
  | 'venue'
  | 'organizer'
  | 'owner'
  | 'saved'
  | 'friends'
  | 'checkins'
  | 'follows'
  | 'savedEvents'
  | 'savedOffers'
  | 'voucher-active'
  | 'offer'
  | 'editProfile'
  | 'notifications'
  | 'search';
export interface Route {
  name: RouteName;
  id?: string;
}
export type When = 'today' | 'week' | 'all';

export interface Filters {
  category: CategoryKey | 'all';
  when: When;
  query: string;
  freeOnly: boolean;
}

interface Stats {
  checkins: number;
  vouchersUsed: number;
}

/** Pojedynczy wpis historii meldowania (do listy „Meldunki"). */
export interface CheckinEntry {
  venueId: string;
  at: number; // ms epoch
}

interface Toast {
  id: number;
  text: string;
  emoji?: string;
}

interface OwnerBusiness {
  name: string;
  email: string;
  accountType?: AccountType; // 'lokal' | 'organizer'
  organizerCategory?: OrganizerCategoryKey; // tylko dla organizatora
  singleLocation?: boolean; // organizator: czy wydarzenia w jednej lokalizacji?
  profile?: OrgProfile; // zapisany profil organizatora
}

interface OnboardData {
  name: string;
  age: number;
  gender: Gender;
  cityId: string;
  district: string;
  coords: LatLng;
  preferredCategories: CategoryKey[];
}

interface Ctx {
  user: User | null;
  onboarded: boolean;
  tab: Tab;
  route: Route | null;
  filters: Filters;
  activeVouchers: ActiveVoucher[];
  redeemedOfferIds: string[];
  toast: Toast | null;
  events: EventItem[];
  ownerEvents: EventItem[];
  offers: Offer[];
  ownerOffers: Offer[];
  venues: Venue[];
  currentCity: City;
  points: number;
  stats: Stats;
  checkinHistory: CheckinEntry[];
  locating: boolean;
  ownerLoggedIn: boolean;
  ownerBusiness: OwnerBusiness | null;
  ownerVenues: Venue[];
  ownerVenueIds: string[];
  shareTitle: string | null;
  authEnabled: boolean;
  account: SessionInfo | null;
  liveActive: boolean; // realne lokale (OSM) załadowane dla bieżącej lokalizacji
  liveLoading: boolean;

  setTab: (t: Tab) => void;
  navigate: (r: Route) => void;
  back: () => void;

  setFilters: (patch: Partial<Filters>) => void;

  // promień wyszukiwania (km) — jedno źródło prawdy dla mapy i feedu
  radiusKm: number;
  setRadiusKm: (km: number) => void;

  onboard: (data: OnboardData) => void;
  editProfile: (patch: Partial<Pick<User, 'name' | 'age' | 'gender' | 'district' | 'preferredCategories' | 'avatar'>>) => void;
  resetApp: () => void;

  // lokalizacja / miasto
  setLocation: (coords: LatLng, district: string) => void;
  setCity: (cityId: string) => void;
  useMyLocation: () => void;

  toggleSaveEvent: (id: string) => void;
  toggleSaveVenue: (id: string) => void;
  toggleSaveOffer: (id: string) => void;
  toggleAttendEvent: (id: string) => void;
  isAttendingEvent: (id: string) => boolean;
  isSavedEvent: (id: string) => boolean;
  isSavedVenue: (id: string) => boolean;
  isSavedOffer: (id: string) => boolean;

  toggleFollow: (orgId: string) => void;
  isFollowing: (orgId: string) => boolean;

  // powiadomienia (nowe treści od obserwowanych)
  notifications: NotifItem[];
  unseenNotifs: number;
  notifSeenAt: number;
  markNotifsSeen: () => void;

  // znajomi
  addFriend: (id: string) => void;
  removeFriend: (id: string) => void;
  isFriend: (id: string) => boolean;

  checkIn: (venueId: string) => void;
  checkOut: () => void;
  liveCount: (venue: Venue) => number;

  activateVoucher: (offerId: string) => void;
  redeemVoucher: (offerId: string) => void;
  cancelVoucher: (offerId: string) => void;
  activeVoucherFor: (offerId: string) => ActiveVoucher | undefined;
  redeemByCode: (code: string) => { ok: boolean; offerTitle?: string };

  // właściciel
  loginOwner: (b: OwnerBusiness, opts?: { setup?: boolean }) => void;
  ownerSetup: boolean; // świeża rejestracja — panel od razu otwiera formularz dodawania lokalu/organizacji
  armAgentVoice: boolean; // wejście z mikrofonu na „Zapytaj Lokalio" — agent ma od razu zacząć słuchać
  setArmAgentVoice: (v: boolean) => void;
  mapFocus: MapFocus | null; // mapa pokazuje tylko pozycje z wybranej karuzeli „Na dziś"
  setMapFocus: (f: MapFocus | null) => void;
  setOwnerSetup: (v: boolean) => void;
  logoutOwner: () => void;
  updateOwnerBusiness: (patch: Partial<OwnerBusiness>) => void;
  addOwnerVenue: (v: Venue) => void;
  updateOwnerVenue: (v: Venue) => void;
  removeOwnerVenue: (id: string) => void;
  addOwnerEvent: (e: EventItem) => void;
  updateOwnerEvent: (e: EventItem) => void;
  removeOwnerEvent: (id: string) => void;
  addOwnerOffer: (o: Offer) => void;
  updateOwnerOffer: (o: Offer) => void;
  removeOwnerOffer: (id: string) => void;

  // udostępnianie
  openShare: (title: string) => void;
  closeShare: () => void;

  // konto (Supabase)
  loginWithEmail: (email: string) => Promise<{ error: string | null }>;
  loginWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  registerWithPassword: (email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  loginWithProvider: (provider: 'google' | 'apple') => Promise<{ error: string | null }>;
  logout: () => void;

  showToast: (text: string, emoji?: string) => void;

  // motyw
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = 'lokalio.v4';

interface Persisted {
  user: User | null;
  currentCity: string;
  activeVouchers: ActiveVoucher[];
  redeemedOfferIds: string[];
  stats: Stats;
  checkinHistory: CheckinEntry[];
  ownerEvents: EventItem[];
  ownerOffers: Offer[];
  ownerVenues: Venue[];
  ownerVenueIds: string[];
  ownerLoggedIn: boolean;
  ownerBusiness: OwnerBusiness | null;
  radiusKm: number;
}

function loadPersisted(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Persisted;
  } catch {
    return {};
  }
}

function makeVoucherCode(offerId: string): string {
  const tail = offerId.replace(/[^a-z0-9]/gi, '').slice(-3).toUpperCase() || 'LKL';
  const n = 1000 + Math.floor(Math.random() * 9000);
  return `LK-${tail}-${n}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadPersisted());

  const [user, setUser] = useState<User | null>(initial.current.user ?? null);
  const [currentCity, setCurrentCity] = useState<string>(initial.current.currentCity ?? DEFAULT_CITY_ID);
  const [tab, setTabState] = useState<Tab>('home');
  const [stack, setStack] = useState<Route[]>([]);
  const [filters, setFiltersState] = useState<Filters>({
    category: 'all',
    when: 'today',
    query: '',
    freeOnly: false,
  });
  // Promień wyszukiwania — jedno źródło prawdy dla mapy i feedu (zastępuje dawny filters.maxKm).
  const [radiusKm, setRadiusKmState] = useState<number>(snapRadius(initial.current.radiusKm ?? DEFAULT_RADIUS_KM));
  const setRadiusKm = useCallback((km: number) => { const r = snapRadius(km); track('radius_changed', { radiusKm: r }); setRadiusKmState(r); }, []);
  const [activeVouchers, setActiveVouchers] = useState<ActiveVoucher[]>(
    initial.current.activeVouchers ?? [],
  );
  const [redeemedOfferIds, setRedeemedOfferIds] = useState<string[]>(
    initial.current.redeemedOfferIds ?? [],
  );
  const [stats, setStats] = useState<Stats>(
    initial.current.stats ?? { checkins: 0, vouchersUsed: 0 },
  );
  const [checkinHistory, setCheckinHistory] = useState<CheckinEntry[]>(
    initial.current.checkinHistory ?? [],
  );
  const [ownerEvents, setOwnerEvents] = useState<EventItem[]>(initial.current.ownerEvents ?? []);
  const [ownerOffers, setOwnerOffers] = useState<Offer[]>(initial.current.ownerOffers ?? []);
  const [ownerVenues, setOwnerVenues] = useState<Venue[]>(initial.current.ownerVenues ?? []);
  const [ownerVenueIds, setOwnerVenueIds] = useState<string[]>(initial.current.ownerVenueIds ?? []);
  const [ownerLoggedIn, setOwnerLoggedIn] = useState<boolean>(initial.current.ownerLoggedIn ?? false);
  const [ownerBusiness, setOwnerBusiness] = useState<OwnerBusiness | null>(initial.current.ownerBusiness ?? null);
  const [ownerSetup, setOwnerSetup] = useState(false); // transient — nie persystowane
  const [armAgentVoice, setArmAgentVoice] = useState(false); // transient
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null); // transient
  const [toast, setToast] = useState<Toast | null>(null);
  const [locating, setLocating] = useState(false);
  const [shareTitle, setShareTitle] = useState<string | null>(null);
  const [account, setAccount] = useState<SessionInfo | null>(null);
  // Refy treści właściciela — by callbacki i efekt synchronizacji widziały aktualny stan bez stale-closure.
  const ownerBusinessRef = useRef<OwnerBusiness | null>(null);
  ownerBusinessRef.current = ownerBusiness;
  const ownerVenuesRef = useRef<Venue[]>([]);
  ownerVenuesRef.current = ownerVenues;
  const ownerEventsRef = useRef<EventItem[]>([]);
  ownerEventsRef.current = ownerEvents;
  const ownerOffersRef = useRef<Offer[]>([]);
  ownerOffersRef.current = ownerOffers;
  const [theme, setThemeState] = useState<'light' | 'dark'>(() =>
    typeof localStorage !== 'undefined' && localStorage.getItem('lokalio.theme') === 'dark' ? 'dark' : 'light',
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('lokalio.theme', theme);
  }, [theme]);
  const toggleTheme = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const accountRef = useRef<SessionInfo | null>(null);
  accountRef.current = account;
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  // Persist
  useEffect(() => {
    const snap: Persisted = { user, currentCity, activeVouchers, redeemedOfferIds, stats, checkinHistory, ownerEvents, ownerOffers, ownerVenues, ownerVenueIds, ownerLoggedIn, ownerBusiness, radiusKm };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch {
      // Quota przekroczona (zwykle przez duże zdjęcia data-URL) — zapisz wersję bez
      // osadzonych zdjęć, by treść (promocje, bony, wydarzenia, nazwy) nie przepadła.
      try {
        const noData = (s?: string) => (s && s.startsWith('data:') ? undefined : s);
        const lite: Persisted = {
          ...snap,
          ownerEvents: ownerEvents.map((e) => ({ ...e, photo: noData(e.photo) })),
          ownerOffers: ownerOffers.map((o) => ({ ...o, photo: noData(o.photo) })),
          ownerVenues: ownerVenues.map((v) => ({ ...v, photo: noData(v.photo), gallery: v.gallery?.filter((g) => !g.startsWith('data:')) })),
          ownerBusiness: ownerBusiness && ownerBusiness.profile
            ? { ...ownerBusiness, profile: { ...ownerBusiness.profile, photo: noData(ownerBusiness.profile.photo), gallery: ownerBusiness.profile.gallery?.filter((g) => !g.startsWith('data:')) } }
            : ownerBusiness,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lite));
      } catch {
        /* ignore */
      }
    }
  }, [user, currentCity, activeVouchers, redeemedOfferIds, stats, checkinHistory, ownerEvents, ownerOffers, ownerVenues, ownerVenueIds, ownerLoggedIn, ownerBusiness, radiusKm]);

  // Rejestruj lokale dodane przez właściciela, by rozwiązywały się w całej aplikacji (mapa, feed, lookupy).
  useEffect(() => { registerOwnerVenues(ownerVenues); }, [ownerVenues]);

  // Rejestruj oferty właściciela, by pojawiały się też na profilu lokalu (offersForVenue / offerById).
  useEffect(() => { registerOwnerOffers(ownerOffers); }, [ownerOffers]);

  // Rejestruj wydarzenia właściciela, by rozwiązywały się przez eventById (karuzela mapy, ekran wydarzenia, profil lokalu/organizatora).
  useEffect(() => { registerOwnerEvents(ownerEvents); }, [ownerEvents]);

  // ---- konto (Supabase auth) ----
  useEffect(() => {
    if (!authEnabled) return;
    try {
      const hp = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const sp = new URLSearchParams(window.location.search);
      const err = hp.get('error_description') || sp.get('error_description');
      if (err) showToast(`Logowanie: ${decodeURIComponent(err)}`, '⚠️');
    } catch {
      /* ignore */
    }
    const handle = async (info: SessionInfo | null) => {
      setAccount(info);
      if (info) identifyUser(info.userId); // spina anonimową sesję PostHog z kontem (bez maila/PII)
      // logowanie bez wcześniejszego profilu lokalnego → wczytaj profil z bazy
      if (info && !userRef.current) {
        const p = await loadProfile(info.userId);
        const cid = p?.city_id || DEFAULT_CITY_ID;
        setCurrentCity(cid);
        setUser(
          makeDefaultUser({
            name: p?.name || 'Gość',
            age: p?.age ?? 25,
            gender: (p?.gender as Gender) ?? 'inna',
            district: p?.district ?? '',
            coords: cityById(cid).center,
            preferredCategories: (p?.preferred_categories as CategoryKey[]) ?? [],
            points: p?.points ?? 20,
          }),
        );
        setTabState('home');
        setStack([]);
      }
    };
    getSessionInfo().then(handle);
    const unsub = onAuthChange(handle);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // po zalogowaniu zapisz/odśwież profil w bazie
  useEffect(() => {
    if (!account || !user) return;
    upsertProfile(account.userId, {
      name: user.name,
      age: user.age,
      gender: user.gender,
      district: user.district,
      city_id: currentCity,
      points: user.points,
      preferred_categories: user.preferredCategories,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.userId]);

  // synchronizuj punkty po każdej zmianie
  useEffect(() => {
    if (account && user) updatePoints(account.userId, user.points);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.points, account?.userId]);

  // ---- realne lokale (OpenStreetMap) wokół lokalizacji użytkownika ----
  const [live, setLive] = useState<LiveData | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  // Publiczny kanał: wydarzenia opublikowane w Supabase — wczytywane raz, widoczne dla wszystkich.
  const [published, setPublished] = useState<EventItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    loadPublishedEvents().then(({ events: ev, orgs }) => {
      if (cancelled) return;
      registerPublishedEvents(ev, orgs);
      setPublished(ev);
    });
    return () => { cancelled = true; };
  }, []);
  // klucz ~110 m — przeładuj tylko przy realnej zmianie lokalizacji, nie na każdym renderze
  const coordsKey = user ? `${user.coords.lat.toFixed(3)},${user.coords.lng.toFixed(3)}` : '';
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLiveLoading(true);
    loadLivePlaces(user.coords)
      .then((data) => {
        if (cancelled) return;
        registerLiveData(data); // rejestr dla lookupów / aktywnego zbioru (agent, „podobne", organizator)
        setLive(data && data.venues.length ? data : null);
        setLiveLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        registerLiveData(null);
        setLive(null);
        setLiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordsKey]);

  // DEMO (tylko prezentacja): wydarzenie „za ~90 min" tuż obok użytkownika, by sekcja
  // „W okolicy teraz" była zawsze demonstrowalna. Wyłączane flagą DEMO_NEARBY_EVENT w seed.ts.
  const demoNearby = useMemo<EventItem[]>(
    () => (DEMO_NEARBY_EVENT && user ? [makeDemoNearbyEvent(user.coords)] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coordsKey],
  );
  useEffect(() => { registerDemoEvents(demoNearby); }, [demoNearby]);

  // Treść opublikowana przez właściciela jest ZAWSZE w listach konsumenta (skoro panel ją pokazuje — aplikacja też musi).
  // Wcześniej przy braku danych „live" filtrowaliśmy ją po mieście, przez co potrafiła zniknąć ze wszystkich ekranów. Relewancję załatwia dystans w ekranach.
  const events = useMemo(() => {
    const activeOwn = ownerEvents.filter((e) => !e.ended); // zakończone wydarzenia znikają z aplikacji
    return [...demoNearby, ...activeOwn, ...publishedEventsForCity(currentCity), ...(live ? live.events : eventsForCity(currentCity))];
  }, [live, ownerEvents, currentCity, published, demoNearby]);
  const offers = useMemo(() => {
    const activeOwn = ownerOffers.filter((o) => !o.ended); // zakończone oferty znikają z aplikacji
    // Zrealizowane (wykorzystane przez tego użytkownika) chowamy ze WSZYSTKICH list — zostają tylko w „Moje oferty → Wykorzystane".
    return [...activeOwn, ...(live ? live.offers : offersForCity(currentCity))].filter((o) => !redeemedOfferIds.includes(o.id));
  }, [live, ownerOffers, currentCity, redeemedOfferIds]);
  const venues = useMemo(() => {
    // Lokale właściciela trafiają też na mapę i listy „w pobliżu" (wersja właściciela wygrywa nad seedem przy tym samym id).
    const base = live ? live.venues : venuesForCity(currentCity);
    const ownIds = new Set(ownerVenues.map((v) => v.id));
    return [...ownerVenues, ...base.filter((v) => !ownIds.has(v.id))];
  }, [live, ownerVenues, currentCity]);

  // ---- toast ----
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = useCallback((text: string, emoji?: string) => {
    setToast({ id: Date.now(), text, emoji });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  // ---- nav ----
  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    setStack([]);
    window.scrollTo({ top: 0 });
  }, []);
  const navigate = useCallback((r: Route) => {
    setStack((s) => [...s, r]);
    window.scrollTo({ top: 0 });
  }, []);
  const back = useCallback(() => {
    setStack((s) => s.slice(0, -1));
  }, []);
  const route = stack.length ? stack[stack.length - 1] : null;

  const setFilters = useCallback((patch: Partial<Filters>) => {
    track('filter_changed', patch as Record<string, unknown>);
    setFiltersState((f) => ({ ...f, ...patch }));
  }, []);

  const addPoints = useCallback((n: number) => {
    setUser((u) => (u ? { ...u, points: u.points + n } : u));
  }, []);

  // ---- onboarding ----
  const onboard = useCallback((data: OnboardData) => {
    setCurrentCity(data.cityId);
    setUser(
      makeDefaultUser({
        name: data.name || 'Gość',
        age: data.age,
        gender: data.gender,
        district: data.district,
        coords: data.coords,
        preferredCategories: data.preferredCategories,
        points: 20,
      }),
    );
    setTabState('home');
    setStack([]);
  }, []);

  const editProfile = useCallback(
    (patch: Partial<Pick<User, 'name' | 'age' | 'gender' | 'district' | 'preferredCategories' | 'avatar'>>) => {
      setUser((u) => {
        if (!u) return u;
        const next = { ...u, ...patch };
        if (accountRef.current)
          upsertProfile(accountRef.current.userId, {
            name: next.name,
            age: next.age,
            gender: next.gender,
            district: next.district,
            city_id: cityIdOf(next.coords),
            points: next.points,
            preferred_categories: next.preferredCategories,
          });
        return next;
      });
      showToast('Zapisano zmiany profilu', '✅');
    },
    [showToast],
  );

  const resetApp = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
    setActiveVouchers([]);
    setRedeemedOfferIds([]);
    setStats({ checkins: 0, vouchersUsed: 0 });
    setCheckinHistory([]);
    setOwnerEvents([]);
    setOwnerOffers([]);
    setOwnerLoggedIn(false);
    setOwnerBusiness(null);
    setCurrentCity(DEFAULT_CITY_ID);
    setStack([]);
    setTabState('home');
  }, []);

  // ---- lokalizacja ----
  const setLocation = useCallback((coords: LatLng, district: string) => {
    setUser((u) => (u ? { ...u, coords, district, usesRealLocation: false } : u));
  }, []);

  const setCity = useCallback((cityId: string) => {
    const c = cityById(cityId);
    track('city_changed', { cityId });
    setCurrentCity(cityId);
    setUser((u) => (u ? { ...u, coords: c.center, district: c.districts[0]?.district ?? '', usesRealLocation: false } : u));
  }, []);

  const useMyLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      showToast('Przeglądarka nie wspiera lokalizacji', '⚠️');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const c = nearestCity(coords);
        setCurrentCity(c.id);
        setUser((u) => (u ? { ...u, coords, district: 'Twoja lokalizacja', usesRealLocation: true } : u));
        showToast(`Lokalizacja ustawiona · najbliżej: ${c.name}`, '📍');
      },
      () => {
        setLocating(false);
        showToast('Nie udało się pobrać lokalizacji', '⚠️');
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 },
    );
  }, [showToast]);

  // ---- save ----
  const toggleSaveEvent = useCallback(
    (id: string) => {
      setUser((u) => {
        if (!u) return u;
        const has = u.savedEventIds.includes(id);
        if (accountRef.current) dbSetSave(accountRef.current.userId, 'event', id, !has);
        return {
          ...u,
          savedEventIds: has ? u.savedEventIds.filter((x) => x !== id) : [...u.savedEventIds, id],
          points: has ? u.points : u.points + 2,
        };
      });
      track('event_saved', { eventId: id, saved: !user?.savedEventIds.includes(id) });
      showToast(
        user?.savedEventIds.includes(id) ? 'Usunięto z zapisanych' : 'Zapisano · przypomnimy Ci',
        user?.savedEventIds.includes(id) ? '🗑️' : '💛',
      );
    },
    [showToast, user],
  );

  const toggleSaveVenue = useCallback((id: string) => {
    setUser((u) => {
      if (!u) return u;
      const has = u.savedVenueIds.includes(id);
      if (accountRef.current) dbSetSave(accountRef.current.userId, 'venue', id, !has);
      return {
        ...u,
        savedVenueIds: has ? u.savedVenueIds.filter((x) => x !== id) : [...u.savedVenueIds, id],
      };
    });
  }, []);

  const toggleSaveOffer = useCallback((id: string) => {
    setUser((u) => {
      if (!u) return u;
      const has = u.savedOfferIds.includes(id);
      if (accountRef.current) dbSetSave(accountRef.current.userId, 'offer', id, !has);
      return { ...u, savedOfferIds: has ? u.savedOfferIds.filter((x) => x !== id) : [...u.savedOfferIds, id] };
    });
  }, []);

  const toggleAttendEvent = useCallback(
    (id: string) => {
      const wasAttending = !!user?.attendingEventIds?.includes(id);
      setUser((u) => {
        if (!u) return u;
        const list = u.attendingEventIds ?? [];
        const has = list.includes(id);
        return {
          ...u,
          attendingEventIds: has ? list.filter((x) => x !== id) : [...list, id],
          points: has ? u.points : u.points + 3,
        };
      });
      track('event_attend', { eventId: id, attending: !wasAttending });
      showToast(wasAttending ? 'Wypisano z udziału' : 'Weźmiesz udział 🎉', wasAttending ? '🗑️' : '🎉');
    },
    [showToast, user],
  );
  const isAttendingEvent = useCallback((id: string) => !!user?.attendingEventIds?.includes(id), [user]);

  const isSavedEvent = useCallback((id: string) => !!user?.savedEventIds.includes(id), [user]);
  const isSavedVenue = useCallback((id: string) => !!user?.savedVenueIds.includes(id), [user]);
  const isSavedOffer = useCallback((id: string) => !!user?.savedOfferIds.includes(id), [user]);

  // ---- follow ----
  const toggleFollow = useCallback(
    (orgId: string) => {
      setUser((u) => {
        if (!u) return u;
        const has = u.followedOrganizerIds.includes(orgId);
        if (accountRef.current) dbSetFollow(accountRef.current.userId, orgId, !has);
        return {
          ...u,
          followedOrganizerIds: has
            ? u.followedOrganizerIds.filter((x) => x !== orgId)
            : [...u.followedOrganizerIds, orgId],
          points: has ? u.points : u.points + 3,
        };
      });
      track('org_followed', { orgId, following: !user?.followedOrganizerIds.includes(orgId) });
      showToast(
        user?.followedOrganizerIds.includes(orgId) ? 'Przestałeś obserwować' : 'Obserwujesz · damy znać',
        user?.followedOrganizerIds.includes(orgId) ? '🔕' : '🔔',
      );
    },
    [showToast, user],
  );
  const isFollowing = useCallback((orgId: string) => !!user?.followedOrganizerIds.includes(orgId), [user]);

  // ---- powiadomienia (nowe treści od obserwowanych) ----
  const [notifSeenAt, setNotifSeenAt] = useState<number>(() => {
    try { return Number(localStorage.getItem(NOTIF_SEEN_KEY)) || 0; } catch { return 0; }
  });
  const markNotifsSeen = useCallback(() => {
    const t = Date.now();
    setNotifSeenAt(t);
    try { localStorage.setItem(NOTIF_SEEN_KEY, String(t)); } catch { /* ignore */ }
  }, []);
  const notifications = useMemo(
    () => buildNotifications(events, offers, venues, user?.followedOrganizerIds ?? []),
    [events, offers, venues, user?.followedOrganizerIds],
  );
  const unseenNotifs = useMemo(() => notifications.reduce((n, x) => n + (x.createdAt > notifSeenAt ? 1 : 0), 0), [notifications, notifSeenAt]);

  // ---- znajomi ----
  const addFriend = useCallback(
    (id: string) => {
      setUser((u) => (u && !u.friendIds.includes(id) ? { ...u, friendIds: [...u.friendIds, id], points: u.points + 2 } : u));
      if (accountRef.current) dbSetFriend(accountRef.current.userId, id, true);
      showToast('Dodano do znajomych', '🤝');
    },
    [showToast],
  );
  const removeFriend = useCallback((id: string) => {
    setUser((u) => (u ? { ...u, friendIds: u.friendIds.filter((x) => x !== id) } : u));
    if (accountRef.current) dbSetFriend(accountRef.current.userId, id, false);
  }, []);
  const isFriend = useCallback((id: string) => !!user?.friendIds.includes(id), [user]);

  // ---- check-in ----
  const checkIn = useCallback(
    (venueId: string) => {
      const v = venueById(venueId);
      setUser((u) => (u ? { ...u, checkedInVenueId: venueId, checkedInAt: Date.now() } : u));
      setStats((s) => ({ ...s, checkins: s.checkins + 1 }));
      setCheckinHistory((h) => [{ venueId, at: Date.now() }, ...h].slice(0, 50));
      if (accountRef.current) dbCheckin(accountRef.current.userId, venueId);
      track('venue_checkin', { venueId });
      addPoints(15);
      showToast(`Zameldowano w ${v?.name ?? 'lokalu'} · +15 pkt`, '📍');
    },
    [addPoints, showToast],
  );
  const checkOut = useCallback(() => {
    setUser((u) => (u ? { ...u, checkedInVenueId: null, checkedInAt: null } : u));
    showToast('Wymeldowano', '👋');
  }, [showToast]);

  const liveCount = useCallback(
    (venue: Venue) => venue.checkin.base + (user?.checkedInVenueId === venue.id ? 1 : 0),
    [user],
  );

  // ---- vouchers ----
  const activeVoucherFor = useCallback(
    (offerId: string) => activeVouchers.find((a) => a.offerId === offerId),
    [activeVouchers],
  );
  const activateVoucher = useCallback(
    (offerId: string) => {
      const offer = offerById(offerId) ?? ownerOffers.find((o) => o.id === offerId);
      const durationSec = (offer?.activationMinutes ?? 15) * 60;
      setActiveVouchers((list) =>
        list.some((a) => a.offerId === offerId)
          ? list
          : [...list, { offerId, activatedAt: Date.now(), durationSec, code: makeVoucherCode(offerId) }],
      );
      if (accountRef.current) dbActivateVoucher(accountRef.current.userId, offerId, durationSec);
      track('voucher_activated', { offerId });
    },
    [ownerOffers],
  );
  const redeemVoucher = useCallback(
    (offerId: string) => {
      setActiveVouchers((list) => list.filter((a) => a.offerId !== offerId));
      setStats((s) => ({ ...s, vouchersUsed: s.vouchersUsed + 1 }));
      setRedeemedOfferIds((ids) => (ids.includes(offerId) ? ids : [...ids, offerId]));
      if (accountRef.current) dbSetVoucherStatus(accountRef.current.userId, offerId, 'redeemed');
      addPoints(10);
      setStack((s) => s.filter((r) => r.name !== 'voucher-active'));
      showToast('Oferta zrealizowana 🎉 +10 pkt', '🎟️');
    },
    [addPoints, showToast],
  );
  const cancelVoucher = useCallback((offerId: string) => {
    setActiveVouchers((list) => list.filter((a) => a.offerId !== offerId));
    if (accountRef.current) dbSetVoucherStatus(accountRef.current.userId, offerId, 'cancelled');
    setStack((s) => s.filter((r) => r.name !== 'voucher-active'));
  }, []);

  const redeemByCode = useCallback(
    (code: string): { ok: boolean; offerTitle?: string } => {
      const norm = code.trim().toUpperCase().replace(/\s+/g, '');
      const match = activeVouchers.find((a) => a.code.toUpperCase().replace(/\s+/g, '') === norm);
      if (!match) return { ok: false };
      const offer = [...ownerOffers, ...OFFERS].find((o) => o.id === match.offerId);
      setActiveVouchers((list) => list.filter((a) => a.offerId !== match.offerId));
      setStats((s) => ({ ...s, vouchersUsed: s.vouchersUsed + 1 }));
      setRedeemedOfferIds((ids) => (ids.includes(match.offerId) ? ids : [...ids, match.offerId]));
      addPoints(10);
      return { ok: true, offerTitle: offer?.title };
    },
    [activeVouchers, ownerOffers, addPoints],
  );

  // ---- właściciel ----
  const loginOwner = useCallback((b: OwnerBusiness, opts?: { setup?: boolean }) => {
    setOwnerLoggedIn(true);
    setOwnerBusiness(b);
    if (opts?.setup) { setOwnerSetup(true); return; } // świeża rejestracja — panel sam stworzy lokal i otworzy formularz
    // Lokal: jeśli właściciel nie ma jeszcze przypisanych lokali, przypisz pasujący po nazwie (lub pierwszy).
    if (b.accountType !== 'organizer') {
      setOwnerVenueIds((prev) => {
        if (prev.length) return prev;
        const all = activeVenues();
        const match = all.find((v) => v.name === b.name) ?? all[0];
        return match ? [match.id] : [];
      });
    }
  }, []);
  const logoutOwner = useCallback(() => {
    setOwnerLoggedIn(false);
    setOwnerBusiness(null);
  }, []);
  const updateOwnerBusiness = useCallback((patch: Partial<OwnerBusiness>) => {
    setOwnerBusiness((b) => (b ? { ...b, ...patch } : b));
    const uid = accountRef.current?.userId;
    const next = ownerBusinessRef.current ? { ...ownerBusinessRef.current, ...patch } : null;
    if (uid && next) dbUpsertOwner(uid, 'business', 'self', next);
  }, []);
  const addOwnerVenue = useCallback((v: Venue) => {
    setOwnerVenues((list) => [v, ...list]);
    setOwnerVenueIds((ids) => [v.id, ...ids]);
    const uid = accountRef.current?.userId; if (uid) dbUpsertOwner(uid, 'venue', v.id, v);
  }, []);
  const updateOwnerVenue = useCallback((v: Venue) => {
    setOwnerVenues((list) => (list.some((x) => x.id === v.id) ? list.map((x) => (x.id === v.id ? v : x)) : [v, ...list]));
    setOwnerVenueIds((ids) => (ids.includes(v.id) ? ids : [v.id, ...ids]));
    const uid = accountRef.current?.userId; if (uid) dbUpsertOwner(uid, 'venue', v.id, v);
  }, []);
  const removeOwnerVenue = useCallback((id: string) => {
    setOwnerVenues((list) => list.filter((x) => x.id !== id));
    setOwnerVenueIds((ids) => ids.filter((x) => x !== id));
    const uid = accountRef.current?.userId; if (uid) dbDeleteOwner(uid, 'venue', id);
  }, []);
  const addOwnerEvent = useCallback((e: EventItem) => { setOwnerEvents((list) => [e, ...list]); const uid = accountRef.current?.userId; if (uid) dbUpsertOwner(uid, 'event', e.id, e); }, []);
  const updateOwnerEvent = useCallback((e: EventItem) => { setOwnerEvents((list) => list.map((x) => (x.id === e.id ? e : x))); const uid = accountRef.current?.userId; if (uid) dbUpsertOwner(uid, 'event', e.id, e); }, []);
  const removeOwnerEvent = useCallback((id: string) => { setOwnerEvents((list) => list.filter((x) => x.id !== id)); const uid = accountRef.current?.userId; if (uid) dbDeleteOwner(uid, 'event', id); }, []);
  const addOwnerOffer = useCallback((o: Offer) => { setOwnerOffers((list) => [o, ...list]); const uid = accountRef.current?.userId; if (uid) dbUpsertOwner(uid, 'offer', o.id, o); }, []);
  const updateOwnerOffer = useCallback((o: Offer) => { setOwnerOffers((list) => list.map((x) => (x.id === o.id ? o : x))); const uid = accountRef.current?.userId; if (uid) dbUpsertOwner(uid, 'offer', o.id, o); }, []);
  const removeOwnerOffer = useCallback((id: string) => { setOwnerOffers((list) => list.filter((x) => x.id !== id)); const uid = accountRef.current?.userId; if (uid) dbDeleteOwner(uid, 'offer', id); }, []);

  // ---- synchronizacja treści właściciela z chmurą (gdy zalogowany do konta) ----
  // Logika: chmura ma dane → przyjmij je (źródło prawdy między urządzeniami); chmura pusta → wypchnij obecne lokalne.
  const ownerSyncedRef = useRef<string | null>(null);
  useEffect(() => {
    const uid = account?.userId;
    if (!uid || !ownerLoggedIn) { ownerSyncedRef.current = null; return; }
    if (ownerSyncedRef.current === uid) return; // raz na konto/sesję
    ownerSyncedRef.current = uid;
    (async () => {
      const remote = await dbLoadOwnerContent(uid);
      if (!remote) return;
      const hasRemote = remote.venues.length || remote.events.length || remote.offers.length || remote.business;
      if (hasRemote) {
        if (remote.venues.length) { const vs = remote.venues as Venue[]; setOwnerVenues(vs); setOwnerVenueIds(vs.map((v) => v.id)); }
        if (remote.events.length) setOwnerEvents(remote.events as EventItem[]);
        if (remote.offers.length) setOwnerOffers(remote.offers as Offer[]);
        if (remote.business) setOwnerBusiness(remote.business as OwnerBusiness);
      } else {
        ownerVenuesRef.current.forEach((v) => dbUpsertOwner(uid, 'venue', v.id, v));
        ownerEventsRef.current.forEach((e) => dbUpsertOwner(uid, 'event', e.id, e));
        ownerOffersRef.current.forEach((o) => dbUpsertOwner(uid, 'offer', o.id, o));
        if (ownerBusinessRef.current) dbUpsertOwner(uid, 'business', 'self', ownerBusinessRef.current);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, ownerLoggedIn]);

  // ---- share ----
  const openShare = useCallback((title: string) => { track('share_opened', { title }); setShareTitle(title); }, []);
  const closeShare = useCallback(() => setShareTitle(null), []);

  // ---- konto (Supabase) ----
  const loginWithEmail = useCallback((email: string) => signInWithEmail(email), []);
  const loginWithPassword = useCallback((email: string, password: string) => signInWithPassword(email, password), []);
  const registerWithPassword = useCallback((email: string, password: string) => signUpWithPassword(email, password), []);
  const loginWithProvider = useCallback((provider: 'google' | 'apple') => signInWithProvider(provider), []);
  const logout = useCallback(async () => {
    await signOut();
    setAccount(null);
    resetAnalytics(); // kolejne zdarzenia znów anonimowe
    showToast('Wylogowano', '👋');
  }, [showToast]);

  const value: Ctx = {
    user,
    onboarded: !!user,
    tab,
    route,
    filters,
    activeVouchers,
    redeemedOfferIds,
    toast,
    events,
    ownerEvents,
    offers,
    ownerOffers,
    venues,
    currentCity: cityById(currentCity),
    points: user?.points ?? 0,
    stats,
    checkinHistory,
    locating,
    ownerLoggedIn,
    ownerBusiness,
    ownerVenues,
    ownerVenueIds,
    shareTitle,
    authEnabled,
    account,
    liveActive: !!live,
    liveLoading,
    setTab,
    navigate,
    back,
    setFilters,
    radiusKm,
    setRadiusKm,
    onboard,
    editProfile,
    resetApp,
    setLocation,
    setCity,
    useMyLocation,
    toggleSaveEvent,
    toggleAttendEvent,
    isAttendingEvent,
    toggleSaveVenue,
    toggleSaveOffer,
    isSavedEvent,
    isSavedVenue,
    isSavedOffer,
    toggleFollow,
    isFollowing,
    notifications,
    unseenNotifs,
    notifSeenAt,
    markNotifsSeen,
    addFriend,
    removeFriend,
    isFriend,
    checkIn,
    checkOut,
    liveCount,
    activateVoucher,
    redeemVoucher,
    cancelVoucher,
    activeVoucherFor,
    redeemByCode,
    loginOwner,
    ownerSetup,
    setOwnerSetup,
    armAgentVoice,
    setArmAgentVoice,
    mapFocus,
    setMapFocus,
    logoutOwner,
    updateOwnerBusiness,
    addOwnerVenue,
    updateOwnerVenue,
    removeOwnerVenue,
    addOwnerEvent,
    updateOwnerEvent,
    removeOwnerEvent,
    addOwnerOffer,
    updateOwnerOffer,
    removeOwnerOffer,
    openShare,
    closeShare,
    loginWithEmail,
    loginWithPassword,
    registerWithPassword,
    loginWithProvider,
    logout,
    showToast,
    theme,
    toggleTheme,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
