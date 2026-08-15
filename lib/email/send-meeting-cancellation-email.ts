import {
  buildMeetingCancellationHtml,
  buildMeetingCancellationSubject,
  buildMeetingCancellationTemplateData,
  buildMeetingCancellationText,
} from '@/lib/email/meeting-cancellation-template'
import { displayOrg } from '@/lib/email/meeting-email-shared'
import {
  createSmtpTransport,
  getPublicSiteUrl,
  getSmtpFromAddress,
  isLocalDevWithoutSmtp,
  isSmtpConfigured,
} from '@/lib/email/smtp'
import type { MeetingRow, ProfileRow } from '@/lib/supabase/database.types'

export type SendMeetingCancellationResult = {
  sent: boolean
  recipients: string[]
  skippedReason?: string
}

/**
 * Envía correo de cancelación anónima a ambas partes (solicitante y confirmante).
 * Solo aplica tras cancelación administrativa (status cancelada_admin).
 */
export async function sendMeetingCancellationEmails(args: {
  meeting: MeetingRow
  requesterProfile: ProfileRow
  recipientProfile: ProfileRow
  siteUrl?: string
}): Promise<SendMeetingCancellationResult> {
  const { meeting, requesterProfile, recipientProfile } = args
  const siteUrl = args.siteUrl ?? getPublicSiteUrl()

  const parties = [
    { profile: requesterProfile, counterparty: recipientProfile },
    { profile: recipientProfile, counterparty: requesterProfile },
  ]

  const recipients: string[] = []
  const subject = buildMeetingCancellationSubject()

  if (!isSmtpConfigured()) {
    if (isLocalDevWithoutSmtp()) {
      for (const party of parties) {
        const email = party.profile.email?.trim()
        if (!email) continue
        const templateData = buildMeetingCancellationTemplateData({
          day: meeting.day,
          slotTime: meeting.slot_time,
          tableNumber: meeting.table_number,
          recipientOrganization: displayOrg(party.profile),
          counterpartyOrganization: displayOrg(party.counterparty),
          siteUrl,
        })
        console.warn(
          `[MEETING CANCEL EMAIL · DEV] Cancelación para ${email} · ` +
            `${templateData.meetingDateLabel} ${templateData.startTime}–${templateData.endTime} · ${templateData.tableLabel}`,
        )
        recipients.push(email)
      }
      if (recipients.length === 0) {
        return { sent: false, recipients: [], skippedReason: 'missing_participant_emails' }
      }
      return { sent: false, recipients, skippedReason: 'smtp_not_configured_dev' }
    }
    console.error('[MEETING CANCEL EMAIL] SMTP no configurado; correo omitido.')
    return { sent: false, recipients: [], skippedReason: 'smtp_not_configured' }
  }

  const from = getSmtpFromAddress('noreply@conecta360.local')
  const transport = createSmtpTransport()

  for (const party of parties) {
    const email = party.profile.email?.trim()
    if (!email) continue

    const templateData = buildMeetingCancellationTemplateData({
      day: meeting.day,
      slotTime: meeting.slot_time,
      tableNumber: meeting.table_number,
      recipientOrganization: displayOrg(party.profile),
      counterpartyOrganization: displayOrg(party.counterparty),
      siteUrl,
    })

    await transport.sendMail({
      from,
      to: email,
      subject,
      text: buildMeetingCancellationText(templateData),
      html: buildMeetingCancellationHtml(templateData),
    })
    recipients.push(email)
  }

  if (recipients.length === 0) {
    return { sent: false, recipients: [], skippedReason: 'missing_participant_emails' }
  }

  return { sent: true, recipients }
}
