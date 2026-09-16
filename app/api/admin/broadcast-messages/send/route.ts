import { NextResponse } from 'next/server'
import {
  buildBroadcastMessage,
  normalizeBroadcastExternalEmail,
  resolveBroadcastOrganizationName,
  resolveExternalBroadcastOrganizationName,
  type AdminBroadcastTemplateId,
} from '@/lib/admin/broadcast-message-templates'
import { verifyAdminApiRequest } from '@/lib/admin/verify-admin-api'
import { buildAdminBroadcastHtml } from '@/lib/email/admin-broadcast-template'
import { sendAdminBroadcastMail } from '@/lib/email/send-admin-broadcast-mail'
import { isAdminBroadcastSmtpConfigured, getPublicSiteUrl } from '@/lib/email/smtp'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'

type ExternalRecipientInput = {
  email?: string
  organizationName?: string
}

type SendBody = {
  templateId?: AdminBroadcastTemplateId
  customBody?: string
  profileIds?: string[]
  externalRecipients?: ExternalRecipientInput[]
}

type BroadcastSendTarget = {
  key: string
  email: string
  organizationName: string
}

export async function POST(request: Request) {
  const auth = await verifyAdminApiRequest()
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  if (!isAdminBroadcastSmtpConfigured()) {
    return NextResponse.json(
      {
        error:
          'SMTP de notificaciones no configurado. Define SMTP_TRANSACTIONAL_HOST, SMTP_TRANSACTIONAL_USER y SMTP_TRANSACTIONAL_PASS en el servidor (conecta360.notificaciones@gmail.com).',
      },
      { status: 503 },
    )
  }

  let body: SendBody
  try {
    body = (await request.json()) as SendBody
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 })
  }

  const templateId = body.templateId
  const profileIds = [...new Set((body.profileIds ?? []).filter(Boolean))]

  if (!templateId || !['general_1', 'general_2', 'custom'].includes(templateId)) {
    return NextResponse.json({ error: 'Selecciona un tipo de mensaje válido.' }, { status: 400 })
  }

  const targets: BroadcastSendTarget[] = []
  const seenEmails = new Set<string>()

  if (profileIds.length > 0) {
    const service = createServiceRoleSupabaseClient()
    const { data: profiles, error: profilesError } = await service
      .from('profiles')
      .select('id, email, organization_name, full_name, role')
      .in('id', profileIds)

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    for (const profile of profiles ?? []) {
      if (profile.role === 'admin') continue
      const email = normalizeBroadcastExternalEmail(profile.email ?? '')
      if (!email || seenEmails.has(email)) continue

      seenEmails.add(email)
      targets.push({
        key: profile.id,
        email,
        organizationName: resolveBroadcastOrganizationName(profile),
      })
    }
  }

  for (const external of body.externalRecipients ?? []) {
    const email = normalizeBroadcastExternalEmail(external.email ?? '')
    if (!email || seenEmails.has(email)) continue

    seenEmails.add(email)
    targets.push({
      key: `external:${email}`,
      email,
      organizationName: resolveExternalBroadcastOrganizationName(
        external.organizationName,
        email,
      ),
    })
  }

  if (targets.length === 0) {
    return NextResponse.json(
      { error: 'Selecciona al menos un destinatario válido con correo electrónico.' },
      { status: 400 },
    )
  }

  const platformUrl = getPublicSiteUrl()
  const sent: string[] = []
  const failed: { key: string; email: string; error: string }[] = []

  for (const target of targets) {
    try {
      const message = buildBroadcastMessage({
        templateId,
        organizationName: target.organizationName,
        customBody: body.customBody,
      })

      await sendAdminBroadcastMail({
        to: target.email,
        subject: message.subject,
        text: message.text,
        html: buildAdminBroadcastHtml({
          subject: message.subject,
          bodyText: message.text,
          platformUrl,
        }),
        profileId: target.key,
      })

      sent.push(target.key)
    } catch (err) {
      failed.push({
        key: target.key,
        email: target.email,
        error: err instanceof Error ? err.message : 'No se pudo enviar el correo.',
      })
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    sentCount: sent.length,
    failedCount: failed.length,
    sentKeys: sent,
    failures: failed,
  })
}
