import { escapeHtml } from '@/lib/email/meeting-email-shared'
import { getPublicSiteUrl } from '@/lib/email/smtp'
import { getTransactionalLogoAttachment, transactionalLogoImgHtml } from '@/lib/email/send-transactional-mail'

export { getTransactionalLogoAttachment as getAdminBroadcastLogoAttachment }

function plainTextBlockToHtml(text: string): string {
  const paragraphs = text.split(/\n\n+/)

  return paragraphs
    .map((paragraph) => {
      const lines = paragraph.split('\n').filter((line) => line.trim().length > 0)
      if (lines.length === 0) return ''

      const isBulletBlock = lines.every((line) => line.trim().startsWith('*'))
      if (isBulletBlock) {
        const items = lines
          .map((line) => line.trim().replace(/^\*\s*/, ''))
          .map(
            (line) =>
              `<li style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#1a3c34">${escapeHtml(line)}</li>`,
          )
          .join('')
        return `<ul style="margin:0 0 18px;padding-left:20px">${items}</ul>`
      }

      const htmlLines = lines
        .map(
          (line) =>
            `<span style="display:block;margin:0 0 8px;font-size:15px;line-height:1.65;color:#3d5249">${escapeHtml(line)}</span>`,
        )
        .join('')

      return `<div style="margin:0 0 18px">${htmlLines}</div>`
    })
    .filter(Boolean)
    .join('')
}

function buildAdminBroadcastAuditBannerHtml(recipientEmail: string): string {
  return `<div style="margin:0 0 16px;padding:12px 14px;border-radius:10px;background:#fff7e6;border:1px solid #f0c36d;color:#6b4f1d;font-size:13px;line-height:1.5">
                <strong>Copia interna</strong> — Admin → Mensajes<br />
                Destinatario: ${escapeHtml(recipientEmail)}
              </div>`
}

export function buildAdminBroadcastHtml(args: {
  subject: string
  bodyText: string
  platformUrl?: string
  auditRecipientEmail?: string
}): string {
  const platformUrl = args.platformUrl ?? `${getPublicSiteUrl()}/plataforma`
  const bodyHtml = plainTextBlockToHtml(args.bodyText)
  const auditBanner = args.auditRecipientEmail
    ? buildAdminBroadcastAuditBannerHtml(args.auditRecipientEmail)
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f5;font-family:Inter,Arial,sans-serif;color:#1a3c34">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dde8d8;border-radius:14px;overflow:hidden">
          <tr>
            <td style="padding:28px 28px 16px;text-align:center;background:linear-gradient(180deg,#eef3ea 0%,#ffffff 100%)">
              ${transactionalLogoImgHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8ac441">
                Conecta360 · Orinoquía 2026
              </p>
              <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#1a3c34">${escapeHtml(args.subject.replace(/^Conecta360 ·\s*/i, ''))}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px">
              ${auditBanner}
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px">
              <a href="${platformUrl}" style="display:inline-block;background:#1a3c34;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px">
                Ingresar a Conecta360
              </a>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#8a9a92">
                Comunicación oficial de Conecta360 — Semana Orinoquía Sostenible y Competitiva 2026.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
