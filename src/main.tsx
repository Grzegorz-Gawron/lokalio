import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import * as Sentry from '@sentry/react';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import { AppProvider } from './store/AppContext';
import { initAnalytics } from './lib/analytics';
import { initErrorTracking } from './lib/errors';

// Ustaw motyw zanim React się wyrenderuje (brak mignięcia jasnego w trybie ciemnym).
if (localStorage.getItem('lokalio.theme') === 'dark') document.documentElement.classList.add('dark');

// Monitoring: błędy (Sentry) + analityka produktu (PostHog). Bez kluczy w .env oba to no-op.
initErrorTracking();
initAnalytics();

// Awaryjny ekran zamiast białej strony, gdy render się wywali. Zgłoszenie do Sentry leci automatycznie.
function ErrorFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#0F1729' }}>
      <div style={{ fontSize: 40 }}>😕</div>
      <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Coś poszło nie tak</p>
      <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Odśwież stronę — jeśli problem wróci, już o tym wiemy.</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: 8, background: '#FF5A4D', color: '#fff', border: 0, borderRadius: 999, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Odśwież</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <AppProvider>
      <App />
      <Analytics />
    </AppProvider>
  </Sentry.ErrorBoundary>,
);
