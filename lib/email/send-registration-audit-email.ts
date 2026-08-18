import {
  buildRegistrationAuditHtml,
  buildRegistrationAuditSubject,
  buildRegistrationAuditTemplateData,
  buildRegistrationAuditText,
  type RegistrationAuditParticipant,
} from '@/lib/email/registration-audit-template'
import { sendTransactionalMail } from '@/lib/email/send-transactional-mail'
import {
  isLocalDevWithoutTransactionalSmtp,
  isTransactionalSmtpConfigured,
} from '@/lib/email/smtp'

function getTransactionalInboxAddress(): string | null {
  const user = process.env.SMTP_TRANSACTIONAL_USER?.trim()
  return user || null
}

export type SendRegistrationAuditEmailResult = {
  sent: boolean
  to?: string
  skippedReason?: string
}

export async function sendRegistrationAuditEmail(args: {
  newUser: {
    id: string
    full_name: string | null
    organization_name: string | null
    email: string | null
    created_at: string | null
  }
  participants: RegistrationAuditParticipant[]
}): Promise<SendRegistrationAuditEmailResult> {
  const inbox = getTransactionalInboxAddress()
  if (!inbox) {
    return { sent: false, skippedReason: 'missing_transactional_inbox' }
  }

  const templateData = buildRegistrationAuditTemplateData(args)
  const subject = buildRegistrationAuditSubject(templateData.representative)

  if (!isTransactionalSmtpConfigured()) {
    if (isLocalDevWithoutTransactionalSmtp()) {
      console.warn(
        `[REGISTRATION AUDIT EMAIL · DEV] Nuevo registro ${templateData.representative} → ${inbox} · ${templateData.participants.length} participantes`,
      )
      return { sent: false, skippedReason: 'smtp_not_configured_dev', to: inbox }
    }
    console.error('[REGISTRATION AUDIT EMAIL] SMTP transaccional no configurado.')
    return { sent: false, skippedReason: 'smtp_not_configured' }
  }

  await sendTransactionalMail({
    to: inbox,
    subject,
    text: buildRegistrationAuditText(templateData),
    html: buildRegistrationAuditHtml(templateData),
    entityRef: args.newUser.id,
  })

  return { sent: true, to: inbox }
}
