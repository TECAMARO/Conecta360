-- ---------------------------------------------------------------------------
-- Accesos delegados: credenciales alternativas al mismo perfil titular
-- Ejecutar en Supabase SQL Editor (proyecto Conecta360).
-- Requiere: profiles-setup.sql, verity-status.sql (recomendado).
-- ---------------------------------------------------------------------------

-- 1. Tabla principal
create table if not exists public.profile_delegated_access (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  constraint profile_delegated_access_email_nonempty check (char_length(trim(email)) > 0),
  constraint profile_delegated_access_password_hash_nonempty check (char_length(password_hash) > 0)
);

create unique index if not exists profile_delegated_access_email_normalized_uidx
  on public.profile_delegated_access (email_normalized);

create index if not exists profile_delegated_access_owner_idx
  on public.profile_delegated_access (owner_profile_id)
  where is_active = true;

comment on table public.profile_delegated_access is
  'Credenciales delegadas (correo+hash) que inician sesión en el perfil titular sin crear cuenta nueva.';

-- 2. updated_at automático
create or replace function public.touch_profile_delegated_access_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profile_delegated_access_set_updated_at on public.profile_delegated_access;
create trigger profile_delegated_access_set_updated_at
  before update on public.profile_delegated_access
  for each row
  execute function public.touch_profile_delegated_access_updated_at();

-- 3. Impedir que el titular delegue su propio correo de registro
create or replace function public.profile_delegated_access_guard_owner_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_email text;
begin
  select lower(trim(p.email))
  into v_owner_email
  from public.profiles p
  where p.id = new.owner_profile_id;

  if v_owner_email is not null and v_owner_email = new.email_normalized then
    raise exception 'DELEGATE_EMAIL_SAME_AS_OWNER';
  end if;

  return new;
end;
$$;

drop trigger if exists profile_delegated_access_guard_owner_email_trg on public.profile_delegated_access;
create trigger profile_delegated_access_guard_owner_email_trg
  before insert or update of email, owner_profile_id on public.profile_delegated_access
  for each row
  execute function public.profile_delegated_access_guard_owner_email();

-- 4. Verificación de correo disponible (mensaje genérico en UI)
create or replace function public.check_email_available_for_delegate(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_norm text := lower(trim(p_email));
begin
  if v_norm is null or v_norm = '' or position('@' in v_norm) = 0 then
    return false;
  end if;

  if exists (
    select 1
    from auth.users u
    where lower(trim(u.email)) = v_norm
  ) then
    return false;
  end if;

  if exists (
    select 1
    from public.profile_delegated_access d
    where d.email_normalized = v_norm
      and d.is_active = true
  ) then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.check_email_available_for_delegate(text) from public;
grant execute on function public.check_email_available_for_delegate(text) to authenticated;

-- Guard de registro (API / signUp)
create or replace function public.is_email_available_for_registration(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_norm text := lower(trim(p_email));
begin
  if v_norm is null or v_norm = '' or position('@' in v_norm) = 0 then
    return false;
  end if;

  if exists (
    select 1 from auth.users u where lower(trim(u.email)) = v_norm
  ) then
    return false;
  end if;

  if exists (
    select 1
    from public.profile_delegated_access d
    where d.email_normalized = v_norm
      and d.is_active = true
  ) then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.is_email_available_for_registration(text) from public;
grant execute on function public.is_email_available_for_registration(text) to anon, authenticated, service_role;

-- 5. Guard de registro (bloqueo server-side ante Supabase Auth directo)
create or replace function public.block_delegated_email_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text := lower(trim(new.email));
begin
  if v_norm is null or v_norm = '' then
    return new;
  end if;

  if exists (
    select 1
    from public.profile_delegated_access d
    where d.email_normalized = v_norm
      and d.is_active = true
  ) then
    raise exception 'CREDENTIAL_IN_USE'
      using hint = 'Este correo está reservado como acceso delegado.';
  end if;

  return new;
end;
$$;

drop trigger if exists block_delegated_email_on_signup on auth.users;
create trigger block_delegated_email_on_signup
  before insert on auth.users
  for each row
  execute function public.block_delegated_email_registration();

-- 6. Emails delegados activos por perfil (API transaccional / correos)
create or replace function public.get_active_delegate_emails_for_profiles(p_profile_ids uuid[])
returns table (profile_id uuid, delegate_email text)
language sql
security definer
set search_path = public
stable
as $$
  select d.owner_profile_id, d.email
  from public.profile_delegated_access d
  where d.is_active = true
    and d.owner_profile_id = any (p_profile_ids)
  order by d.created_at asc;
$$;

revoke all on function public.get_active_delegate_emails_for_profiles(uuid[]) from public;
grant execute on function public.get_active_delegate_emails_for_profiles(uuid[]) to service_role;

-- 7. Row Level Security
alter table public.profile_delegated_access enable row level security;

drop policy if exists "delegated_access_select_owner" on public.profile_delegated_access;
create policy "delegated_access_select_owner"
  on public.profile_delegated_access
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "delegated_access_select_admin" on public.profile_delegated_access;
create policy "delegated_access_select_admin"
  on public.profile_delegated_access
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- INSERT/UPDATE/DELETE vía RPC titular o service role (API server-side)

-- 8. Crear / reactivar acceso delegado (titular autenticado)
create or replace function public.create_profile_delegated_access(
  p_email text,
  p_password_hash text
)
returns public.profile_delegated_access
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_norm text := lower(trim(p_email));
  v_row public.profile_delegated_access;
  v_existing public.profile_delegated_access;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_norm is null or v_norm = '' or position('@' in v_norm) = 0 then
    raise exception 'INVALID_EMAIL';
  end if;

  if char_length(trim(p_password_hash)) = 0 then
    raise exception 'INVALID_PASSWORD_HASH';
  end if;

  if not public.check_email_available_for_delegate(p_email) then
    raise exception 'EMAIL_NOT_AVAILABLE';
  end if;

  select d.*
  into v_existing
  from public.profile_delegated_access d
  where d.email_normalized = v_norm
  limit 1;

  if found then
    if v_existing.owner_profile_id <> v_uid then
      raise exception 'EMAIL_NOT_AVAILABLE';
    end if;

    update public.profile_delegated_access d
    set
      email = trim(p_email),
      password_hash = p_password_hash,
      is_active = true,
      created_by = v_uid
    where d.id = v_existing.id
    returning d.* into v_row;

    return v_row;
  end if;

  insert into public.profile_delegated_access (
    owner_profile_id,
    email,
    password_hash,
    is_active,
    created_by
  )
  values (
    v_uid,
    trim(p_email),
    p_password_hash,
    true,
    v_uid
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_profile_delegated_access(text, text) from public;
grant execute on function public.create_profile_delegated_access(text, text) to authenticated;

-- 9. Recargar caché PostgREST
notify pgrst, 'reload schema';
