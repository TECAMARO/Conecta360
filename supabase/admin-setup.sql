-- Conecta360 · Panel de Administrador Maestro (/admin)
-- Ejecutar en Supabase SQL Editor (en este orden, bloque completo).

begin;

-- ---------------------------------------------------------------------------
-- 1. Columna de rol de acceso (admin | user) — distinta de job_title
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'user'));

create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- 2. Asignar administrador maestro
-- ---------------------------------------------------------------------------
update public.profiles
set role = 'admin', updated_at = now()
where lower(trim(email)) = lower('rdnv1amaro@gmail.com');

-- ---------------------------------------------------------------------------
-- 3. Ampliar estados válidos de meetings (cancelada_admin)
-- ---------------------------------------------------------------------------
alter table public.meetings
  drop constraint if exists meetings_status_check;

alter table public.meetings
  add constraint meetings_status_check
  check (
    status in (
      'pendiente',
      'confirmada',
      'rechazada',
      'cancelada_enviada',
      'cancelada_conflicto',
      'cancelada_admin',
      'anulada_por_cruce',
      'anulada_por_limite',
      'completada',
      'pending',
      'confirmed',
      'rejected',
      'cancelled',
      'canceled',
      'completed'
    )
  );

-- Helper: ¿el usuario autenticado es admin?
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS: lectura global para administradores
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_admin_all" on public.profiles;
create policy "profiles_select_admin_all"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin_user());

alter table public.meetings enable row level security;

drop policy if exists "meetings_select_admin_all" on public.meetings;
create policy "meetings_select_admin_all"
  on public.meetings
  for select
  to authenticated
  using (public.is_admin_user());

-- ---------------------------------------------------------------------------
-- 5. RPC: cancelación forzada por administrador
-- ---------------------------------------------------------------------------
drop function if exists public.admin_cancel_meeting(uuid);

create function public.admin_cancel_meeting(p_meeting_id uuid)
returns public.meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.meetings;
begin
  if v_uid is null then
    raise exception 'Sesión no válida. Vuelve a iniciar sesión.';
  end if;

  if not public.is_admin_user() then
    raise exception 'Acceso denegado: se requiere rol de administrador.';
  end if;

  update public.meetings
  set status = 'cancelada_admin'
  where id = p_meeting_id
  returning * into v_row;

  if not found then
    raise exception 'Reunión no encontrada.';
  end if;

  return v_row;
end;
$$;

revoke all on function public.admin_cancel_meeting(uuid) from public;
grant execute on function public.admin_cancel_meeting(uuid) to authenticated;

-- Realtime para sincronizar panel admin
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'meetings'
  ) then
    alter publication supabase_realtime add table public.meetings;
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
