import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { AppProvider } from './store/AppContext';

// Ustaw motyw zanim React się wyrenderuje (brak mignięcia jasnego w trybie ciemnym).
if (localStorage.getItem('lokalio.theme') === 'dark') document.documentElement.classList.add('dark');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <App />
  </AppProvider>,
);
