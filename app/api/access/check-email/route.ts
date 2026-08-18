import { NextResponse } from 'next/server'
import {
  DELEGATE_EMAIL_AVAILABLE_MESSAGE,
  DELEGATE_EMAIL_UNAVAILABLE_MESSAGE,
} from '@/lib/delegate-access/constants'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** Verifica disponibilidad de correo para Accesos (mensaje genérico si no disponible). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string }
    const email = body.email?.trim() ?? ''

    if (!email) {
      return NextResponse.json({ available: false, message: DELEGATE_EMAIL_UNAVAILABLE_MESSAGE })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { data: available, error } = await supabase.rpc('check_email_available_for_delegate', {
      p_email: email,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!available) {
      return NextResponse.json({
        available: false,
        message: DELEGATE_EMAIL_UNAVAILABLE_MESSAGE,
      })
    }

    return NextResponse.json({
      available: true,
      message: DELEGATE_EMAIL_AVAILABLE_MESSAGE,
    })
  } catch (err) {
    console.error('[access/check-email]', err)
    return NextResponse.json({ error: 'No se pudo verificar el correo.' }, { status: 500 })
  }
}
