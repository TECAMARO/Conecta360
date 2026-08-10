-- Conecta360 · Límite de solicitudes enviadas confirmadas (8 por usuario)
-- Ejecutar en Supabase SQL Editor después de meetings-slot-occupancy.sql

-- ---------------------------------------------------------------------------
-- 1. Conteo de reuniones enviadas confirmadas/completadas
-- ---------------------------------------------------------------------------
create or replace function public.count_outgoing_confirmed_meetings(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.meetings m
  where m.requester_id = p_user_id
    and m.status in ('confirmada', 'completada', 'confirmed', 'completed');
$$;

revoke all on function public.count_outgoing_confirmed_meetings(uuid) from public;
grant execute on function public.count_outgoing_confirmed_meetings(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Anular pendientes enviadas cuando el solicitante ya tiene 8 confirmadas
-- ---------------------------------------------------------------------------
create or replace function public.rebounce_pending_sent_over_limit(p_requester_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if public.count_outgoing_confirmed_meetings(p_requester_id) < 8 then
    return 0;
  end if;

  update public.meetings
  set status = 'anulada_por_limite'
  where requester_id = p_requester_id
    and status in ('pendiente', 'pending');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.rebounce_pending_sent_over_limit(uuid) from public;
grant execute on function public.rebounce_pending_sent_over_limit(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Reforzar insert_meeting_request_with_table (6 mesas + límite 8 envíos)
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

revoke all on function public.insert_meeting_request_with_table(uuid, text, text, text) from public;
grant execute on function public.insert_meeting_request_with_table(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Trigger: al confirmar, rebotar pendientes excedentes del solicitante
-- ---------------------------------------------------------------------------
create or replace function public.trg_rebounce_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('confirmada', 'confirmed')
     and (old.status is distinct from new.status)
     and new.requester_id is not null then
    perform public.rebounce_pending_sent_over_limit(new.requester_id);
  end if;
  return new;
end;
$$;

drop trigger if exists meetings_rebounce_on_confirm on public.meetings;
create trigger meetings_rebounce_on_confirm
  after update of status on public.meetings
  for each row
  execute function public.trg_rebounce_on_confirm();

notify pgrst, 'reload schema';
