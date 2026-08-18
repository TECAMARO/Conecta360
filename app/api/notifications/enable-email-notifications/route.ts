import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DELEGATE_SESSION_COOKIE } from '@/lib/delegate-access/constants'
import { parseDelegateSessionCookie } from '@/lib/delegate-access/delegate-cookie'
import { resolveEmailOrigin } from '@/lib/email/meeting-email-shared'
import { sendEmailNotificationsEnableEmail } from '@/lib/email/send-email-notifications-enable-email'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** Envía correo de habilitación al titular o al delegado (según contexto). */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { delegateEmail?: string }
    const requestedDelegateEmail = body.delegateEmail?.trim()

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const delegateCtx = await parseDelegateSessionCookie(
      cookieStore.get(DELEGATE_SESSION_COOKIE)?.value,
    )

    let targetEmail = user.email?.trim() ?? ''

    if (requestedDelegateEmail) {
      if (
        !delegateCtx ||
        delegateCtx.ownerUserId !== user.id ||
        delegateCtx.delegateEmail.trim().toLowerCase() !==
          requestedDelegateEmail.trim().toLowerCase()
      ) {
        return NextResponse.json({ error: 'No autorizado para este correo delegado.' }, { status: 403 })
      }
      targetEmail = requestedDelegateEmail
    } else if (delegateCtx && delegateCtx.ownerUserId === user.id) {
      return NextResponse.json(
        { error: 'En sesión delegada solo puedes habilitar tu correo delegado.' },
        { status: 403 },
      )
    }

    if (!targetEmail) {
      return NextResponse.json({ error: 'Tu cuenta no tiene correo registrado.' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, organization_name, job_title')
      .eq('id', user.id)
      .maybeSingle()

    const recipientName =
      profile?.organization_name?.trim() ||
      profile?.full_name?.trim() ||
      targetEmail.split('@')[0] ||
      'Participante'

    const result = await sendEmailNotificationsEnableEmail({
      recipientEmail: targetEmail,
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
