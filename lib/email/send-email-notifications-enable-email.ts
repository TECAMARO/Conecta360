import {
  buildEmailNotificationsEnableHtml,
  buildEmailNotificationsEnableSubject,
  buildEmailNotificationsEnableText,
} from '@/lib/email/email-notifications-enable-template'
import { sendTransactionalMail } from '@/lib/email/send-transactional-mail'
import {
  getPublicSiteUrl,
  isLocalDevWithoutTransactionalSmtp,
  isTransactionalSmtpConfigured,
} from '@/lib/email/smtp'

export type SendEmailNotificationsEnableResult = {
  sent: boolean
  to?: string
  skippedReason?: string
}

export async function sendEmailNotificationsEnableEmail(args: {
  recipientEmail: string
  recipientName: string
  siteUrl?: string
}): Promise<SendEmailNotificationsEnableResult> {
  const to = args.recipientEmail.trim()
  if (!to) {
    return { sent: false, skippedReason: 'missing_recipient_email' }
  }

  const siteUrl = args.siteUrl ?? getPublicSiteUrl()
  const platformUrl = `${siteUrl.replace(/\/$/, '')}/plataforma?view=agenda`
  const templateData = {
    recipientName: args.recipientName.trim() || 'Participante',
    recipientEmail: to,
    platformUrl,
  }

  if (!isTransactionalSmtpConfigured()) {
    if (isLocalDevWithoutTransactionalSmtp()) {
      console.warn(
        `[EMAIL ENABLE · DEV] Notificaciones para ${to} · ${buildEmailNotificationsEnableSubject()}`,
      )
      return { sent: false, skippedReason: 'smtp_not_configured_dev', to }
    }
    return { sent: false, skippedReason: 'smtp_not_configured' }
  }

  await sendTransactionalMail({
    to,
    subject: buildEmailNotificationsEnableSubject(),
    text: buildEmailNotificationsEnableText(templateData),
    html: buildEmailNotificationsEnableHtml(templateData),
    entityRef: `email-enable:${to}`,
  })

  return { sent: true, to }
}
