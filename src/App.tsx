import { useRef } from 'react';
import { useApp, type Tab } from './store/AppContext';
import { useSwipeNav } from './lib/useSwipeNav';
import { BottomNav } from './components/BottomNav';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { MapScreen } from './screens/MapScreen';
import { AgentScreen } from './screens/AgentScreen';
import { VouchersScreen } from './screens/VouchersScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { EventDetail } from './screens/EventDetail';
import { VenueDetail } from './screens/VenueDetail';
import { OrganizerScreen } from './screens/OrganizerScreen';
import { OwnerPanel } from './screens/OwnerPanel';
import { ListScreen } from './screens/ListScreen';
import { VoucherActive } from './screens/VoucherActive';
import { OfferDetail } from './screens/OfferDetail';
import { EditProfile } from './screens/EditProfile';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ShareSheet } from './components/ShareSheet';

const TAB_ORDER: Tab[] = ['home', 'map', 'agent', 'vouchers', 'profile'];

export default function App() {
  const { onboarded, tab, route, toast, setTab } = useApp();

  const fullTakeover = route?.name === 'voucher-active';

  // Przesunięcie palcem w bok między zakładkami — WYŁĄCZONE (zmiana ekranu tylko przez dolną nawigację).
  const idx = TAB_ORDER.indexOf(tab);
  const swipe = useSwipeNav({
    enabled: false,
    onNext: () => {
      if (idx >= 0 && idx < TAB_ORDER.length - 1) setTab(TAB_ORDER[idx + 1]);
    },
    onPrev: () => {
      if (idx > 0) setTab(TAB_ORDER[idx - 1]);
    },
  });

  // Kierunek animacji wejścia ekranu (zależny od kierunku przejścia).
  const prevTab = useRef(tab);
  const dir = useRef<'right' | 'left'>('right');
  if (prevTab.current !== tab) {
    dir.current = TAB_ORDER.indexOf(tab) >= TAB_ORDER.indexOf(prevTab.current) ? 'right' : 'left';
    prevTab.current = tab;
  }
  const slideClass = dir.current === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left';

  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center"
      style={{ background: 'radial-gradient(120% 120% at 50% 0%, #2A3D5A 0%, #14213a 55%, #0b1226 100%)' }}
    >
      <div className="relative flex h-[100dvh] w-full max-w-app flex-col overflow-hidden bg-cream sm:h-[862px] sm:max-h-[94vh] sm:rounded-[2.4rem] sm:shadow-2xl sm:ring-[7px] sm:ring-black/85">
        {!onboarded ? (
          <Onboarding />
        ) : (
          <>
            <main {...swipe} className="relative z-0 flex-1 overflow-hidden isolate">
              {route ? (
                <RouteScreen />
              ) : (
                <div key={tab} className={`h-full ${slideClass}`}>
                  <TabScreen tab={tab} />
                </div>
              )}
            </main>
            {!fullTakeover && <BottomNav />}
          </>
        )}

        {/* Toast */}
        {toast && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[60] flex justify-center px-6">
            <div className="animate-scale-in flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-cream shadow-float">
              {toast.emoji && <span>{toast.emoji}</span>}
              {toast.text}
            </div>
          </div>
        )}

        {/* Globalne udostępnianie */}
        <ShareSheet />
      </div>
    </div>
  );
}

function TabScreen({ tab }: { tab: string }) {
  switch (tab) {
    case 'map':
      return <MapScreen />;
    case 'agent':
      return <AgentScreen />;
    case 'vouchers':
      return <VouchersScreen />;
    case 'profile':
      return <ProfileScreen />;
    default:
      return <Home />;
  }
}

function RouteScreen() {
  const { route } = useApp();
  if (!route) return null;
  switch (route.name) {
    case 'event':
      return <EventDetail id={route.id!} />;
    case 'venue':
      return <VenueDetail id={route.id!} />;
    case 'organizer':
      return <OrganizerScreen id={route.id!} />;
    case 'owner':
      return <OwnerPanel />;
    case 'checkins':
      return <ListScreen kind="checkins" />;
    case 'follows':
      return <ListScreen kind="follows" />;
    case 'savedEvents':
      return <ListScreen kind="savedEvents" />;
    case 'savedOffers':
      return <ListScreen kind="savedOffers" />;
    case 'voucher-active':
      return <VoucherActive id={route.id!} />;
    case 'offer':
      return <OfferDetail id={route.id!} />;
    case 'editProfile':
      return <EditProfile />;
    case 'notifications':
      return <NotificationsScreen />;
    case 'search':
      return <SearchScreen />;
    default:
      return null;
  }
}
