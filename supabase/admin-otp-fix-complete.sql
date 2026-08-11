-- Conecta360 · OTP Admin — SCRIPT COMPLETO AUTOCONTENIDO
-- Ejecutar TODO este bloque en Supabase → SQL Editor → Run
-- Corrige: "function public.is_master_admin_user() does not exist"

begin;

-- ── Prerrequisitos: columna role + admin maestro ─────────────────────────────
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'user'));

update public.profiles p
set role = 'admin', updated_at = now()
from auth.users u
where p.id = u.id
  and lower(trim(coalesce(p.email, u.email))) = lower('rdnv1amaro@gmail.com');

-- ── Helper Admin Maestro (OTP) — convive con is_admin_user() de admin-setup ──
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
        and lower(trim(coalesce(u.email, p.email))) = lower('rdnv1amaro@gmail.com')
        and p.role = 'admin'
    );
$$;

revoke all on function public.is_master_admin_user() from public;
grant execute on function public.is_master_admin_user() to authenticated;

-- ── Tabla OTP ──────────────────────────────────────────────────────────────
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

-- ── RPCs OTP (recrear por si cambió la firma de retorno) ───────────────────
drop function if exists public.issue_admin_otp_challenge(text, timestamptz);
drop function if exists public.verify_admin_otp_challenge(text);
drop function if exists public.get_admin_otp_challenge_status();

create function public.issue_admin_otp_challenge(
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

create function public.verify_admin_otp_challenge(p_otp_hash text)
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

create function public.get_admin_otp_challenge_status()
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
  select true, v_row.expires_at, v_row.attempts, v_row.expires_at < now();
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

-- Comprobar (debe devolver 1 fila con role = admin):
-- select p.email, p.role from public.profiles p
-- join auth.users u on u.id = p.id
-- where lower(u.email) = lower('rdnv1amaro@gmail.com');
