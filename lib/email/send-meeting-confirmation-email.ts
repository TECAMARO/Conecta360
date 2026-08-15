import {
  buildMeetingConfirmationHtml,
  buildMeetingConfirmationSubject,
  buildMeetingConfirmationTemplateData,
  buildMeetingConfirmationText,
} from '@/lib/email/meeting-confirmation-template'
import { displayOrg } from '@/lib/email/meeting-email-shared'
import {
  createSmtpTransport,
  getPublicSiteUrl,
  getSmtpFromAddress,
  isLocalDevWithoutSmtp,
  isSmtpConfigured,
} from '@/lib/email/smtp'
import type { MeetingRow, ProfileRow } from '@/lib/supabase/database.types'
import { dbMeetingStatusToApp } from '@/lib/supabase/meeting-status'

export type SendMeetingConfirmationResult = {
  sent: boolean
  to?: string
  cc?: string
  skippedReason?: string
}

function isConfirmedStatus(status: string): boolean {
  const app = dbMeetingStatusToApp(status.trim().toLowerCase())
  return app === 'confirmada'
}

/**
 * Envía correo transaccional al solicitante (Empresa A) cuando la reunión queda confirmada.
 * CC opcional al confirmante (Empresa B). Fallos de SMTP no deben revertir la confirmación en BD.
 */
export async function sendMeetingConfirmationEmail(args: {
  meeting: MeetingRow
  requesterProfile: ProfileRow
  recipientProfile: ProfileRow
  siteUrl?: string
}): Promise<SendMeetingConfirmationResult> {
  const { meeting, requesterProfile, recipientProfile } = args

  if (!isConfirmedStatus(meeting.status)) {
    return { sent: false, skippedReason: 'not_confirmed' }
  }

  const requesterEmail = requesterProfile.email?.trim()
  if (!requesterEmail) {
    return { sent: false, skippedReason: 'missing_requester_email' }
  }

  const recipientEmail = recipientProfile.email?.trim() || undefined
  const siteUrl = args.siteUrl ?? getPublicSiteUrl()

  const templateData = buildMeetingConfirmationTemplateData({
    day: meeting.day,
    slotTime: meeting.slot_time,
    tableNumber: meeting.table_number,
    requesterOrganization: displayOrg(requesterProfile),
    counterpartyOrganization: displayOrg(recipientProfile),
    siteUrl,
  })

  const subject = buildMeetingConfirmationSubject()
  const text = buildMeetingConfirmationText(templateData)
  const html = buildMeetingConfirmationHtml(templateData)

  if (!isSmtpConfigured()) {
    if (isLocalDevWithoutSmtp()) {
      console.warn(
        `[MEETING EMAIL · DEV] Confirmación para ${requesterEmail}` +
          (recipientEmail ? ` (cc: ${recipientEmail})` : '') +
          ` · ${templateData.meetingDateLabel} ${templateData.startTime}–${templateData.endTime} · ${templateData.tableLabel}`,
      )
      return { sent: false, skippedReason: 'smtp_not_configured_dev', to: requesterEmail, cc: recipientEmail }
    }
    console.error('[MEETING EMAIL] SMTP no configurado; correo de confirmación omitido.')
    return { sent: false, skippedReason: 'smtp_not_configured' }
  }

  const from = getSmtpFromAddress(requesterEmail)
  const transport = createSmtpTransport()

  await transport.sendMail({
    from,
    to: requesterEmail,
    ...(recipientEmail ? { cc: recipientEmail } : {}),
    subject,
    text,
    html,
  })

  return { sent: true, to: requesterEmail, cc: recipientEmail }
}
