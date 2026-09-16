import { escapeHtml } from '@/lib/email/meeting-email-shared'
import { transactionalLogoImgHtml } from '@/lib/email/send-transactional-mail'

export function buildDelegatePasswordResetOwnerSubject(delegateEmail: string): string {
  return `Conecta360 · Nueva contraseña de acceso delegado (${delegateEmail})`
}

export function buildDelegatePasswordResetOwnerText(args: {
  ownerName: string
  delegateEmail: string
  temporaryPassword: string
  platformUrl: string
}): string {
  return [
    `Hola ${args.ownerName},`,
    '',
    'Se restableció la contraseña de un acceso delegado en Conecta360.',
    '',
    `Correo delegado: ${args.delegateEmail}`,
    `Nueva contraseña: ${args.temporaryPassword}`,
    '',
    'Comparte esta contraseña solo con la persona autorizada. También puedes verla en Plataforma → Accesos.',
    '',
    `Accesos: ${args.platformUrl}`,
    '',
    'Conecta360 · Rueda de Negocios Orinoquía 2026',
  ].join('\n')
}

export function buildDelegatePasswordResetOwnerHtml(args: {
  ownerName: string
  delegateEmail: string
  temporaryPassword: string
  platformUrl: string
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f5;font-family:Inter,Arial,sans-serif;color:#1a3c34">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dde8d8;border-radius:14px;overflow:hidden">
          <tr>
            <td style="padding:28px 28px 16px;text-align:center;background:linear-gradient(180deg,#eef3ea 0%,#ffffff 100%)">
              ${transactionalLogoImgHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8ac441">
                Conecta360 · Accesos delegados
              </p>
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a3c34">Contraseña delegada restablecida</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#3d5249">
                Hola ${escapeHtml(args.ownerName)}, se generó una nueva contraseña para el acceso delegado
                <strong>${escapeHtml(args.delegateEmail)}</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px">
              <div style="margin:0 0 16px;padding:14px 16px;border-radius:10px;background:#eef3ea;border:1px solid #dde8d8;font-family:monospace;font-size:16px;color:#1a3c34">
                ${escapeHtml(args.temporaryPassword)}
              </div>
              <a href="${escapeHtml(args.platformUrl)}" style="display:inline-block;background:#1a3c34;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px">
                Ver en Accesos
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
