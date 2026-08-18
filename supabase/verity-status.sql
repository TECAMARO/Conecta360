-- =============================================================================
-- Conecta360 · Verity (control operativo admin: blue/green = normal, red = bloqueo)
-- Ejecutar en Supabase → SQL Editor (una vez).
-- =============================================================================

begin;

alter table public.profiles
  add column if not exists verity_status text not null default 'blue';

alter table public.profiles
  drop constraint if exists profiles_verity_status_check;

alter table public.profiles
  add constraint profiles_verity_status_check
  check (verity_status in ('blue', 'green', 'red'));

create index if not exists profiles_verity_status_idx
  on public.profiles (verity_status);

comment on column public.profiles.verity_status is
  'Control admin Verity: blue/green = acceso normal; red = bloqueo operativo total.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_profile_verity_blocked(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.verity_status = 'red'
  );
$$;

revoke all on function public.is_profile_verity_blocked(uuid) from public;
grant execute on function public.is_profile_verity_blocked(uuid) to authenticated;

create or replace function public.profile_verity_allows_public_visibility(p profiles)
returns boolean
language sql
immutable
as $$
  select coalesce(p.verity_status, 'blue') <> 'red';
$$;

-- Solo admin puede cambiar verity_status vía trigger
create or replace function public.guard_profile_verity_status_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verity_status is distinct from old.verity_status then
    if not public.is_admin_user() then
      new.verity_status := old.verity_status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_verity_status on public.profiles;
create trigger trg_guard_profile_verity_status
  before update of verity_status on public.profiles
  for each row
  execute function public.guard_profile_verity_status_update();

-- Cancela reuniones activas de un usuario (bloqueo Verity rojo)
create or replace function public.cancel_active_meetings_for_verity_block(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.meetings
  set status = 'cancelada_admin'
  where (requester_id = p_user_id or recipient_id = p_user_id)
    and status in ('pendiente', 'pending', 'confirmada', 'confirmed');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.cancel_active_meetings_for_verity_block(uuid) from public;
grant execute on function public.cancel_active_meetings_for_verity_block(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS profiles: visibilidad y auto-edición
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_published_or_own" on public.profiles;
create policy "profiles_select_published_or_own"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or (
      is_published = true
      and public.profile_verity_allows_public_visibility(profiles)
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (
    id = auth.uid()
    and verity_status <> 'red'
  )
  with check (
    id = auth.uid()
    and verity_status <> 'red'
  );

-- ---------------------------------------------------------------------------
-- RPC admin: establecer Verity y cancelar reuniones si pasa a rojo
-- ---------------------------------------------------------------------------
drop function if exists public.admin_set_profile_verity_status(uuid, text);

create function public.admin_set_profile_verity_status(
  p_profile_id uuid,
  p_status text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.profiles;
  v_cancelled integer;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida. Vuelve a iniciar sesión.';
  end if;

  if not public.is_admin_user() then
    raise exception 'Acceso denegado: se requiere rol de administrador.';
  end if;

  if p_status not in ('blue', 'green', 'red') then
    raise exception 'Estado Verity inválido.';
  end if;

  update public.profiles
  set
    verity_status = p_status,
    updated_at = now()
  where id = p_profile_id
    and coalesce(role, 'user') <> 'admin'
  returning * into v_row;

  if not found then
    raise exception 'Perfil no encontrado o no modificable.';
  end if;

  if p_status = 'red' then
    v_cancelled := public.cancel_active_meetings_for_verity_block(p_profile_id);
  end if;

  return v_row;
end;
$$;

revoke all on function public.admin_set_profile_verity_status(uuid, text) from public;
grant execute on function public.admin_set_profile_verity_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Meetings: bloqueo en solicitud
-- ---------------------------------------------------------------------------
create or replace function public.insert_meeting_request_with_table(
  p_recipient_id uuid,
  p_day text,
  p_slot_time text,
  p_proposal text default ''
)
returns public.meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester uuid := auth.uid();
  v_table integer;
  v_row public.meetings;
  v_outgoing_confirmed integer;
begin
  if v_requester is null then
    raise exception 'Sesión no válida. Vuelve a iniciar sesión.';
  end if;

  if public.is_profile_verity_blocked(v_requester) then
    raise exception 'No puedes enviar más solicitudes de reunión en este momento.';
  end if;

  if public.is_profile_verity_blocked(p_recipient_id) then
    raise exception 'Este participante no está disponible para reuniones.';
  end if;

  v_outgoing_confirmed := public.count_outgoing_confirmed_meetings(v_requester);
  if v_outgoing_confirmed >= 8 then
    raise exception 'No puedes enviar más solicitudes de reunión en este momento.';
  end if;

  perform public.correct_duplicate_pending_tables();

  select n into v_table
  from generate_series(1, 6) as n
  where not exists (
    select 1
    from public.meetings m
    where m.day = trim(p_day)
      and m.slot_time = trim(p_slot_time)
      and m.table_number = n
      and m.status in ('pendiente', 'confirmada', 'pending', 'confirmed')
  )
  order by n
  limit 1;

  if v_table is null then
    raise exception 'No hay mesa disponible para este bloque horario.';
  end if;

  insert into public.meetings (
    requester_id,
    recipient_id,
    day,
    slot_time,
    proposal,
    status,
    modality,
    table_number
  )
  values (
    v_requester,
    p_recipient_id,
    trim(p_day),
    trim(p_slot_time),
    coalesce(p_proposal, ''),
    'pendiente',
    'presencial',
    v_table
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Meetings: bloqueo en confirmación
-- ---------------------------------------------------------------------------
create or replace function public.confirm_meeting_if_pending(p_meeting_id uuid)
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

  if public.is_profile_verity_blocked(v_uid) then
    raise exception 'No puedes confirmar reuniones en este momento.';
  end if;

  update public.meetings m
  set status = 'confirmada'
  where m.id = p_meeting_id
    and m.recipient_id = v_uid
    and m.status in ('pendiente', 'pending')
    and not public.is_profile_verity_blocked(m.requester_id)
  returning m.* into v_row;

  if not found then
    return null;
  end if;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Messages: bloqueo para usuarios Verity rojo
-- ---------------------------------------------------------------------------
drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_sender"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and not public.is_profile_verity_blocked(auth.uid())
    and not public.is_profile_verity_blocked(receiver_id)
    and public.has_confirmed_meeting_with(auth.uid(), receiver_id)
  );

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
  on public.messages
  for select
  to authenticated
  using (
    not public.is_profile_verity_blocked(auth.uid())
    and (sender_id = auth.uid() or receiver_id = auth.uid())
    and public.has_confirmed_meeting_with(
      case when sender_id = auth.uid() then receiver_id else sender_id end,
      auth.uid()
    )
  );

-- Realtime: cambios de verity_status en el panel del usuario
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
