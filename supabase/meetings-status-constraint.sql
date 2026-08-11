-- Conecta360 · Estados válidos en public.meetings.status + RLS para cancelar/responder
-- Ejecutar en Supabase SQL Editor.
--
-- Valores que escribe el frontend/backend (español canónico):
--   pendiente, confirmada, rechazada, cancelada_enviada,
--   cancelada_conflicto, anulada_por_cruce, anulada_por_limite, completada
-- Alias legacy en inglés admitidos por compatibilidad de lectura.

begin;

-- ---------------------------------------------------------------------------
-- 1. Redefinir CHECK constraint de status
-- ---------------------------------------------------------------------------
alter table public.meetings
  drop constraint if exists meetings_status_check;

alter table public.meetings
  add constraint meetings_status_check
  check (
    status in (
      -- Español (valores canónicos del código)
      'pendiente',
      'confirmada',
      'rechazada',
      'cancelada_enviada',
      'cancelada_conflicto',
      'anulada_por_cruce',
      'anulada_por_limite',
      'completada',
      -- Inglés (filas legacy / compatibilidad)
      'pending',
      'confirmed',
      'rejected',
      'cancelled',
      'canceled',
      'completed'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. RLS: permitir transiciones de estado a participantes
--    (La política previa meetings_update_pending_table bloqueaba with check status=pendiente)
-- ---------------------------------------------------------------------------
alter table public.meetings enable row level security;

drop policy if exists "meetings_update_pending_table" on public.meetings;
create policy "meetings_update_pending_table"
  on public.meetings
  for update
  to authenticated
  using (
    status in ('pendiente', 'pending')
    and (requester_id = auth.uid() or recipient_id = auth.uid())
  )
  with check (
    status in ('pendiente', 'pending')
    and (requester_id = auth.uid() or recipient_id = auth.uid())
    and table_number between 1 and 6
  );

-- Solicitante cancela su propia solicitud pendiente
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

-- Receptor acepta o rechaza solicitud pendiente (USING estricto: fila debe seguir pendiente)
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
    and status in (
      'confirmada', 'rechazada',
      'confirmed', 'rejected'
    )
  );

-- Participantes marcan reunión como completada tras evaluación
drop policy if exists "meetings_update_participant_complete" on public.meetings;
create policy "meetings_update_participant_complete"
  on public.meetings
  for update
  to authenticated
  using (
    (requester_id = auth.uid() or recipient_id = auth.uid())
    and status in ('confirmada', 'confirmed', 'completada', 'completed')
  )
  with check (
    (requester_id = auth.uid() or recipient_id = auth.uid())
    and status in ('completada', 'completed')
  );

commit;
