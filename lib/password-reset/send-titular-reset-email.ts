import {
  buildPasswordResetHtml,
  buildPasswordResetSubject,
  buildPasswordResetText,
} from '@/lib/email/password-reset-template'
import { sendTransactionalMail } from '@/lib/email/send-transactional-mail'
import { getEmailSiteUrl } from '@/lib/email/site-url'
import { isTransactionalSmtpConfigured } from '@/lib/email/smtp'
import { normalizeDelegateEmail } from '@/lib/delegate-access/constants'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export async function sendTitularPasswordResetEmail(args: {
  email: string
  siteUrl?: string
}): Promise<boolean> {
  const email = args.email.trim()
  const normalized = normalizeDelegateEmail(email)
  if (!normalized) return false

  if (!isTransactionalSmtpConfigured()) {
    throw new Error('SMTP transaccional no configurado para enviar restablecimiento.')
  }

  const siteUrl = (args.siteUrl ?? getEmailSiteUrl()).replace(/\/$/, '')
  const redirectTo = `${siteUrl}/login/nueva-contrasena`
  const service = createServiceRoleSupabaseClient()

  const { data, error } = await service.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (error || !data.properties?.action_link) {
    return false
  }

  const resetUrl = data.properties.action_link

  await sendTransactionalMail({
    to: email,
    subject: buildPasswordResetSubject(),
    text: buildPasswordResetText({ resetUrl }),
    html: buildPasswordResetHtml({ resetUrl }),
    entityRef: `password-reset:${normalized}`,
  })

  return true
}
