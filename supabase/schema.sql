-- =========================================================================
-- TreinoHG - Database Schema
-- Premium calorie + workout tracker. Designed for Supabase (Postgres).
-- All tables are scoped per user with strict Row Level Security.
-- =========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =========================================================================
-- profiles: 1:1 with auth.users
-- =========================================================================
create table if not exists public.profiles (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  age           integer,
  sex           text check (sex in ('male','female')),
  height_cm     numeric,
  weight_kg     numeric,
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')),
  goal          text check (goal in ('lose_fat','maintain','gain_muscle')),
  calorie_target      integer,
  protein_target_g    integer,
  carbs_target_g      integer,
  fat_target_g        integer,
  water_target_ml     integer,
  preferred_workout_time text,
  food_preferences    text,
  dietary_restrictions text,
  theme         text check (theme in ('light','dark','premium')) default 'dark',
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =========================================================================
-- days: one row per user per calendar day
-- =========================================================================
create table if not exists public.days (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  notes       text,
  weight_kg   numeric,
  water_ml    integer,
  ai_summary  text,
  motivational_phrase text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists days_user_date_idx on public.days (user_id, date desc);

-- =========================================================================
-- meals
-- =========================================================================
create table if not exists public.meals (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  day_id      uuid not null references public.days(id) on delete cascade,
  date        date not null,
  meal_type   text not null check (meal_type in ('breakfast','lunch','snack','dinner','pre_workout','post_workout','other')),
  name        text,
  time        time,
  notes       text,
  photo_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists meals_user_date_idx on public.meals (user_id, date desc);
create index if not exists meals_day_idx on public.meals (day_id);

-- =========================================================================
-- food_entries: individual foods inside a meal
-- =========================================================================
create table if not exists public.food_entries (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  meal_id     uuid not null references public.meals(id) on delete cascade,
  date        date not null,
  name        text not null,
  quantity    text,
  calories    numeric not null default 0,
  protein_g   numeric not null default 0,
  carbs_g     numeric not null default 0,
  fat_g       numeric not null default 0,
  notes       text,
  source      text not null default 'manual' check (source in ('manual','ai','favorite')),
  created_at  timestamptz not null default now()
);
create index if not exists food_entries_meal_idx on public.food_entries (meal_id);
create index if not exists food_entries_user_date_idx on public.food_entries (user_id, date desc);

-- =========================================================================
-- workouts
-- =========================================================================
create table if not exists public.workouts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  day_id          uuid not null references public.days(id) on delete cascade,
  date            date not null,
  workout_type    text not null,
  name            text,
  duration_min    integer not null default 0,
  treadmill_min   integer,
  intensity       text check (intensity in ('low','moderate','high','extreme')),
  calories_burned integer not null default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);
create index if not exists workouts_day_idx on public.workouts (day_id);

-- =========================================================================
-- meal_photo_analyses: AI photo analysis history (one row per analysis)
-- =========================================================================
create table if not exists public.meal_photo_analyses (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  meal_id         uuid references public.meals(id) on delete set null,
  photo_url       text not null,
  raw_response    jsonb,
  detected_foods  jsonb not null default '[]',
  total_calories  numeric not null default 0,
  total_protein_g numeric not null default 0,
  total_carbs_g   numeric not null default 0,
  total_fat_g     numeric not null default 0,
  confidence      numeric not null default 0,
  summary         text,
  applied         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists mpa_user_idx on public.meal_photo_analyses (user_id, created_at desc);

-- =========================================================================
-- ai_messages: insights, motivation, summaries, chat answers
-- =========================================================================
create table if not exists public.ai_messages (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  kind        text not null check (kind in ('insight','motivation','summary','answer')),
  content     text not null,
  context     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists ai_messages_user_date_idx on public.ai_messages (user_id, date desc);

-- =========================================================================
-- favorite_foods: quick re-add
-- =========================================================================
create table if not exists public.favorite_foods (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  quantity    text,
  calories    numeric not null default 0,
  protein_g   numeric not null default 0,
  carbs_g     numeric not null default 0,
  fat_g       numeric not null default 0,
  use_count   integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- =========================================================================
-- Triggers: keep updated_at fresh & ensure profile exists on signup
-- =========================================================================
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_days_updated on public.days;
create trigger trg_days_updated before update on public.days
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_meals_updated on public.meals;
create trigger trg_meals_updated before update on public.meals
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_workouts_updated on public.workouts;
create trigger trg_workouts_updated before update on public.workouts
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Helper function: get-or-create day
-- =========================================================================
create or replace function public.get_or_create_day(p_date date)
returns public.days as $$
declare
  v_day public.days;
begin
  select * into v_day from public.days
   where user_id = auth.uid() and date = p_date;
  if not found then
    insert into public.days (user_id, date)
    values (auth.uid(), p_date)
    returning * into v_day;
  end if;
  return v_day;
end;
$$ language plpgsql security definer;

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.days enable row level security;
alter table public.meals enable row level security;
alter table public.food_entries enable row level security;
alter table public.workouts enable row level security;
alter table public.meal_photo_analyses enable row level security;
alter table public.ai_messages enable row level security;
alter table public.favorite_foods enable row level security;

-- Generic policy template: own rows only
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles','days','meals','food_entries','workouts',
      'meal_photo_analyses','ai_messages','favorite_foods'
    ])
  loop
    execute format('drop policy if exists "select_own" on public.%I', t);
    execute format('drop policy if exists "insert_own" on public.%I', t);
    execute format('drop policy if exists "update_own" on public.%I', t);
    execute format('drop policy if exists "delete_own" on public.%I', t);

    execute format('create policy "select_own" on public.%I for select using (user_id = auth.uid())', t);
    execute format('create policy "insert_own" on public.%I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "update_own" on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "delete_own" on public.%I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- =========================================================================
-- Storage bucket for meal photos (run separately if not exists)
-- =========================================================================
-- insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', true)
--   on conflict (id) do nothing;
-- create policy "users upload own meal photos" on storage.objects for insert
--   with check (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "public read meal photos" on storage.objects for select
--   using (bucket_id = 'meal-photos');
