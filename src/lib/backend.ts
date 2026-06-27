import { supabase, supabaseEnabled } from './supabase';
import type { CategoryKey, Gender } from '../types';

export const authEnabled = supabaseEnabled;

export interface ProfileRow {
  id: string;
  name: string | null;
  age: number | null;
  gender: Gender | null;
  district: string | null;
  city_id: string | null;
  points: number | null;
  preferred_categories: CategoryKey[] | null;
}

export interface SessionInfo {
  userId: string;
  email: string | null;
}

function sessionToInfo(session: { user?: { id: string; email?: string | null } } | null): SessionInfo | null {
  if (!session?.user) return null;
  return { userId: session.user.id, email: session.user.email ?? null };
}

export async function getSessionInfo(): Promise<SessionInfo | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return sessionToInfo(data.session);
}

export function onAuthChange(cb: (info: SessionInfo | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(sessionToInfo(session)));
  return () => data.subscription.unsubscribe();
}

/** Wysyła magic link na e-mail. */
export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase nie jest skonfigurowany.' };
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin },
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Logowanie e-mail + hasło. */
export async function signInWithPassword(email: string, password: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase nie jest skonfigurowany.' };
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return { error: error?.message ?? null };
}

/**
 * Założenie konta e-mail + hasło. needsConfirm = true → trzeba potwierdzić e-mail (brak sesji od razu).
 * alreadyExists = true → ten e-mail ma już konto (Supabase z ochrony przed enumeracją nie zwraca błędu
 * ani nie wysyła maila, tylko usera z PUSTĄ listą identities) → trzeba skierować na logowanie.
 */
export async function signUpWithPassword(email: string, password: string): Promise<{ error: string | null; needsConfirm: boolean; alreadyExists: boolean }> {
  if (!supabase) return { error: 'Supabase nie jest skonfigurowany.', needsConfirm: false, alreadyExists: false };
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) return { error: null, needsConfirm: false, alreadyExists: true };
    return { error: error.message, needsConfirm: false, alreadyExists: false };
  }
  const alreadyExists = Array.isArray(data.user?.identities) && data.user!.identities!.length === 0;
  return { error: null, needsConfirm: !data.session, alreadyExists };
}

/** Ustawia/zmienia hasło aktualnie zalogowanego konta (np. dodanie hasła do konta założonego linkiem). */
export async function setAccountPassword(password: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase nie jest skonfigurowany.' };
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error?.message ?? null };
}

/**
 * Czy e-mail ma już konto. Supabase nie ujawnia tego wprost (ochrona przed enumeracją),
 * więc próbujemy logowania BEZ tworzenia konta: brak błędu = konto istnieje (i właśnie
 * poszedł link logowania); błąd = konta nie ma (można rejestrować).
 */
export async function emailHasAccount(email: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    return !error;
  } catch {
    return false;
  }
}

// ---- feedback testerów (pilotaż) ----
export type FeedbackType = 'bug' | 'idea' | 'other';
export interface FeedbackInput {
  type: FeedbackType;
  message: string;
  rating?: number | null;
  userRef?: string | null;
  appContext?: Record<string, unknown>;
}

/** Zapis zgłoszenia do lk_feedback (INSERT dozwolony anon + zalogowani). */
export async function dbInsertFeedback(f: FeedbackInput): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase nie jest skonfigurowany.' };
  const { error } = await supabase.from('lk_feedback').insert({
    type: f.type,
    message: f.message.trim(),
    rating: f.rating ?? null,
    user_ref: f.userRef ?? null,
    app_context: f.appContext ?? null,
  });
  return { error: error?.message ?? null };
}

export async function loadProfile(id: string): Promise<ProfileRow | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('lk_profiles').select('*').eq('id', id).maybeSingle();
    if (error) return null;
    return (data as ProfileRow) ?? null;
  } catch {
    return null;
  }
}

export async function upsertProfile(id: string, p: Partial<Omit<ProfileRow, 'id'>>): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'no client' };
  try {
    const { error } = await supabase.from('lk_profiles').upsert({ id, ...p });
    return { ok: !error, error: error?.message };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function updatePoints(id: string, points: number): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('lk_profiles').update({ points }).eq('id', id);
  } catch {
    /* ignore */
  }
}

// ---- akcje użytkownika (synchronizacja gdy zalogowany) ----

export async function dbCheckin(userId: string, venueId: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('lk_checkins').insert({ profile_id: userId, venue_id: venueId });
  } catch {
    /* ignore */
  }
}

export async function dbActivateVoucher(userId: string, offerId: string, durationSec: number): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('lk_vouchers').insert({ profile_id: userId, offer_id: offerId, duration_sec: durationSec, status: 'active' });
  } catch {
    /* ignore */
  }
}

export async function dbSetVoucherStatus(userId: string, offerId: string, status: 'redeemed' | 'cancelled'): Promise<void> {
  if (!supabase) return;
  try {
    const patch: Record<string, unknown> = { status };
    if (status === 'redeemed') patch.redeemed_at = new Date().toISOString();
    await supabase.from('lk_vouchers').update(patch).eq('profile_id', userId).eq('offer_id', offerId).eq('status', 'active');
  } catch {
    /* ignore */
  }
}

export async function dbSetSave(userId: string, kind: 'event' | 'venue' | 'offer', itemId: string, on: boolean): Promise<void> {
  if (!supabase) return;
  try {
    if (on) await supabase.from('lk_saves').upsert({ profile_id: userId, kind, item_id: itemId });
    else await supabase.from('lk_saves').delete().eq('profile_id', userId).eq('kind', kind).eq('item_id', itemId);
  } catch {
    /* ignore */
  }
}

export async function dbSetFollow(userId: string, organizerId: string, on: boolean): Promise<void> {
  if (!supabase) return;
  try {
    if (on) await supabase.from('lk_follows').upsert({ profile_id: userId, organizer_id: organizerId });
    else await supabase.from('lk_follows').delete().eq('profile_id', userId).eq('organizer_id', organizerId);
  } catch {
    /* ignore */
  }
}

export async function dbSetFriend(userId: string, friendId: string, on: boolean): Promise<void> {
  if (!supabase) return;
  try {
    if (on) await supabase.from('lk_friends').upsert({ profile_id: userId, friend_id: friendId });
    else await supabase.from('lk_friends').delete().eq('profile_id', userId).eq('friend_id', friendId);
  } catch {
    /* ignore */
  }
}

// ---- treści właściciela (synchronizacja między urządzeniami, gdy zalogowany) ----
// Tabela lk_owner_content: (profile_id, kind, item_id, data jsonb) z RLS po auth.uid().

export type OwnerKind = 'venue' | 'event' | 'offer' | 'business';

export interface OwnerContent {
  venues: unknown[];
  events: unknown[];
  offers: unknown[];
  business: unknown | null;
}

export async function dbLoadOwnerContent(userId: string): Promise<OwnerContent | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('lk_owner_content').select('kind,item_id,data').eq('profile_id', userId);
    if (error) return null;
    const out: OwnerContent = { venues: [], events: [], offers: [], business: null };
    (data ?? []).forEach((r: { kind: OwnerKind; data: unknown }) => {
      if (r.kind === 'venue') out.venues.push(r.data);
      else if (r.kind === 'event') out.events.push(r.data);
      else if (r.kind === 'offer') out.offers.push(r.data);
      else if (r.kind === 'business') out.business = r.data;
    });
    return out;
  } catch {
    return null;
  }
}

export async function dbUpsertOwner(userId: string, kind: OwnerKind, itemId: string, data: unknown): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('lk_owner_content').upsert({ profile_id: userId, kind, item_id: itemId, data, updated_at: new Date().toISOString() });
  } catch {
    /* ignore */
  }
}

export async function dbDeleteOwner(userId: string, kind: OwnerKind, itemId: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('lk_owner_content').delete().eq('profile_id', userId).eq('kind', kind).eq('item_id', itemId);
  } catch {
    /* ignore */
  }
}

/** Publiczny widok liczników meldowań (anon ma grant). Zwraca mapę venue_id → liczba. */
export async function dbLiveCounts(): Promise<Record<string, number>> {
  if (!supabase) return {};
  try {
    const { data } = await supabase.from('lk_venue_live_counts').select('*');
    const out: Record<string, number> = {};
    (data ?? []).forEach((r: { venue_id: string; live_count: number }) => (out[r.venue_id] = r.live_count));
    return out;
  } catch {
    return {};
  }
}
