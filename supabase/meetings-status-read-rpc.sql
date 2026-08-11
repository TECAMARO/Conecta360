-- Lectura fiable del status de una reunión para el participante autenticado.
-- Evita falsos negativos cuando RLS de SELECT no incluye cancelada_enviada.
-- Ejecutar en Supabase SQL Editor (después de meetings-cancel-rpc-fix.sql).

begin;

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
