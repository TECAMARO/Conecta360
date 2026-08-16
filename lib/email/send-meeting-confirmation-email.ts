import {
  buildMeetingConfirmationHtml,
  buildMeetingConfirmationSubject,
  buildMeetingConfirmationTemplateData,
  buildMeetingConfirmationText,
} from '@/lib/email/meeting-confirmation-template'
import { displayOrg } from '@/lib/email/meeting-email-shared'
import { sendTransactionalMail } from '@/lib/email/send-transactional-mail'
import {
  getPublicSiteUrl,
  isLocalDevWithoutTransactionalSmtp,
  isTransactionalSmtpConfigured,
} from '@/lib/email/smtp'
import type { MeetingRow, ProfileRow } from '@/lib/supabase/database.types'
import { dbMeetingStatusToApp } from '@/lib/supabase/meeting-status'

export type SendMeetingConfirmationResult = {
  sent: boolean
  to?: string[]
  skippedReason?: string
}

function isConfirmedStatus(status: string): boolean {
  const app = dbMeetingStatusToApp(status.trim().toLowerCase())
  return app === 'confirmada'
}

/**
 * Envía correo transaccional al solicitante (Empresa A) y comprobante al confirmante (B).
 * Sin CC (mejor entregabilidad). OTP admin no usa este módulo.
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
  const subject = buildMeetingConfirmationSubject()

  const parties = [
    {
      email: requesterEmail,
      greetingOrg: displayOrg(requesterProfile),
      counterpartyOrg: displayOrg(recipientProfile),
    },
    ...(recipientEmail && recipientEmail.toLowerCase() !== requesterEmail.toLowerCase()
      ? [
          {
            email: recipientEmail,
            greetingOrg: displayOrg(recipientProfile),
            counterpartyOrg: displayOrg(requesterProfile),
          },
        ]
      : []),
  ]

  if (!isTransactionalSmtpConfigured()) {
    if (isLocalDevWithoutTransactionalSmtp()) {
      for (const party of parties) {
        const templateData = buildMeetingConfirmationTemplateData({
          day: meeting.day,
          slotTime: meeting.slot_time,
          tableNumber: meeting.table_number,
          requesterOrganization: party.greetingOrg,
          counterpartyOrganization: party.counterpartyOrg,
          siteUrl,
        })
        console.warn(
          `[MEETING EMAIL · DEV] Confirmación para ${party.email} · ` +
            `${templateData.meetingDateLabel} ${templateData.startTime}–${templateData.endTime} · ${templateData.tableLabel}`,
        )
      }
      return {
        sent: false,
        skippedReason: 'smtp_not_configured_dev',
        to: parties.map((p) => p.email),
      }
    }
    console.error('[MEETING EMAIL] SMTP no configurado; correo de confirmación omitido.')
    return { sent: false, skippedReason: 'smtp_not_configured' }
  }

  for (const party of parties) {
    const templateData = buildMeetingConfirmationTemplateData({
      day: meeting.day,
      slotTime: meeting.slot_time,
      tableNumber: meeting.table_number,
      requesterOrganization: party.greetingOrg,
      counterpartyOrganization: party.counterpartyOrg,
      siteUrl,
    })

    await sendTransactionalMail({
      to: party.email,
      subject,
      text: buildMeetingConfirmationText(templateData),
      html: buildMeetingConfirmationHtml(templateData),
      entityRef: meeting.id,
    })
  }

  return { sent: true, to: parties.map((p) => p.email) }
}
