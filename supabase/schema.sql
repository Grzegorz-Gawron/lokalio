-- ============================================================
-- Lokalio WEB — konta + akcje użytkownika (Supabase / Postgres)
-- ------------------------------------------------------------
-- BEZPIECZNE obok apki mobilnej: wszystkie tabele mają prefiks lk_,
-- więc NIE kolidują z istniejącymi (organizers/events/profiles/...).
-- Katalog (wydarzenia/lokale/oferty) na razie w aplikacji (src/data) —
-- tutaj trzymamy to, co musi być realne: konta i akcje użytkownika.
--
-- Uruchom: Supabase → SQL Editor → wklej całość → Run.
-- Potem: Authentication → Providers → włącz Email (magic link).
-- ============================================================

-- ---------- Profil (rozszerza auth.users) ----------
create table if not exists lk_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  age int,
  gender text check (gender in ('k','m','inna')),
  district text,
  city_id text default 'sandomierz',
  points int default 20,
  preferred_categories text[] default '{}',
  created_at timestamptz default now()
);

-- auto-tworzenie profilu po rejestracji (osobny trigger, nie rusza mobilnego)
create or replace function lk_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into lk_profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name','Gość'))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists lk_on_auth_user_created on auth.users;
create trigger lk_on_auth_user_created after insert on auth.users
  for each row execute function lk_handle_new_user();

-- ---------- Akcje użytkownika ----------
create table if not exists lk_checkins (
  id bigint generated always as identity primary key,
  profile_id uuid references lk_profiles(id) on delete cascade,
  venue_id text not null,
  created_at timestamptz default now()
);
create index if not exists lk_checkins_venue_idx on lk_checkins(venue_id, created_at);

create table if not exists lk_vouchers (
  id bigint generated always as identity primary key,
  profile_id uuid references lk_profiles(id) on delete cascade,
  offer_id text not null,
  activated_at timestamptz default now(),
  duration_sec int default 900,
  status text default 'active' check (status in ('active','redeemed','expired','cancelled')),
  redeemed_at timestamptz
);

create table if not exists lk_saves (
  profile_id uuid references lk_profiles(id) on delete cascade,
  kind text check (kind in ('event','venue','offer')),
  item_id text,
  primary key (profile_id, kind, item_id)
);

create table if not exists lk_follows (
  profile_id uuid references lk_profiles(id) on delete cascade,
  organizer_id text,
  primary key (profile_id, organizer_id)
);

create table if not exists lk_friends (
  profile_id uuid references lk_profiles(id) on delete cascade,
  friend_id text, -- na razie id z puli demo (np. 'f1'); docelowo uuid profilu
  primary key (profile_id, friend_id)
);

-- widok: ilu użytkowników „teraz" w lokalu (ostatnie 2h) — anonimowo, publiczny odczyt
create or replace view lk_venue_live_counts as
  select venue_id, count(*)::int as live_count
  from lk_checkins
  where created_at > now() - interval '2 hours'
  group by venue_id;

-- ---------- RLS: każdy widzi/edytuje tylko swoje ----------
alter table lk_profiles enable row level security;
alter table lk_checkins enable row level security;
alter table lk_vouchers enable row level security;
alter table lk_saves enable row level security;
alter table lk_follows enable row level security;
alter table lk_friends enable row level security;

create policy "lk_profiles own" on lk_profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "lk_checkins own" on lk_checkins for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "lk_vouchers own" on lk_vouchers for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "lk_saves own"    on lk_saves    for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "lk_follows own"  on lk_follows  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "lk_friends own"  on lk_friends  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

grant select on lk_venue_live_counts to anon, authenticated;

-- ---------- Feedback testerów (pilotaż) ----------
-- Każdy (anon i zalogowany) może WYSŁAĆ zgłoszenie. Nikt nie czyta cudzych zgłoszeń
-- przez API (brak polityk SELECT/UPDATE/DELETE) — właściciel czyta w Dashboardzie
-- Supabase (Table Editor → lk_feedback, sortuj po created_at). Patrz BACKEND.md.
create table if not exists lk_feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  type        text not null default 'idea' check (type in ('bug','idea','other')),
  message     text not null check (char_length(message) between 1 and 4000),
  rating      int check (rating between 1 and 5),   -- opcjonalna ocena
  user_ref    text,                                 -- anon distinct_id lub user-id Supabase
  app_context jsonb                                 -- {screen, city, version, ua}
);

alter table lk_feedback enable row level security;

-- INSERT dla każdego (anon + zalogowani), ale tylko poprawne zgłoszenia (nie „always true").
create policy "lk_feedback insert valid" on lk_feedback
  for insert to anon, authenticated
  with check (
    char_length(message) between 1 and 4000
    and type in ('bug','idea','other')
    and (rating is null or rating between 1 and 5)
  );
-- (świadomie brak SELECT/UPDATE/DELETE — czytane tylko w Dashboardzie Supabase)

-- ---------- Publiczny katalog treści właściciela (lk_published) ----------
-- Lokale/oferty/wydarzenia opublikowane w panelu firmowym — widoczne dla WSZYSTKICH
-- użytkowników (w odróżnieniu od prywatnej lk_owner_content). Odczyt publiczny (anon),
-- zapis tylko swojego (RLS po auth.uid()). data = pełny obiekt (Venue/Offer/EventItem).
create table if not exists lk_published (
  profile_id uuid not null references lk_profiles(id) on delete cascade,
  kind       text not null check (kind in ('venue','offer','event')),
  item_id    text not null,
  city_id    text,
  data       jsonb not null,
  updated_at timestamptz default now(),
  primary key (profile_id, kind, item_id)
);
create index if not exists lk_published_city_idx on lk_published(city_id, kind);

alter table lk_published enable row level security;

create policy "lk_published read all"   on lk_published for select to anon, authenticated using (true);
create policy "lk_published insert own" on lk_published for insert to authenticated with check (auth.uid() = profile_id);
create policy "lk_published update own" on lk_published for update to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "lk_published delete own" on lk_published for delete to authenticated using (auth.uid() = profile_id);

-- Gotowe.
