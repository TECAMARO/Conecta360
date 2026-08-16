import { NextResponse } from 'next/server'
import { resolveEmailOrigin } from '@/lib/email/meeting-email-shared'
import { sendEmailNotificationsEnableEmail } from '@/lib/email/send-email-notifications-enable-email'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** Envía correo de habilitación al email del usuario autenticado (Mi Agenda). */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const email = user.email?.trim()
    if (!email) {
      return NextResponse.json({ error: 'Tu cuenta no tiene correo registrado.' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, organization_name')
      .eq('id', user.id)
      .maybeSingle()

    const recipientName =
      profile?.organization_name?.trim() ||
      profile?.full_name?.trim() ||
      email.split('@')[0] ||
      'Participante'

    const result = await sendEmailNotificationsEnableEmail({
      recipientEmail: email,
      recipientName,
      siteUrl: resolveEmailOrigin(request),
    })

    if (!result.sent) {
      return NextResponse.json({ ok: false, ...result }, { status: 502 })
    }

    return NextResponse.json({ ok: true, sent: true, to: result.to })
  } catch (err) {
    console.error('[enable-email-notifications]', err)
    return NextResponse.json(
      {
        ok: false,
        sent: false,
        error: err instanceof Error ? err.message : 'Error al enviar correo.',
      },
      { status: 502 },
    )
  }
}
