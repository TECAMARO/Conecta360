-- Conecta360 · Sectores múltiples en perfil (máx. 3; sector = principal legacy)
-- Ejecutar en Supabase → SQL Editor (una vez).

alter table public.profiles
  add column if not exists sectors text[] default null;

comment on column public.profiles.sectors is
  'Hasta 3 sectores económicos; sector (text) conserva el principal para compatibilidad.';

update public.profiles
set sectors = array[sector]::text[]
where sectors is null
  and sector is not null
  and btrim(sector) <> '';

notify pgrst, 'reload schema';
