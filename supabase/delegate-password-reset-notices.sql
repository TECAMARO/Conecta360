-- Conecta360 · Avisos de restablecimiento de contraseña delegada (Fase 3)
-- Ejecutar en Supabase SQL Editor

begin;

create table if not exists public.delegate_password_reset_notices (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  delegate_access_id uuid not null references public.profile_delegated_access (id) on delete cascade,
  delegate_email text not null,
  password_ciphertext text not null,
  password_iv text not null,
  password_tag text not null,
  created_at timestamptz not null default now(),
  dismissed_at timestamptz
);

create index if not exists delegate_password_reset_notices_owner_idx
  on public.delegate_password_reset_notices (owner_profile_id, created_at desc);

create index if not exists delegate_password_reset_notices_active_idx
  on public.delegate_password_reset_notices (owner_profile_id)
  where dismissed_at is null;

alter table public.delegate_password_reset_notices enable row level security;

drop policy if exists "delegate_reset_notices_select_owner" on public.delegate_password_reset_notices;
create policy "delegate_reset_notices_select_owner"
  on public.delegate_password_reset_notices
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "delegate_reset_notices_update_owner" on public.delegate_password_reset_notices;
create policy "delegate_reset_notices_update_owner"
  on public.delegate_password_reset_notices
  for update
  to authenticated
  using (owner_profile_id = auth.uid())
  with check (owner_profile_id = auth.uid());

notify pgrst, 'reload schema';

commit;
