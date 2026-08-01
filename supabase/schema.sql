-- Run this in your Supabase project's SQL editor (Project -> SQL Editor -> New query).
-- Creates the tables and locks each one down so a signed-in user can only ever
-- see or change their own rows -- this is what keeps your entries private.
--
-- Safe to re-run: tables use "if not exists", and each policy is dropped before
-- being recreated (Postgres has no "create policy if not exists").

create table if not exists public.stars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  text text not null,
  group_name text,
  x double precision not null,
  y double precision not null,
  clicks integer not null default 0,
  fulfilled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.stars enable row level security;

drop policy if exists "Users manage only their own stars" on public.stars;
create policy "Users manage only their own stars"
  on public.stars
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- "Everything Worked Out" -- one letter per user, written from a date ~4 months
-- out, in past tense, as if it already happened.
create table if not exists public.vision (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  text text not null default '',
  target_date date not null,
  updated_at timestamptz not null default now()
);

alter table public.vision enable row level security;

drop policy if exists "Users manage only their own vision" on public.vision;
create policy "Users manage only their own vision"
  on public.vision
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Goals -- the concrete steps that move you toward the letter above.
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;

drop policy if exists "Users manage only their own goals" on public.goals;
create policy "Users manage only their own goals"
  on public.goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
