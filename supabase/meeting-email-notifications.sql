-- =============================================================================
-- Conecta360 · Idempotencia de correos transaccionales (confirmación / cancelación)
-- Ejecutar en Supabase → SQL Editor (una vez).
--
-- NO hay triggers de correo en la BD: el envío ocurre solo desde la app Next.js.
-- Estas columnas + RPC evitan bucles o duplicados si el cliente reintenta.
-- =============================================================================

alter table public.meetings
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists cancellation_email_sent_at timestamptz;

comment on column public.meetings.confirmation_email_sent_at is
  'Marca de envío único del correo de confirmación (pendiente → confirmada).';
comment on column public.meetings.cancellation_email_sent_at is
  'Marca de envío único del correo de cancelación administrativa.';

-- ---------------------------------------------------------------------------
-- Reclama envío de confirmación (atómico: solo la primera llamada gana)
-- ---------------------------------------------------------------------------
drop function if exists public.claim_meeting_confirmation_email(uuid);

create function public.claim_meeting_confirmation_email(p_meeting_id uuid)
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

  update public.meetings m
  set confirmation_email_sent_at = now()
  where m.id = p_meeting_id
    and m.confirmation_email_sent_at is null
    and lower(trim(m.status)) in ('confirmada', 'confirmed')
    and (m.requester_id = v_uid or m.recipient_id = v_uid)
  returning m.* into v_row;

  return v_row;
end;
$$;

revoke all on function public.claim_meeting_confirmation_email(uuid) from public;
grant execute on function public.claim_meeting_confirmation_email(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reclama envío de cancelación admin (atómico; solo status cancelada_admin)
-- ---------------------------------------------------------------------------
drop function if exists public.claim_meeting_cancellation_email(uuid);

create function public.claim_meeting_cancellation_email(p_meeting_id uuid)
returns public.meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.meetings;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida. Vuelve a iniciar sesión.';
  end if;

  if not public.is_admin_user() then
    raise exception 'Acceso denegado: se requiere rol de administrador.';
  end if;

  update public.meetings m
  set cancellation_email_sent_at = now()
  where m.id = p_meeting_id
    and m.cancellation_email_sent_at is null
    and lower(trim(m.status)) = 'cancelada_admin'
  returning m.* into v_row;

  return v_row;
end;
$$;

revoke all on function public.claim_meeting_cancellation_email(uuid) from public;
grant execute on function public.claim_meeting_cancellation_email(uuid) to authenticated;

notify pgrst, 'reload schema';
