-- Conecta360 · Etiquetas destacadas en tarjeta de Explorar Participantes (máx. 5 c/u)
-- Ejecutar en Supabase → SQL Editor (una vez).

alter table public.profiles
  add column if not exists offer_card_tags text[] default null;

alter table public.profiles
  add column if not exists seeking_card_tags text[] default null;

comment on column public.profiles.offer_card_tags is
  'Hasta 5 etiquetas de offers visibles en tarjeta del directorio (orden interno).';

comment on column public.profiles.seeking_card_tags is
  'Hasta 5 etiquetas de seeks visibles en tarjeta del directorio (orden interno).';

notify pgrst, 'reload schema';
