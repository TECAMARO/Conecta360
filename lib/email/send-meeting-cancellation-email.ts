import {
  buildMeetingCancellationHtml,
  buildMeetingCancellationSubject,
  buildMeetingCancellationTemplateData,
  buildMeetingCancellationText,
} from '@/lib/email/meeting-cancellation-template'
import { displayOrg } from '@/lib/email/meeting-email-shared'
import { sendTransactionalMail } from '@/lib/email/send-transactional-mail'
import {
  getPublicSiteUrl,
  isLocalDevWithoutTransactionalSmtp,
  isTransactionalSmtpConfigured,
} from '@/lib/email/smtp'
import type { MeetingRow, ProfileRow } from '@/lib/supabase/database.types'

export type SendMeetingCancellationResult = {
  sent: boolean
  recipients: string[]
  skippedReason?: string
}

function uniqueEmails(emails: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of emails) {
    const email = raw.trim()
    if (!email) continue
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(email)
  }
  return out
}

/**
 * Envía correo de cancelación anónima a ambas partes (titular + delegados activos).
 */
export async function sendMeetingCancellationEmails(args: {
  meeting: MeetingRow
  requesterProfile: ProfileRow
  recipientProfile: ProfileRow
  requesterExtraEmails?: string[]
  recipientExtraEmails?: string[]
  siteUrl?: string
}): Promise<SendMeetingCancellationResult> {
  const { meeting, requesterProfile, recipientProfile } = args
  const siteUrl = args.siteUrl ?? getPublicSiteUrl()

  const requesterEmails = uniqueEmails([
    requesterProfile.email ?? '',
    ...(args.requesterExtraEmails ?? []),
  ])
  const recipientEmails = uniqueEmails([
    recipientProfile.email ?? '',
    ...(args.recipientExtraEmails ?? []),
  ])

  type MailTarget = {
    email: string
    profile: ProfileRow
    counterparty: ProfileRow
  }

  const targets: MailTarget[] = []

  for (const email of requesterEmails) {
    targets.push({ email, profile: requesterProfile, counterparty: recipientProfile })
  }
  for (const email of recipientEmails) {
    if (targets.some((t) => t.email.toLowerCase() === email.toLowerCase())) continue
    targets.push({ email, profile: recipientProfile, counterparty: requesterProfile })
  }

  const recipients: string[] = []
  const subject = buildMeetingCancellationSubject()

  if (!isTransactionalSmtpConfigured()) {
    if (isLocalDevWithoutTransactionalSmtp()) {
      for (const party of targets) {
        const templateData = buildMeetingCancellationTemplateData({
          day: meeting.day,
          slotTime: meeting.slot_time,
          tableNumber: meeting.table_number,
          recipientOrganization: displayOrg(party.profile),
          counterpartyOrganization: displayOrg(party.counterparty),
          siteUrl,
        })
        console.warn(
          `[MEETING CANCEL EMAIL · DEV] Cancelación para ${party.email} · ` +
            `${templateData.meetingDateLabel} ${templateData.startTime}–${templateData.endTime} · ${templateData.tableLabel}`,
        )
        recipients.push(party.email)
      }
      if (recipients.length === 0) {
        return { sent: false, recipients: [], skippedReason: 'missing_participant_emails' }
      }
      return { sent: false, recipients, skippedReason: 'smtp_not_configured_dev' }
    }
    console.error('[MEETING CANCEL EMAIL] SMTP no configurado; correo omitido.')
    return { sent: false, recipients: [], skippedReason: 'smtp_not_configured' }
  }

  for (const party of targets) {
    const templateData = buildMeetingCancellationTemplateData({
      day: meeting.day,
      slotTime: meeting.slot_time,
      tableNumber: meeting.table_number,
      recipientOrganization: displayOrg(party.profile),
      counterpartyOrganization: displayOrg(party.counterparty),
      siteUrl,
    })

    await sendTransactionalMail({
      to: party.email,
      subject,
      text: buildMeetingCancellationText(templateData),
      html: buildMeetingCancellationHtml(templateData),
      entityRef: meeting.id,
    })
    recipients.push(party.email)
  }

  if (recipients.length === 0) {
    return { sent: false, recipients: [], skippedReason: 'missing_participant_emails' }
  }

  return { sent: true, recipients }
}
