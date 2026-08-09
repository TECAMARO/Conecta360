-- Ocupación de mesas por bloque horario (todas las reuniones activas del evento).
-- Ejecutar en Supabase SQL Editor después de crear la tabla `meetings`.

-- Evita doble reserva de la misma mesa en el mismo bloque (pendiente o confirmada).
create unique index if not exists meetings_active_slot_table_unique
  on public.meetings (day, slot_time, table_number)
  where status in ('pendiente', 'confirmada', 'pending', 'confirmed');

-- Ocupación global (SECURITY DEFINER — ve todas las reuniones activas).
create or replace function public.get_active_meeting_occupancy()
returns table (
  id uuid,
  day text,
  slot_time text,
  table_number integer,
  status text,
  created_at timestamptz,
  requester_id uuid,
  recipient_id uuid
)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id,
    m.day,
    m.slot_time,
    m.table_number,
    m.status,
    m.created_at,
    m.requester_id,
    m.recipient_id
  from public.meetings m
  where m.status in ('pendiente', 'confirmada', 'pending', 'confirmed')
    and m.table_number between 1 and 10;
$$;

revoke all on function public.get_active_meeting_occupancy() from public;
grant execute on function public.get_active_meeting_occupancy() to authenticated;

-- Reasigna mesas duplicadas solo en solicitudes pendientes (confirmadas no se mueven).
create or replace function public.correct_duplicate_pending_tables()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_new_table integer;
  v_count integer := 0;
begin
  for r in
    select m.id, m.day, m.slot_time, m.table_number, m.created_at
    from public.meetings m
    where m.status = 'pendiente'
      and exists (
        select 1
        from public.meetings keeper
        where keeper.day = m.day
          and keeper.slot_time = m.slot_time
          and keeper.table_number = m.table_number
          and keeper.status in ('pendiente', 'confirmada', 'pending', 'confirmed')
          and keeper.id <> m.id
          and (
            keeper.status in ('confirmada', 'confirmed')
            or keeper.created_at < m.created_at
            or (keeper.created_at = m.created_at and keeper.id::text < m.id::text)
          )
      )
  loop
    select n into v_new_table
    from generate_series(1, 10) as n
    where not exists (
      select 1
      from public.meetings x
      where x.day = r.day
        and x.slot_time = r.slot_time
        and x.table_number = n
        and x.status in ('pendiente', 'confirmada', 'pending', 'confirmed')
        and x.id <> r.id
    )
    order by n
    limit 1;

    if v_new_table is not null then
      update public.meetings
      set table_number = v_new_table
      where id = r.id;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.correct_duplicate_pending_tables() from public;
grant execute on function public.correct_duplicate_pending_tables() to authenticated;

-- Inserta solicitud asignando atómicamente la primera mesa libre (01–10).
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
begin
  if v_requester is null then
    raise exception 'Sesión no válida. Vuelve a iniciar sesión.';
  end if;

  perform public.correct_duplicate_pending_tables();

  select n into v_table
  from generate_series(1, 10) as n
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

revoke all on function public.insert_meeting_request_with_table(uuid, text, text, text) from public;
grant execute on function public.insert_meeting_request_with_table(uuid, text, text, text) to authenticated;

-- RLS: lectura de ocupación activa entre usuarios (fallback si RPC falla).
alter table public.meetings enable row level security;

drop policy if exists "meetings_select_active_occupancy" on public.meetings;
create policy "meetings_select_active_occupancy"
  on public.meetings
  for select
  to authenticated
  using (
    status in ('pendiente', 'confirmada', 'pending', 'confirmed')
  );

drop policy if exists "meetings_select_own" on public.meetings;
create policy "meetings_select_own"
  on public.meetings
  for select
  to authenticated
  using (
    requester_id = auth.uid() or recipient_id = auth.uid()
  );

-- Permite corregir mesa en solicitudes pendientes propias.
drop policy if exists "meetings_update_pending_table" on public.meetings;
create policy "meetings_update_pending_table"
  on public.meetings
  for update
  to authenticated
  using (
    status = 'pendiente'
    and (requester_id = auth.uid() or recipient_id = auth.uid())
  )
  with check (
    status = 'pendiente'
    and table_number between 1 and 10
  );
