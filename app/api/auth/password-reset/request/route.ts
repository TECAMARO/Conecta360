import { NextResponse } from 'next/server'
import { resolveEmailOrigin } from '@/lib/email/meeting-email-shared'
import { PASSWORD_RESET_GENERIC_MESSAGE } from '@/lib/password-reset/constants'
import { resetDelegatePasswordAccess } from '@/lib/password-reset/reset-delegate-password'
import { resolvePasswordResetAccountType } from '@/lib/password-reset/resolve-account-type'
import { sendTitularPasswordResetEmail } from '@/lib/password-reset/send-titular-reset-email'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string }
    const email = body.email?.trim() ?? ''

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Ingresa un correo válido.' }, { status: 400 })
    }

    const siteUrl = resolveEmailOrigin(request)
    const account = await resolvePasswordResetAccountType(email)

    if (account.type === 'titular') {
      await sendTitularPasswordResetEmail({ email, siteUrl })
    } else if (account.type === 'delegate' && account.delegateAccessId) {
      const result = await resetDelegatePasswordAccess({
        delegateAccessId: account.delegateAccessId,
        siteUrl,
      })
      if (!result.ok) {
        console.error('[password-reset/request delegate]', result.error)
      }
    }

    return NextResponse.json({
      ok: true,
      message: PASSWORD_RESET_GENERIC_MESSAGE,
    })
  } catch (err) {
    console.error('[password-reset/request]', err)
    return NextResponse.json({
      ok: true,
      message: PASSWORD_RESET_GENERIC_MESSAGE,
    })
  }
}
