import { escapeHtml } from '@/lib/email/meeting-email-shared'
import { transactionalLogoImgHtml } from '@/lib/email/send-transactional-mail'

export type EmailNotificationsEnableTemplateData = {
  recipientName: string
  recipientEmail: string
  platformUrl: string
}

export function buildEmailNotificationsEnableSubject(): string {
  return 'Conecta360 · Confirmar uso de Notificaciones por Correo'
}

export function buildEmailNotificationsEnableText(data: EmailNotificationsEnableTemplateData): string {
  return [
    `Hola ${data.recipientName},`,
    '',
    'Confirmar uso de Notificaciones por Correo',
    '',
    'Has solicitado recibir en este correo las notificaciones oficiales de Conecta360',
    'sobre reuniones confirmadas y canceladas de la Rueda de Negocios Orinoquía 2026.',
    '',
    'Si recibiste este mensaje en tu bandeja de entrada, tu correo ya reconoce a',
    'conecta360.notificaciones@gmail.com como remitente legítimo de la plataforma.',
    '',
    'Recomendación en Gmail: si algún aviso futuro llega a Spam, ábrelo y elige',
    '«No es spam» o «Mover a bandeja de entrada» para mantener la comunicación fluida.',
    '',
    `Mi Agenda: ${data.platformUrl}`,
    '',
    'Correo automático de Conecta360 · Rueda de Negocios Orinoquía 2026.',
  ].join('\n')
}

export function buildEmailNotificationsEnableHtml(data: EmailNotificationsEnableTemplateData): string {
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
                Rueda de Negocios · Orinoquía 2026
              </p>
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a3c34">Confirmar uso de Notificaciones por Correo</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#5a6b62">
                Hola <strong style="color:#1a3c34">${escapeHtml(data.recipientName)}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#5a6b62">
                Has solicitado recibir en <strong style="color:#1a3c34">${escapeHtml(data.recipientEmail)}</strong>
                las notificaciones oficiales de Conecta360 sobre reuniones confirmadas y canceladas.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fbf8;border:1px solid #dde8d8;border-radius:12px">
                <tr>
                  <td style="padding:18px 20px">
                    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1a3c34">¿Qué significa esto?</p>
                    <p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#5a6b62">
                      Este mensaje confirma que tu bandeja puede recibir correos desde
                      <strong style="color:#1a3c34">conecta360.notificaciones@gmail.com</strong>.
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.55;color:#5a6b62">
                      En Gmail, si un aviso futuro llega a Spam, ábrelo y elige
                      <strong>«No es spam»</strong> para mantener la comunicación en tu bandeja de entrada.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;text-align:center">
              <a href="${escapeHtml(data.platformUrl)}" style="display:inline-block;background:#1a3c34;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:10px">
                Ir a Mi Agenda
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;border-top:1px solid #eef2ea">
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#5a6b62;text-align:center">
                Correo automático de Conecta360 · Rueda de Negocios Orinoquía 2026
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
