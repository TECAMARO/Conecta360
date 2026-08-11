-- Parche RPC: devolver NULL explícito cuando UPDATE no afecta filas (cita ya confirmada/cancelada).
-- Ejecutar en Supabase SQL Editor.
--
-- Si aparece "cannot change return type of existing function", este script elimina
-- las versiones anteriores (p. ej. boolean/void) y las recrea devolviendo public.meetings.

begin;

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

-- Lectura fiable del status (participante autenticado, bypass RLS)
drop function if exists public.get_meeting_status_for_participant(uuid);

create function public.get_meeting_status_for_participant(p_meeting_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    return null;
  end if;

  select m.status
  into v_status
  from public.meetings m
  where m.id = p_meeting_id
    and (m.requester_id = v_uid or m.recipient_id = v_uid);

  return v_status;
end;
$$;

revoke all on function public.get_meeting_status_for_participant(uuid) from public;
grant execute on function public.get_meeting_status_for_participant(uuid) to authenticated;

commit;
