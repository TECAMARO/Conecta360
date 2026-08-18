-- Conecta360 · Ortografía sector financiero (opcional si ya hay perfiles con el valor anterior)
-- Ejecutar en Supabase → SQL Editor si existían registros con "Sector financiero / banca".

update public.profiles
set sector = 'Sector financiero / Banca'
where sector = 'Sector financiero / banca';

update public.profiles
set sectors = (
  select coalesce(
    array_agg(
      case
        when elem = 'Sector financiero / banca' then 'Sector financiero / Banca'
        else elem
      end
    ),
    '{}'::text[]
  )
  from unnest(sectors) as elem
)
where sectors is not null
  and 'Sector financiero / banca' = any (sectors);

notify pgrst, 'reload schema';
