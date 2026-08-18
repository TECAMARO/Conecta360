import { NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import {
  buildDelegateSessionCookieValue,
  delegateSessionCookieOptions,
} from '@/lib/delegate-access/delegate-cookie'
import { normalizeDelegateEmail } from '@/lib/delegate-access/constants'
import { establishOwnerSessionForDelegate } from '@/lib/delegate-access/establish-owner-session'
import { verifyDelegatePassword } from '@/lib/delegate-access/password'

export const runtime = 'nodejs'

type DelegateRow = {
  id: string
  owner_profile_id: string
  email: string
  password_hash: string
  is_active: boolean
}

/**
 * Login delegado: valida credenciales propias y emite sesión Supabase del titular
 * (impersonación controlada vía magic link + verifyOtp).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string }
    const email = body.email?.trim() ?? ''
    const password = body.password ?? ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo y contraseña requeridos.' }, { status: 400 })
    }

    const normalized = normalizeDelegateEmail(email)
    const service = createServiceRoleSupabaseClient()

    const { data: delegate, error: delegateError } = await service
      .from('profile_delegated_access')
      .select('id, owner_profile_id, email, password_hash, is_active')
      .eq('email_normalized', normalized)
      .eq('is_active', true)
      .maybeSingle()

    if (delegateError) {
      console.error('[auth/delegate-login] delegate lookup:', delegateError.message)
      return NextResponse.json({ error: delegateError.message }, { status: 500 })
    }

    const row = delegate as DelegateRow | null
    if (!row) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 })
    }

    const valid = await verifyDelegatePassword(password, row.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 })
    }

    let ownerSession: Awaited<ReturnType<typeof establishOwnerSessionForDelegate>>
    try {
      ownerSession = await establishOwnerSessionForDelegate({
        serviceClient: service,
        ownerUserId: row.owner_profile_id,
      })
    } catch (sessionErr) {
      const message =
        sessionErr instanceof Error
          ? sessionErr.message
          : 'No se pudo establecer la sesión del titular.'
      console.error('[auth/delegate-login] owner session:', message)
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const { session, ownerEmail } = ownerSession

    if (!session.access_token || !session.refresh_token) {
      console.error('[auth/delegate-login] incomplete session tokens')
      return NextResponse.json(
        { error: 'No se pudo obtener una sesión válida del titular.' },
        { status: 500 },
      )
    }

    await service
      .from('profile_delegated_access')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', row.id)

    const cookie = await buildDelegateSessionCookieValue({
      ownerUserId: row.owner_profile_id,
      delegateEmail: row.email,
      delegateAccessId: row.id,
    })

    const response = NextResponse.json({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      ownerUserId: row.owner_profile_id,
      ownerEmail,
      delegateEmail: row.email,
    })

    response.cookies.set(cookie.name, cookie.value, delegateSessionCookieOptions(cookie.expires))
    return response
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'No se pudo iniciar sesión.'
    console.error('[auth/delegate-login]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
