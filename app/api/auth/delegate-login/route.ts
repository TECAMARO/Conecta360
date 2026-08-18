import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import {
  buildDelegateSessionCookieValue,
  delegateSessionCookieOptions,
} from '@/lib/delegate-access/delegate-cookie'
import { normalizeDelegateEmail } from '@/lib/delegate-access/constants'
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

    const { data: ownerProfile, error: profileError } = await service
      .from('profiles')
      .select('id, email')
      .eq('id', row.owner_profile_id)
      .maybeSingle()

    if (profileError || !ownerProfile?.email?.trim()) {
      return NextResponse.json({ error: 'Perfil titular no encontrado.' }, { status: 404 })
    }

    const ownerEmail = ownerProfile.email.trim()

    const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: ownerEmail,
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      return NextResponse.json(
        { error: linkError?.message ?? 'No se pudo iniciar sesión delegada.' },
        { status: 500 },
      )
    }

    const serverSupabase = await createServerSupabaseClient()
    const { data: verified, error: verifyError } = await serverSupabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'email',
    })

    if (verifyError || !verified.session) {
      return NextResponse.json(
        { error: verifyError?.message ?? 'No se pudo establecer la sesión.' },
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
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
      ownerUserId: row.owner_profile_id,
      ownerEmail,
      delegateEmail: row.email,
    })

    response.cookies.set(cookie.name, cookie.value, delegateSessionCookieOptions(cookie.expires))
    return response
  } catch (err) {
    console.error('[auth/delegate-login]', err)
    return NextResponse.json({ error: 'No se pudo iniciar sesión.' }, { status: 500 })
  }
}
