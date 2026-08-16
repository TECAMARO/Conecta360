import fs from 'node:fs'
import path from 'node:path'
import {
  createTransactionalSmtpTransport,
  getTransactionalFromAddress,
  getTransactionalReplyTo,
} from '@/lib/email/smtp'

/** CID estable para logo embebido (mejor entregabilidad que URL externa). */
export const TRANSACTIONAL_LOGO_CID = 'conecta360-logo@conecta360'

export function getTransactionalLogoAttachment(): { filename: string; path: string; cid: string } | null {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  if (!fs.existsSync(logoPath)) return null
  return {
    filename: 'logo.png',
    path: logoPath,
    cid: TRANSACTIONAL_LOGO_CID,
  }
}

export function transactionalLogoImgHtml(alt = 'Conecta360'): string {
  return `<img src="cid:${TRANSACTIONAL_LOGO_CID}" alt="${escapeAttr(alt)}" width="180" style="max-width:180px;height:auto;display:inline-block;border:0" />`
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

export type SendTransactionalMailOptions = {
  to: string
  subject: string
  text: string
  html: string
  /** Referencia interna (p. ej. meeting id) para trazabilidad. */
  entityRef?: string
}

/**
 * Envío transaccional con cabeceras y logo embebido.
 * No usar para OTP admin — ese flujo mantiene su propio sendMail().
 */
export async function sendTransactionalMail(options: SendTransactionalMailOptions): Promise<void> {
  const transport = createTransactionalSmtpTransport()
  const logo = getTransactionalLogoAttachment()
  const replyTo = getTransactionalReplyTo()

  try {
    await transport.verify()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de autenticación SMTP'
    throw new Error(`SMTP transaccional (reuniones): ${message}`)
  }

  await transport.sendMail({
    from: getTransactionalFromAddress(),
    to: options.to,
    replyTo,
    subject: options.subject,
    text: options.text,
    html: options.html,
    ...(logo ? { attachments: [logo] } : {}),
    headers: {
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All',
      'X-Mailer': 'Conecta360 Transactional',
      ...(options.entityRef ? { 'X-Entity-Ref-ID': options.entityRef } : {}),
    },
  })
}
