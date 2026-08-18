-- Conecta360 · Migración etiquetas Qué Ofrece (opcional, perfiles ya guardados)
-- Ejecutar en Supabase → SQL Editor si hay usuarios con las etiquetas anteriores.
-- No es obligatorio para usuarios nuevos: la app ya usa el catálogo actualizado.

create or replace function public.migrate_profile_offer_tag_array(tags text[])
returns text[]
language sql
immutable
as $$
  select coalesce(
    array_agg(mapped order by ordinality),
    '{}'::text[]
  )
  from (
    select
      u.ordinality,
      case
        when u.elem = 'Suministro de insumos y proveeduría' then 'Suministro de insumos'
        when u.elem = 'Representación comercial y co-inversión' then 'Estrategia comercial'
        when u.elem = 'Consultoría, inteligencia de mercado y mentoría' then 'Consultoría en sostenibilidad'
        when u.elem = 'Prototipos, proyectos y portafolio de innovación' then 'Asesoría en proyectos'
        when u.elem = 'Capacidad de compra / Demanda comercial' then null
        else u.elem
      end as mapped
    from unnest(coalesce(tags, '{}'::text[])) with ordinality as u(elem, ordinality)
  ) s
  where mapped is not null and btrim(mapped) <> '';
$$;

update public.profiles
set offers = public.migrate_profile_offer_tag_array(offers)
where offers is not null
  and offers && array[
    'Suministro de insumos y proveeduría',
    'Representación comercial y co-inversión',
    'Consultoría, inteligencia de mercado y mentoría',
    'Prototipos, proyectos y portafolio de innovación',
    'Capacidad de compra / Demanda comercial'
  ]::text[];

update public.profiles
set offer_card_tags = public.migrate_profile_offer_tag_array(offer_card_tags)
where offer_card_tags is not null
  and offer_card_tags && array[
    'Suministro de insumos y proveeduría',
    'Representación comercial y co-inversión',
    'Consultoría, inteligencia de mercado y mentoría',
    'Prototipos, proyectos y portafolio de innovación',
    'Capacidad de compra / Demanda comercial'
  ]::text[];

drop function if exists public.migrate_profile_offer_tag_array(text[]);

notify pgrst, 'reload schema';
