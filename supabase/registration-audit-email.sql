-- =============================================================================
-- Conecta360 · Idempotencia correo de auditoría por nuevo registro
-- Ejecutar en Supabase → SQL Editor (una vez).
-- =============================================================================

alter table public.profiles
  add column if not exists registration_audit_email_sent_at timestamptz;

comment on column public.profiles.registration_audit_email_sent_at is
  'Marca de envío único del correo de auditoría admin por nuevo participante.';

-- ---------------------------------------------------------------------------
-- Reclama envío y devuelve nuevo usuario + listado de participantes (sin admin)
-- ---------------------------------------------------------------------------
drop function if exists public.claim_profile_registration_audit_email();

create function public.claim_profile_registration_audit_email()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new public.profiles;
begin
  if v_uid is null then
    raise exception 'Sesión no válida. Vuelve a iniciar sesión.';
  end if;

  update public.profiles p
  set registration_audit_email_sent_at = now()
  where p.id = v_uid
    and p.registration_audit_email_sent_at is null
    and coalesce(p.role, 'user') <> 'admin'
  returning * into v_new;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'newUser', to_jsonb(v_new),
    'participants', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', pr.id,
            'full_name', pr.full_name,
            'organization_name', pr.organization_name,
            'email', pr.email,
            'created_at', pr.created_at
          )
          order by pr.created_at asc nulls last, pr.full_name asc
        )
        from public.profiles pr
        where coalesce(pr.role, 'user') <> 'admin'
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.claim_profile_registration_audit_email() from public;
grant execute on function public.claim_profile_registration_audit_email() to authenticated;

-- ---------------------------------------------------------------------------
-- Libera claim si falla el envío SMTP
-- ---------------------------------------------------------------------------
drop function if exists public.release_profile_registration_audit_email_claim();

create function public.release_profile_registration_audit_email_claim()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  update public.profiles
  set registration_audit_email_sent_at = null
  where id = v_uid
    and registration_audit_email_sent_at is not null;
end;
$$;

revoke all on function public.release_profile_registration_audit_email_claim() from public;
grant execute on function public.release_profile_registration_audit_email_claim() to authenticated;

notify pgrst, 'reload schema';
