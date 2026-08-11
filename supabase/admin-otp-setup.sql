-- Conecta360 · OTP 4 dígitos + SQL (admin_otp_challenges)
-- NO usa magic link de Supabase Auth. El correo lo envía la app vía SMTP.
-- Ejecutar en Supabase SQL Editor (después de admin-setup / hardening).

begin;

-- ---------------------------------------------------------------------------
-- 0. Helper Admin Maestro (idempotente si ya existe por hardening)
-- ---------------------------------------------------------------------------
create or replace function public.is_master_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from auth.users u
      inner join public.profiles p on p.id = u.id
      where u.id = auth.uid()
        and lower(trim(u.email)) = lower('rdnv1amaro@gmail.com')
        and p.role = 'admin'
    );
$$;

revoke all on function public.is_master_admin_user() from public;
grant execute on function public.is_master_admin_user() to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Tabla de desafíos OTP (vinculada al usuario autenticado)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_otp_challenges_user_created_idx
  on public.admin_otp_challenges (user_id, created_at desc);

alter table public.admin_otp_challenges enable row level security;

-- Sin acceso directo desde Client API (solo RPC SECURITY DEFINER)
drop policy if exists "admin_otp_deny_all" on public.admin_otp_challenges;

-- ---------------------------------------------------------------------------
-- 2. RPC: registrar OTP hasheado (llamado por POST /api/auth/admin-otp/send)
-- ---------------------------------------------------------------------------
create or replace function public.issue_admin_otp_challenge(
  p_otp_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_master_admin_user() then
    raise exception 'Unauthorized Admin OTP issuance.';
  end if;

  delete from public.admin_otp_challenges
  where user_id = auth.uid()
    and consumed_at is null;

  insert into public.admin_otp_challenges (user_id, otp_hash, expires_at)
  values (auth.uid(), p_otp_hash, p_expires_at)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. RPC: verificar y consumir OTP (llamado por POST /api/auth/admin-otp/verify)
-- ---------------------------------------------------------------------------
create or replace function public.verify_admin_otp_challenge(p_otp_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.admin_otp_challenges%rowtype;
begin
  if not public.is_master_admin_user() then
    return false;
  end if;

  select *
  into v_row
  from public.admin_otp_challenges
  where user_id = auth.uid()
    and consumed_at is null
  order by created_at desc
  limit 1;

  if not found then
    return false;
  end if;

  if v_row.expires_at < now() then
    return false;
  end if;

  if v_row.attempts >= 5 then
    return false;
  end if;

  if v_row.otp_hash is distinct from p_otp_hash then
    update public.admin_otp_challenges
    set attempts = attempts + 1
    where id = v_row.id;
    return false;
  end if;

  update public.admin_otp_challenges
  set consumed_at = now()
  where id = v_row.id;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. RPC opcional: estado del desafío activo (depuración admin)
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_otp_challenge_status()
returns table (
  has_active_challenge boolean,
  expires_at timestamptz,
  attempts int,
  is_expired boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.admin_otp_challenges%rowtype;
begin
  if not public.is_master_admin_user() then
    raise exception 'Unauthorized.';
  end if;

  select *
  into v_row
  from public.admin_otp_challenges
  where user_id = auth.uid()
    and consumed_at is null
  order by created_at desc
  limit 1;

  if not found then
    return query select false, null::timestamptz, 0, false;
    return;
  end if;

  return query
  select
    true,
    v_row.expires_at,
    v_row.attempts,
    v_row.expires_at < now();
end;
$$;

revoke all on function public.issue_admin_otp_challenge(text, timestamptz) from public;
revoke all on function public.verify_admin_otp_challenge(text) from public;
revoke all on function public.get_admin_otp_challenge_status() from public;

grant execute on function public.issue_admin_otp_challenge(text, timestamptz) to authenticated;
grant execute on function public.verify_admin_otp_challenge(text) to authenticated;
grant execute on function public.get_admin_otp_challenge_status() to authenticated;

notify pgrst, 'reload schema';

commit;

-- Verificación:
-- select * from public.admin_otp_challenges order by created_at desc limit 5;
