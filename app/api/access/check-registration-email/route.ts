import { NextResponse } from 'next/server'
import {
  DELEGATE_CANNOT_REGISTER_MESSAGE,
  normalizeDelegateEmail,
  REGISTRATION_CREDENTIAL_IN_USE_MESSAGE,
} from '@/lib/delegate-access/constants'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'

type RegistrationBlockReason = 'delegate' | 'existing' | null

async function getRegistrationBlockReason(email: string): Promise<RegistrationBlockReason> {
  const normalized = normalizeDelegateEmail(email)
  if (!normalized) return 'existing'

  const service = createServiceRoleSupabaseClient()

  const { data: delegated } = await service
    .from('profile_delegated_access')
    .select('id')
    .eq('email_normalized', normalized)
    .eq('is_active', true)
    .maybeSingle()

  if (delegated) return 'delegate'

  const { data: rpcAvailable, error: rpcError } = await service.rpc(
    'is_email_available_for_registration',
    { p_email: email },
  )

  if (!rpcError && typeof rpcAvailable === 'boolean') {
    return rpcAvailable ? null : 'existing'
  }

  const { data: profile } = await service
    .from('profiles')
    .select('id')
    .ilike('email', normalized)
    .maybeSingle()

  if (profile) return 'existing'

  const { data: listed, error: listError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) {
    console.warn('[check-registration-email] listUsers fallback failed:', listError.message)
    return null
  }

  const existsInAuth = listed.users.some(
    (user) => normalizeDelegateEmail(user.email ?? '') === normalized,
  )
  return existsInAuth ? 'existing' : null
}

function messageForBlockReason(reason: RegistrationBlockReason): string {
  if (reason === 'delegate') return DELEGATE_CANNOT_REGISTER_MESSAGE
  return REGISTRATION_CREDENTIAL_IN_USE_MESSAGE
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

    let blockReason: RegistrationBlockReason = null
    try {
      blockReason = await getRegistrationBlockReason(email)
    } catch (err) {
      console.warn('[check-registration-email] check skipped:', err)
      return NextResponse.json({ available: true, checkSkipped: true })
    }

    if (blockReason) {
      return NextResponse.json({
        available: false,
        reason: blockReason,
        message: messageForBlockReason(blockReason),
      })
    }

    return NextResponse.json({ available: true })
  } catch (err) {
    console.error('[check-registration-email]', err)
    return NextResponse.json({ available: true, checkSkipped: true })
  }
}
