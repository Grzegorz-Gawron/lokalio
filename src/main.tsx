import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { AppProvider } from './store/AppContext';
import { initAnalytics } from './lib/analytics';

// Ustaw motyw zanim React się wyrenderuje (brak mignięcia jasnego w trybie ciemnym).
if (localStorage.getItem('lokalio.theme') === 'dark') document.documentElement.classList.add('dark');

// Analityka produktu (PostHog) — bez klucza w .env to no-op.
initAnalytics();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <App />
  </AppProvider>,
);
