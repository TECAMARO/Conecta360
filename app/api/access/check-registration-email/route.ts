import { NextResponse } from 'next/server'
import { REGISTRATION_CREDENTIAL_IN_USE_MESSAGE } from '@/lib/delegate-access/constants'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'

/** Guard server-side antes de signUp. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string }
    const email = body.email?.trim() ?? ''

    if (!email) {
      return NextResponse.json({ available: false })
    }

    const service = createServiceRoleSupabaseClient()
    const { data: available, error } = await service.rpc('is_email_available_for_registration', {
      p_email: email,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!available) {
      return NextResponse.json({
        available: false,
        message: REGISTRATION_CREDENTIAL_IN_USE_MESSAGE,
      })
    }

    return NextResponse.json({ available: true })
  } catch (err) {
    console.error('[access/check-registration-email]', err)
    return NextResponse.json({ error: 'No se pudo verificar el correo.' }, { status: 500 })
  }
}
