-- Conecta360 · Perfiles de usuario
-- Ejecutar en Supabase → SQL Editor (proyecto higmzzfiwsjjiimdqoyr)
-- Alineado con lib/supabase/mappers.ts (location app → region DB)

-- ---------------------------------------------------------------------------
-- 1. Columnas oficiales de `profiles`
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  job_title text,
  organization_name text,
  region text,
  sector text,
  description text,
  offers text[] default '{}',
  seeks text[] default '{}',
  is_published boolean default false,
  logo_url text,
  brochure_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migrar nombres legacy (location → region)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'location'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'region'
  ) then
    alter table public.profiles rename column location to region;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'location'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'region'
  ) then
    update public.profiles
    set region = coalesce(nullif(trim(region), ''), nullif(trim(location), ''))
    where coalesce(nullif(trim(region), ''), '') = ''
      and coalesce(nullif(trim(location), ''), '') <> '';

    alter table public.profiles drop column location;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'region'
  ) then
    alter table public.profiles add column region text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'organization_name'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'organization'
  ) then
    alter table public.profiles rename column organization to organization_name;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'job_title'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    alter table public.profiles rename column role to job_title;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Trigger al crear usuario (usa `region`, NO `location`)
--    La app también hace upsert en registro; este trigger es respaldo.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    job_title,
    organization_name,
    region,
    sector,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', ''),
    coalesce(new.raw_user_meta_data->>'organization', ''),
    coalesce(
      new.raw_user_meta_data->>'region',
      new.raw_user_meta_data->>'location',
      'Región Orinoquía, Colombia'
    ),
    coalesce(new.raw_user_meta_data->>'sector', ''),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    job_title = coalesce(nullif(excluded.job_title, ''), public.profiles.job_title),
    organization_name = coalesce(nullif(excluded.organization_name, ''), public.profiles.organization_name),
    region = coalesce(nullif(excluded.region, ''), public.profiles.region),
    sector = coalesce(nullif(excluded.sector, ''), public.profiles.sector),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_published_or_own" on public.profiles;
create policy "profiles_select_published_or_own"
  on public.profiles
  for select
  to authenticated
  using (is_published = true or id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Recargar caché de esquema PostgREST (evita errores "schema cache")
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 5. Verificación rápida (opcional)
-- ---------------------------------------------------------------------------
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'profiles'
-- order by ordinal_position;
