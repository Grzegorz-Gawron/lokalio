import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Konfiguracja z .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
// Gdy brak — klient jest null, a aplikacja działa na danych lokalnych (localStorage).
// .trim() usuwa ewentualny BOM/whitespace (np. gdy zmienna środowiskowa zawiera U+FEFF)
const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const supabaseEnabled = Boolean(url && anon);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // implicit = tokeny w #hash, bez PKCE-verifier → pewniejsze przy magic linku na localhost
        flowType: 'implicit',
      },
    })
  : null;
