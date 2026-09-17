import { NextResponse } from 'next/server'
import {
  upsertDelegateCredentialVault,
  upsertOwnerCredentialVault,
} from '@/lib/admin-support/credential-vault'
import { verifySupportApiRequest } from '@/lib/admin/verify-support-api'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'

type Body = {
  profileId?: string
  credentialKind?: 'owner' | 'delegate'
  delegateAccessId?: string
  password?: string
}

/** Registra en bóveda una contraseña conocida (no cambia auth; solo visible en Soporte). */
export async function POST(request: Request) {
  const auth = await verifySupportApiRequest()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Verificación Soporte requerida.' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const profileId = body.profileId?.trim()
  const password = body.password ?? ''
  const kind = body.credentialKind

  if (!profileId || !kind || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Perfil, tipo y contraseña (mín. 8 caracteres) son obligatorios.' },
      { status: 400 },
    )
  }

  const service = createServiceRoleSupabaseClient()

  if (kind === 'owner') {
    const { data: profile, error } = await service
      .from('profiles')
      .select('id, email, role')
      .eq('id', profileId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!profile?.email) {
      return NextResponse.json({ error: 'Perfil no válido.' }, { status: 400 })
    }

    await upsertOwnerCredentialVault({
      profileId: profile.id,
      email: profile.email,
      password,
    })

    return NextResponse.json({ ok: true })
  }

  const delegateAccessId = body.delegateAccessId?.trim()
  if (!delegateAccessId) {
    return NextResponse.json({ error: 'ID de acceso delegado requerido.' }, { status: 400 })
  }

  const { data: delegate, error: delegateError } = await service
    .from('profile_delegated_access')
    .select('id, owner_profile_id, email, is_active')
    .eq('id', delegateAccessId)
    .eq('owner_profile_id', profileId)
    .maybeSingle()

  if (delegateError) {
    return NextResponse.json({ error: delegateError.message }, { status: 500 })
  }
  if (!delegate?.email || !delegate.is_active) {
    return NextResponse.json({ error: 'Acceso delegado no encontrado.' }, { status: 400 })
  }

  await upsertDelegateCredentialVault({
    profileId: delegate.owner_profile_id,
    delegateAccessId: delegate.id,
    email: delegate.email,
    password,
  })

  return NextResponse.json({ ok: true })
}
