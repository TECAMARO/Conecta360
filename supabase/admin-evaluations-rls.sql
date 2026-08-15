-- Conecta360 · Lectura de evaluaciones para panel admin (/admin/dashboard)
-- Ejecutar en Supabase SQL Editor si las métricas de satisfacción aparecen en 0.

begin;

alter table public.evaluations enable row level security;

drop policy if exists "evaluations_select_admin_all" on public.evaluations;
create policy "evaluations_select_admin_all"
  on public.evaluations
  for select
  to authenticated
  using (public.is_admin_user());

notify pgrst, 'reload schema';

commit;
