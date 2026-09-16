import { escapeHtml } from '@/lib/email/meeting-email-shared'
import { transactionalLogoImgHtml } from '@/lib/email/send-transactional-mail'

export function buildPasswordResetSubject(): string {
  return 'Conecta360 · Restablecer contraseña'
}

export function buildPasswordResetText(args: { resetUrl: string }): string {
  return [
    'Restablecer contraseña — Conecta360',
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta titular.',
    '',
    'Abre el siguiente enlace para elegir una nueva contraseña:',
    args.resetUrl,
    '',
    'El enlace expira en 24 horas. Si no solicitaste este cambio, ignora este correo.',
    '',
    'Conecta360 · Rueda de Negocios Orinoquía 2026',
  ].join('\n')
}

export function buildPasswordResetHtml(args: { resetUrl: string }): string {
  const resetUrl = escapeHtml(args.resetUrl)

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
                Conecta360 · Orinoquía 2026
              </p>
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a3c34">Restablecer contraseña</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#3d5249">
                Haz clic en el botón para elegir una nueva contraseña de tu cuenta titular.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px">
              <a href="${resetUrl}" style="display:inline-block;background:#1a3c34;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px">
                Restablecer contraseña
              </a>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#8a9a92">
                Si el botón no funciona, copia este enlace en tu navegador:<br />
                <span style="word-break:break-all;color:#5a6b62">${resetUrl}</span>
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
