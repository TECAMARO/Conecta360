import { NextResponse } from 'next/server'
import { resolveEmailOrigin } from '@/lib/email/meeting-email-shared'
import { resetDelegatePasswordAccess } from '@/lib/password-reset/reset-delegate-password'
import { sendTitularPasswordResetEmail } from '@/lib/password-reset/send-titular-reset-email'
import { verifySupportApiRequest } from '@/lib/admin/verify-support-api'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'

type Body = {
  profileId?: string
  credentialKind?: 'owner' | 'delegate'
  delegateAccessId?: string
}

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
  const kind = body.credentialKind
  const siteUrl = resolveEmailOrigin(request)
  const service = createServiceRoleSupabaseClient()

  if (kind === 'owner') {
    if (!profileId) {
      return NextResponse.json({ error: 'Perfil requerido.' }, { status: 400 })
    }

    const { data: profile, error } = await service
      .from('profiles')
      .select('id, email, role')
      .eq('id', profileId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!profile?.email || profile.role === 'admin') {
      return NextResponse.json({ error: 'Perfil titular no válido.' }, { status: 400 })
    }

    const sent = await sendTitularPasswordResetEmail({ email: profile.email, siteUrl })
    if (!sent) {
      return NextResponse.json({ error: 'No se pudo generar el enlace de restablecimiento.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, sentTo: profile.email, kind: 'owner' })
  }

  if (kind === 'delegate') {
    const delegateAccessId = body.delegateAccessId?.trim()
    if (!delegateAccessId) {
      return NextResponse.json({ error: 'ID delegado requerido.' }, { status: 400 })
    }

    const result = await resetDelegatePasswordAccess({ delegateAccessId, siteUrl })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      kind: 'delegate',
      delegateEmail: result.delegateEmail,
      message: 'Contraseña delegada restablecida. El titular recibió copia por correo y en Accesos.',
    })
  }

  return NextResponse.json({ error: 'Tipo de credencial inválido.' }, { status: 400 })
}
