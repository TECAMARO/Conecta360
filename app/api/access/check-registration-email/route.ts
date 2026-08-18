import { NextResponse } from 'next/server'
import {
  normalizeDelegateEmail,
  REGISTRATION_CREDENTIAL_IN_USE_MESSAGE,
} from '@/lib/delegate-access/constants'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'

async function isEmailBlockedForRegistration(email: string): Promise<boolean> {
  const normalized = normalizeDelegateEmail(email)
  if (!normalized) return true

  const service = createServiceRoleSupabaseClient()

  const { data: rpcAvailable, error: rpcError } = await service.rpc(
    'is_email_available_for_registration',
    { p_email: email },
  )

  if (!rpcError && typeof rpcAvailable === 'boolean') {
    return !rpcAvailable
  }

  const [{ data: delegated }, { data: profile }] = await Promise.all([
    service
      .from('profile_delegated_access')
      .select('id')
      .eq('email_normalized', normalized)
      .eq('is_active', true)
      .maybeSingle(),
    service.from('profiles').select('id').ilike('email', normalized).maybeSingle(),
  ])

  if (delegated || profile) return true

  const { data: listed, error: listError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) {
    console.warn('[check-registration-email] listUsers fallback failed:', listError.message)
    return false
  }

  return listed.users.some((user) => normalizeDelegateEmail(user.email ?? '') === normalized)
}

/** Guard opcional antes de signUp — nunca bloquea el registro por fallo técnico. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string }
    const email = body.email?.trim() ?? ''

    if (!email) {
      return NextResponse.json({
        available: false,
        message: REGISTRATION_CREDENTIAL_IN_USE_MESSAGE,
      })
    }

    let blocked = false
    try {
      blocked = await isEmailBlockedForRegistration(email)
    } catch (err) {
      console.warn('[check-registration-email] check skipped:', err)
      return NextResponse.json({ available: true, checkSkipped: true })
    }

    if (blocked) {
      return NextResponse.json({
        available: false,
        message: REGISTRATION_CREDENTIAL_IN_USE_MESSAGE,
      })
    }

    return NextResponse.json({ available: true })
  } catch (err) {
    console.error('[check-registration-email]', err)
    return NextResponse.json({ available: true, checkSkipped: true })
  }
}
