-- Conecta360 · Transiciones atómicas de estado en meetings
-- Impide confirmar/rechazar/cancelar filas que ya no están pendientes.
-- Ejecutar en Supabase SQL Editor (después de meetings-status-constraint.sql).

begin;

-- ---------------------------------------------------------------------------
-- 1. Trigger: bloqueo atómico en PostgreSQL (última línea de defensa)
--    RETURN NULL cancela el UPDATE → 0 filas afectadas en el cliente.
-- ---------------------------------------------------------------------------
create or replace function public.guard_meeting_status_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op <> 'UPDATE' or old.status is not distinct from new.status then
    return new;
  end if;

  -- Confirmar: solo desde pendiente
  if new.status in ('confirmada', 'confirmed')
     and old.status not in ('pendiente', 'pending') then
    return null;
  end if;

  -- Rechazar: solo desde pendiente
  if new.status in ('rechazada', 'rejected')
     and old.status not in ('pendiente', 'pending') then
    return null;
  end if;

  -- Cancelar solicitud enviada: solo desde pendiente
  if new.status in ('cancelada_enviada', 'cancelled', 'canceled')
     and old.status not in ('pendiente', 'pending') then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_meeting_status on public.meetings;
create trigger trg_guard_meeting_status
  before update of status on public.meetings
  for each row
  execute function public.guard_meeting_status_transition();

-- ---------------------------------------------------------------------------
-- 2. RPC: confirmar / rechazar / cancelar solo si la fila sigue pendiente
-- ---------------------------------------------------------------------------
drop function if exists public.confirm_meeting_if_pending(uuid);
drop function if exists public.reject_meeting_if_pending(uuid);
drop function if exists public.cancel_meeting_if_pending(uuid);

create function public.confirm_meeting_if_pending(p_meeting_id uuid)
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

  update public.meetings
  set status = 'confirmada'
  where id = p_meeting_id
    and recipient_id = v_uid
    and status in ('pendiente', 'pending')
  returning * into v_row;

  if not found then
    return null;
  end if;

  return v_row;
end;
$$;

create function public.reject_meeting_if_pending(p_meeting_id uuid)
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

  update public.meetings
  set status = 'rechazada'
  where id = p_meeting_id
    and recipient_id = v_uid
    and status in ('pendiente', 'pending')
  returning * into v_row;

  if not found then
    return null;
  end if;

  return v_row;
end;
$$;

create function public.cancel_meeting_if_pending(p_meeting_id uuid)
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

  update public.meetings
  set status = 'cancelada_enviada'
  where id = p_meeting_id
    and requester_id = v_uid
    and status in ('pendiente', 'pending')
  returning * into v_row;

  if not found then
    return null;
  end if;

  return v_row;
end;
$$;

revoke all on function public.confirm_meeting_if_pending(uuid) from public;
revoke all on function public.reject_meeting_if_pending(uuid) from public;
revoke all on function public.cancel_meeting_if_pending(uuid) from public;

grant execute on function public.confirm_meeting_if_pending(uuid) to authenticated;
grant execute on function public.reject_meeting_if_pending(uuid) to authenticated;
grant execute on function public.cancel_meeting_if_pending(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS: receptor solo puede responder filas pendientes (USING estricto)
-- ---------------------------------------------------------------------------
alter table public.meetings enable row level security;

drop policy if exists "meetings_update_recipient_respond" on public.meetings;
create policy "meetings_update_recipient_respond"
  on public.meetings
  for update
  to authenticated
  using (
    recipient_id = auth.uid()
    and status in ('pendiente', 'pending')
  )
  with check (
    recipient_id = auth.uid()
    and status in ('confirmada', 'rechazada', 'confirmed', 'rejected')
  );

drop policy if exists "meetings_update_requester_cancel" on public.meetings;
create policy "meetings_update_requester_cancel"
  on public.meetings
  for update
  to authenticated
  using (
    requester_id = auth.uid()
    and status in ('pendiente', 'pending')
  )
  with check (
    requester_id = auth.uid()
    and status in ('cancelada_enviada', 'cancelled', 'canceled')
  );

-- ---------------------------------------------------------------------------
-- 4. Realtime: sincronizar agenda cuando cambia una reunión (evita stale UI)
-- ---------------------------------------------------------------------------
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

alter table public.meetings replica identity full;

commit;
