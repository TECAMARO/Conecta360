-- Conecta360 · OTP 2FA para Admin Maestro (rdnv1amaro@gmail.com)
-- Ejecutar en Supabase SQL Editor después de admin-setup / hardening.

begin;

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

-- Sin políticas directas: solo RPC SECURITY DEFINER
drop policy if exists "admin_otp_deny_all" on public.admin_otp_challenges;

-- Emite/reemplaza desafío OTP (solo Admin Maestro autenticado)
create or replace function public.issue_admin_otp_challenge(
  p_otp_hash text,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_master_admin_user() then
    raise exception 'Unauthorized Admin OTP issuance.';
  end if;

  delete from public.admin_otp_challenges
  where user_id = auth.uid()
    and consumed_at is null;

  insert into public.admin_otp_challenges (user_id, otp_hash, expires_at)
  values (auth.uid(), p_otp_hash, p_expires_at);
end;
$$;

-- Verifica y consume desafío OTP
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

revoke all on function public.issue_admin_otp_challenge(text, timestamptz) from public;
revoke all on function public.verify_admin_otp_challenge(text) from public;
grant execute on function public.issue_admin_otp_challenge(text, timestamptz) to authenticated;
grant execute on function public.verify_admin_otp_challenge(text) to authenticated;

notify pgrst, 'reload schema';

commit;
