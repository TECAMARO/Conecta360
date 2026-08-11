-- Conecta360 · Doble candado: receptor solo puede responder filas aún pendientes
-- Ejecutar en Supabase SQL Editor.
--
-- Si el emisor canceló (status = cancelada_enviada), la cláusula USING no coincide
-- y el UPDATE del receptor afecta 0 filas.

begin;

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

commit;
