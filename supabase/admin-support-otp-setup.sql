-- Conecta360 · OTP Soporte (segundo factor para /admin/support) + bóveda cifrada
-- Ejecutar en Supabase SQL Editor después de admin-otp-setup.sql

begin;

-- ---------------------------------------------------------------------------
-- 1. Desafíos OTP Soporte (independientes del OTP admin general)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_support_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_support_otp_challenges_user_created_idx
  on public.admin_support_otp_challenges (user_id, created_at desc);

alter table public.admin_support_otp_challenges enable row level security;

drop policy if exists "admin_support_otp_deny_all" on public.admin_support_otp_challenges;

-- ---------------------------------------------------------------------------
-- 2. Bóveda cifrada (solo service role desde la app; sin acceso Client API)
-- ---------------------------------------------------------------------------
create table if not exists public.support_credential_vault (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  credential_kind text not null check (credential_kind in ('owner', 'delegate')),
  delegate_access_id uuid references public.profile_delegated_access (id) on delete cascade,
  login_email_normalized text not null,
  password_ciphertext text not null,
  password_iv text not null,
  password_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_credential_vault_delegate_ref check (
    (credential_kind = 'owner' and delegate_access_id is null)
    or (credential_kind = 'delegate' and delegate_access_id is not null)
  )
);

create unique index if not exists support_credential_vault_owner_uidx
  on public.support_credential_vault (profile_id, login_email_normalized)
  where credential_kind = 'owner';

create unique index if not exists support_credential_vault_delegate_uidx
  on public.support_credential_vault (delegate_access_id)
  where credential_kind = 'delegate';

create index if not exists support_credential_vault_profile_idx
  on public.support_credential_vault (profile_id);

alter table public.support_credential_vault enable row level security;

drop policy if exists "support_credential_vault_deny_all" on public.support_credential_vault;

-- ---------------------------------------------------------------------------
-- 3. RPC: emitir OTP Soporte
-- ---------------------------------------------------------------------------
drop function if exists public.issue_admin_support_otp_challenge(text, timestamptz);

create function public.issue_admin_support_otp_challenge(
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
    raise exception 'Unauthorized Admin Support OTP issuance.';
  end if;

  delete from public.admin_support_otp_challenges
  where user_id = auth.uid()
    and consumed_at is null;

  insert into public.admin_support_otp_challenges (user_id, otp_hash, expires_at)
  values (auth.uid(), p_otp_hash, p_expires_at)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. RPC: verificar OTP Soporte
-- ---------------------------------------------------------------------------
drop function if exists public.verify_admin_support_otp_challenge(text);

create function public.verify_admin_support_otp_challenge(p_otp_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.admin_support_otp_challenges%rowtype;
begin
  if not public.is_master_admin_user() then
    return false;
  end if;

  select *
  into v_row
  from public.admin_support_otp_challenges
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
    update public.admin_support_otp_challenges
    set attempts = attempts + 1
    where id = v_row.id;
    return false;
  end if;

  update public.admin_support_otp_challenges
  set consumed_at = now()
  where id = v_row.id;

  return true;
end;
$$;

revoke all on function public.issue_admin_support_otp_challenge(text, timestamptz) from public;
revoke all on function public.verify_admin_support_otp_challenge(text) from public;

grant execute on function public.issue_admin_support_otp_challenge(text, timestamptz) to authenticated;
grant execute on function public.verify_admin_support_otp_challenge(text) to authenticated;

notify pgrst, 'reload schema';

commit;
