import { eventDays, eventTimeSlots } from '@/lib/event-config'
import { formatPhysicalTable } from '@/lib/physical-tables'
import { slotIdFromMeetingDayAndTime } from '@/lib/meeting-slots'
import { parseAppointmentDateRange } from '@/lib/agenda-export'
import { escapeHtml } from '@/lib/email/meeting-email-shared'
import { transactionalLogoImgHtml } from '@/lib/email/send-transactional-mail'

export type MeetingConfirmationTemplateData = {
  requesterOrganization: string
  counterpartyOrganization: string
  meetingDateLabel: string
  startTime: string
  endTime: string
  tableLabel: string
  platformUrl: string
  logoUrl: string
}

const WEEKDAY_ES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const

const MONTH_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

/** Formato: "Martes 22 de septiembre de 2026" */
export function formatMeetingDateLabel(dayIso: string): string {
  const eventDay = eventDays.find((d) => d.id === dayIso)
  if (eventDay) {
    const match = eventDay.label.match(/^(\w+)\s+(\d+)\s+de\s+(\w+),\s+(\d{4})/i)
    if (match) {
      const weekday = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()
      return `${weekday} ${match[2]} de ${match[3].toLowerCase()} de ${match[4]}`
    }
    return eventDay.label.replace(',', '')
  }

  const [year, month, day] = dayIso.split('-').map(Number)
  if (!year || !month || !day) return dayIso
  const date = new Date(year, month - 1, day)
  const weekday = WEEKDAY_ES[date.getDay()]
  const monthName = MONTH_ES[month - 1]
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day} de ${monthName} de ${year}`
}

/** Extrae inicio y fin del bloque (ej. "10:20 a.m." – "10:40 a.m."). */
export function formatMeetingTimeRange(slotTime: string, dayIso: string): {
  startTime: string
  endTime: string
} {
  const slotId = slotIdFromMeetingDayAndTime(dayIso, slotTime)
  const range = parseAppointmentDateRange(slotId, slotTime)
  if (!range) {
    const parts = slotTime.split(/\s*-\s*/)
    return {
      startTime: parts[0]?.trim() ?? slotTime,
      endTime: parts[1]?.trim() ?? slotTime,
    }
  }

  const formatter = new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return {
    startTime: formatter.format(range.start).replace(/\s/g, ' ').toLowerCase(),
    endTime: formatter.format(range.end).replace(/\s/g, ' ').toLowerCase(),
  }
}

export function buildMeetingConfirmationTemplateData(args: {
  day: string
  slotTime: string
  tableNumber: number
  requesterOrganization: string
  counterpartyOrganization: string
  siteUrl: string
}): MeetingConfirmationTemplateData {
  const slot = eventTimeSlots.find((s) => s.dayId === args.day && s.time === args.slotTime)
  const { startTime, endTime } = formatMeetingTimeRange(args.slotTime, args.day)

  return {
    requesterOrganization: args.requesterOrganization,
    counterpartyOrganization: args.counterpartyOrganization,
    meetingDateLabel: formatMeetingDateLabel(args.day),
    startTime,
    endTime,
    tableLabel: formatPhysicalTable(args.tableNumber),
    platformUrl: `${args.siteUrl.replace(/\/$/, '')}/plataforma?view=agenda`,
    logoUrl: `${args.siteUrl.replace(/\/$/, '')}/logo.png`,
  }
}

export function buildMeetingConfirmationSubject(): string {
  return 'Conecta360 · Cita confirmada – Rueda de Negocios Orinoquía 2026'
}

export function buildMeetingConfirmationText(data: MeetingConfirmationTemplateData): string {
  return [
    `Hola ${data.requesterOrganization},`,
    '',
    `Tu reunión con ${data.counterpartyOrganization} ha sido confirmada.`,
    '',
    'Detalles de tu agendamiento:',
    `- Fecha: ${data.meetingDateLabel}`,
    `- Hora: ${data.startTime} – ${data.endTime}`,
    `- Ubicación: ${data.tableLabel}`,
    '',
    `Revisa tu agenda: ${data.platformUrl}`,
    '',
    'Correo automático de la plataforma Conecta360 (Rueda de Negocios Orinoquía 2026).',
    'Si tienes dudas, responde a este correo.',
  ].join('\n')
}

export function buildMeetingConfirmationHtml(data: MeetingConfirmationTemplateData): string {
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
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a3c34">Tu cita fue confirmada</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#5a6b62">
                Hola <strong style="color:#1a3c34">${escapeHtml(data.requesterOrganization)}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#5a6b62">
                Tu reunión con <strong style="color:#1a3c34">${escapeHtml(data.counterpartyOrganization)}</strong>
                ha sido <strong style="color:#1a3c34">confirmada</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fbf8;border:1px solid #dde8d8;border-radius:12px">
                <tr>
                  <td style="padding:18px 20px">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1a3c34">Detalles de tu agendamiento</p>
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
                Puedes revisar tu agenda completa y gestionar tus participaciones ingresando a tu cuenta en Conecta360.
              </p>
              <a href="${data.platformUrl}" style="display:inline-block;background:#1a3c34;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px">
                Ver mi agenda
              </a>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#8a9a92">
                Este es un correo automático de Conecta360. Puedes responder si necesitas asistencia.
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
