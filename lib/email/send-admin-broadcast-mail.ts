import {
  createAdminBroadcastSmtpTransport,
  getAdminBroadcastBccList,
  getAdminBroadcastFromAddress,
  getAdminBroadcastReplyTo,
  getTransactionalSmtpUser,
  parseEmailAddressList,
} from '@/lib/email/smtp'
import {
  buildAdminBroadcastHtml,
  getAdminBroadcastLogoAttachment,
} from '@/lib/email/admin-broadcast-template'

export type SendAdminBroadcastMailOptions = {
  to: string
  subject: string
  text: string
  html: string
  profileId: string
}

function normalizeRecipientEmail(email: string): string {
  return email.trim().toLowerCase()
}

function resolveFromAddress(): string {
  const from = getAdminBroadcastFromAddress()
  if (typeof from === 'string') {
    const match = from.match(/<([^>]+)>/)
    return normalizeRecipientEmail(match?.[1] ?? from)
  }
  return normalizeRecipientEmail(from.address)
}

function buildAuditSubject(recipientEmail: string, subject: string): string {
  return `[Copia admin · ${recipientEmail}] ${subject}`
}

function buildAuditText(recipientEmail: string, bodyText: string): string {
  return [
    'Copia interna del mensaje enviado desde Admin → Mensajes.',
    `Destinatario: ${recipientEmail}`,
    '',
    '---',
    '',
    bodyText,
  ].join('\n')
}

async function deliverAdminBroadcastMessage(args: {
  to: string | string[]
  subject: string
  text: string
  html: string
  entityRef: string
}): Promise<void> {
  const transport = createAdminBroadcastSmtpTransport()
  const logo = getAdminBroadcastLogoAttachment()
  const replyTo = getAdminBroadcastReplyTo()
  const smtpUser = getTransactionalSmtpUser()
  const recipients = parseEmailAddressList(
    Array.isArray(args.to) ? args.to.join(',') : args.to,
  )

  if (recipients.length === 0) {
    throw new Error('No hay destinatarios válidos para el envío.')
  }

  const envelopeFrom = resolveFromAddress() || smtpUser

  const info = await transport.sendMail({
    from: getAdminBroadcastFromAddress(),
    to: recipients,
    replyTo,
    subject: args.subject,
    text: args.text,
    html: args.html,
    ...(logo ? { attachments: [logo] } : {}),
    envelope: {
      from: envelopeFrom,
      to: recipients,
    },
    headers: {
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All',
      'X-Mailer': 'Conecta360 Admin Broadcast',
      'X-Entity-Ref-ID': args.entityRef,
    },
  })

  const rejected = info.rejected ?? []
  if (rejected.length > 0) {
    throw new Error(`Destinatarios rechazados por SMTP: ${rejected.join(', ')}`)
  }
}

/**
 * Envío del panel Admin → Mensajes.
 * 1) Correo al destinatario.
 * 2) Copia interna garantizada a ADMIN_BROADCAST_BCC (Gmail SMTP no entrega BCC oculto de forma confiable).
 */
export async function sendAdminBroadcastMail(options: SendAdminBroadcastMailOptions): Promise<void> {
  const transport = createAdminBroadcastSmtpTransport()

  try {
    await transport.verify()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de autenticación SMTP'
    throw new Error(`SMTP notificaciones: ${message}`)
  }

  const recipientEmail = normalizeRecipientEmail(options.to)

  await deliverAdminBroadcastMessage({
    to: recipientEmail,
    subject: options.subject,
    text: options.text,
    html: options.html,
    entityRef: `admin-broadcast:${options.profileId}`,
  })

  const auditRecipients = getAdminBroadcastBccList().filter(
    (address) => address !== recipientEmail,
  )

  for (const auditTo of auditRecipients) {
    const auditSubject = buildAuditSubject(recipientEmail, options.subject)

    await deliverAdminBroadcastMessage({
      to: auditTo,
      subject: auditSubject,
      text: buildAuditText(recipientEmail, options.text),
      html: buildAdminBroadcastHtml({
        subject: auditSubject,
        bodyText: options.text,
        auditRecipientEmail: recipientEmail,
      }),
      entityRef: `admin-broadcast-audit:${options.profileId}:${auditTo}`,
    })
  }
}
