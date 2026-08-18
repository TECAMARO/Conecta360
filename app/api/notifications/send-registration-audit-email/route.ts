import { NextResponse } from 'next/server'
import { releaseRegistrationAuditEmailClaim } from '@/lib/email/release-registration-audit-email-claim'
import { sendRegistrationAuditEmail } from '@/lib/email/send-registration-audit-email'
import type { RegistrationAuditParticipant } from '@/lib/email/registration-audit-template'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { ProfileRow } from '@/lib/supabase/database.types'

export const runtime = 'nodejs'

type ClaimPayload = {
  newUser: ProfileRow
  participants: RegistrationAuditParticipant[]
}

function parseClaimPayload(raw: unknown): ClaimPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const payload = raw as ClaimPayload
  if (!payload.newUser?.id) return null
  if (!Array.isArray(payload.participants)) return null
  return payload
}

export async function POST() {
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | undefined

  try {
    supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { data: claimed, error: claimError } = await supabase.rpc(
      'claim_profile_registration_audit_email',
    )

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }

    if (!claimed) {
      return NextResponse.json(
        { ok: false, skipped: true, reason: 'already_sent_or_not_eligible' },
        { status: 200 },
      )
    }

    const payload = parseClaimPayload(claimed)
    if (!payload) {
      await releaseRegistrationAuditEmailClaim(supabase)
      return NextResponse.json({ error: 'Respuesta de auditoría inválida.' }, { status: 500 })
    }

    const result = await sendRegistrationAuditEmail({
      newUser: payload.newUser,
      participants: payload.participants,
    })

    if (!result.sent) {
      await releaseRegistrationAuditEmailClaim(supabase)
      return NextResponse.json({ ok: false, ...result }, { status: 502 })
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[send-registration-audit-email]', err)
    if (supabase) {
      await releaseRegistrationAuditEmailClaim(supabase)
    }
    return NextResponse.json(
      {
        ok: false,
        sent: false,
        error: err instanceof Error ? err.message : 'Error al enviar correo.',
      },
      { status: 502 },
    )
  }
}
