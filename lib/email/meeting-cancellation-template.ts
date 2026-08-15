import {
  formatMeetingDateLabel,
  formatMeetingTimeRange,
} from '@/lib/email/meeting-confirmation-template'
import { formatPhysicalTable } from '@/lib/physical-tables'
import { escapeHtml } from '@/lib/email/meeting-email-shared'
import { transactionalLogoImgHtml } from '@/lib/email/send-transactional-mail'

export type MeetingCancellationTemplateData = {
  recipientOrganization: string
  counterpartyOrganization: string
  meetingDateLabel: string
  startTime: string
  endTime: string
  tableLabel: string
  platformUrl: string
  logoUrl: string
}

export function buildMeetingCancellationTemplateData(args: {
  day: string
  slotTime: string
  tableNumber: number
  recipientOrganization: string
  counterpartyOrganization: string
  siteUrl: string
}): MeetingCancellationTemplateData {
  const { startTime, endTime } = formatMeetingTimeRange(args.slotTime, args.day)

  return {
    recipientOrganization: args.recipientOrganization,
    counterpartyOrganization: args.counterpartyOrganization,
    meetingDateLabel: formatMeetingDateLabel(args.day),
    startTime,
    endTime,
    tableLabel: formatPhysicalTable(args.tableNumber),
    platformUrl: `${args.siteUrl.replace(/\/$/, '')}/plataforma?view=agenda`,
    logoUrl: `${args.siteUrl.replace(/\/$/, '')}/logo.png`,
  }
}

export function buildMeetingCancellationSubject(): string {
  return 'Conecta360 · Reunión cancelada – Rueda de Negocios Orinoquía 2026'
}

export function buildMeetingCancellationText(data: MeetingCancellationTemplateData): string {
  return [
    `Hola ${data.recipientOrganization},`,
    '',
    `Tu reunión con ${data.counterpartyOrganization} ha sido cancelada por una de las partes.`,
    'Por política de la plataforma no se identifica quién realizó la cancelación.',
    '',
    'Detalles de la reunión afectada:',
    `- Fecha: ${data.meetingDateLabel}`,
    `- Hora: ${data.startTime} – ${data.endTime}`,
    `- Ubicación: ${data.tableLabel}`,
    '',
    `Revisa tu agenda: ${data.platformUrl}`,
    '',
    'Correo automático de Conecta360 (Rueda de Negocios Orinoquía 2026).',
  ].join('\n')
}

export function buildMeetingCancellationHtml(data: MeetingCancellationTemplateData): string {
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
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a3c34">Reunión cancelada</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#5a6b62">
                Hola <strong style="color:#1a3c34">${escapeHtml(data.recipientOrganization)}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#5a6b62">
                Tu reunión con <strong style="color:#1a3c34">${escapeHtml(data.counterpartyOrganization)}</strong>
                ha sido <strong style="color:#c0392b">cancelada</strong> por una de las partes.
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#5a6b62">
                Por política de la plataforma <strong>no se identifica quién realizó la cancelación</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff8f8;border:1px solid #f0d4d4;border-radius:12px">
                <tr>
                  <td style="padding:18px 20px">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1a3c34">Reunión y horario cancelados</p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#1a3c34"><strong>Fecha:</strong> ${escapeHtml(data.meetingDateLabel)}</p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#1a3c34"><strong>Hora:</strong> ${escapeHtml(data.startTime)} – ${escapeHtml(data.endTime)}</p>
                    <p style="margin:0;font-size:14px;line-height:1.5;color:#1a3c34"><strong>Ubicación:</strong> ${escapeHtml(data.tableLabel)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px">
              <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#5a6b62">
                Puedes revisar tu agenda actualizada ingresando a tu cuenta en Conecta360.
              </p>
              <a href="${data.platformUrl}" style="display:inline-block;background:#1a3c34;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px">
                Ver mi agenda
              </a>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#8a9a92">
                Este es un correo automático generado por la plataforma oficial de la Rueda de Negocios.
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
