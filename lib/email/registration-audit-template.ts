import { escapeHtml } from '@/lib/email/meeting-email-shared'
import { transactionalLogoImgHtml } from '@/lib/email/send-transactional-mail'

export type RegistrationAuditParticipant = {
  id: string
  full_name: string | null
  organization_name: string | null
  email: string | null
  created_at: string | null
}

export type RegistrationAuditTemplateData = {
  representative: string
  organization: string
  email: string
  registeredAt: string
  newUserId: string
  participants: RegistrationAuditParticipant[]
}

function formatRegistrationDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function buildRegistrationAuditTemplateData(args: {
  newUser: {
    id: string
    full_name: string | null
    organization_name: string | null
    email: string | null
    created_at: string | null
  }
  participants: RegistrationAuditParticipant[]
}): RegistrationAuditTemplateData {
  return {
    newUserId: args.newUser.id,
    representative: args.newUser.full_name?.trim() || '—',
    organization: args.newUser.organization_name?.trim() || '—',
    email: args.newUser.email?.trim() || '—',
    registeredAt: formatRegistrationDate(args.newUser.created_at),
    participants: args.participants,
  }
}

export function buildRegistrationAuditSubject(representative: string): string {
  const name = representative.trim() || 'Nuevo participante'
  return `Conecta360 · Nuevo registro: ${name}`
}

function participantRowsHtml(data: RegistrationAuditTemplateData): string {
  if (data.participants.length === 0) {
    return `<p style="margin:0;font-size:14px;color:#5a6b62">Sin participantes adicionales.</p>`
  }

  const rows = data.participants
    .map((participant, index) => {
      const isNew = participant.id === data.newUserId
      const name = escapeHtml(participant.full_name?.trim() || '—')
      const org = escapeHtml(participant.organization_name?.trim() || '—')
      const email = escapeHtml(participant.email?.trim() || '—')
      const registered = escapeHtml(formatRegistrationDate(participant.created_at))
      const rowBg = isNew ? '#eef3ea' : index % 2 === 0 ? '#ffffff' : '#fafcfa'

      return `<tr style="background:${rowBg}">
        <td style="padding:10px 12px;border-bottom:1px solid #eef3eb;font-size:13px;color:#1a3c34">
          ${index + 1}. ${name}${isNew ? ' <strong style="color:#8ac441">· Nuevo</strong>' : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef3eb;font-size:13px;color:#1a3c34">${org}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef3eb;font-size:13px;color:#5a6b62">${email}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef3eb;font-size:12px;color:#5a6b62;white-space:nowrap">${registered}</td>
      </tr>`
    })
    .join('')

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dde8d8;border-radius:10px;overflow:hidden">
    <tr style="background:#eef3ea">
      <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#1a3c34">Representante</th>
      <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#1a3c34">Empresa</th>
      <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#1a3c34">Correo</th>
      <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#1a3c34">Registro</th>
    </tr>
    ${rows}
  </table>`
}

export function buildRegistrationAuditText(data: RegistrationAuditTemplateData): string {
  const lines = [
    'Conecta360 · Auditoría de usuarios',
    '',
    'Se registró un nuevo participante en la plataforma.',
    '',
    'Nuevo usuario:',
    `- Representante: ${data.representative}`,
    `- Empresa: ${data.organization}`,
    `- Correo: ${data.email}`,
    `- Registro: ${data.registeredAt}`,
    '',
    `Listado actualizado de participantes (${data.participants.length}):`,
    '',
  ]

  data.participants.forEach((participant, index) => {
    const marker = participant.id === data.newUserId ? ' [NUEVO]' : ''
    lines.push(
      `${index + 1}. ${participant.full_name?.trim() || '—'}${marker}`,
      `   Empresa: ${participant.organization_name?.trim() || '—'}`,
      `   Correo: ${participant.email?.trim() || '—'}`,
      `   Registro: ${formatRegistrationDate(participant.created_at)}`,
      '',
    )
  })

  lines.push('Correo automático de auditoría — Conecta360 Admin Portal.')
  return lines.join('\n')
}

export function buildRegistrationAuditHtml(data: RegistrationAuditTemplateData): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f5;font-family:Inter,Arial,sans-serif;color:#1a3c34">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dde8d8;border-radius:14px;overflow:hidden">
          <tr>
            <td style="padding:28px 28px 16px;text-align:center;background:linear-gradient(180deg,#eef3ea 0%,#ffffff 100%)">
              ${transactionalLogoImgHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8ac441">
                Admin Portal · Auditoría de usuarios
              </p>
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a3c34">Nuevo usuario registrado</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#5a6b62">
                Un participante se unió a Conecta360 y ya aparece en
                <strong style="color:#1a3c34">Auditoría de usuarios y métricas por empresa</strong>.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#f8fbf8;border:1px solid #dde8d8;border-radius:10px">
                <tr><td style="padding:16px 18px">
                  <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#5a6b62">Datos del nuevo registro</p>
                  <p style="margin:0 0 6px;font-size:14px"><strong>Representante:</strong> ${escapeHtml(data.representative)}</p>
                  <p style="margin:0 0 6px;font-size:14px"><strong>Empresa:</strong> ${escapeHtml(data.organization)}</p>
                  <p style="margin:0 0 6px;font-size:14px"><strong>Correo:</strong> ${escapeHtml(data.email)}</p>
                  <p style="margin:0;font-size:14px"><strong>Registro:</strong> ${escapeHtml(data.registeredAt)}</p>
                </td></tr>
              </table>
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1a3c34">
                Participantes actuales (${data.participants.length})
              </p>
              ${participantRowsHtml(data)}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#5a6b62">
                Correo automático de auditoría operativa — Conecta360 (Rueda de Negocios Orinoquía 2026).
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
