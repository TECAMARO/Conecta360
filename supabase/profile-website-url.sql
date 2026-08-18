-- Conecta360 · Página web de la organización (reemplaza dossier/brochure en UI)
-- Ejecutar en Supabase → SQL Editor (una vez).

alter table public.profiles
  add column if not exists website_url text;

comment on column public.profiles.website_url is
  'URL opcional de la página web de la organización (visible solo en Ver Perfil).';

notify pgrst, 'reload schema';
