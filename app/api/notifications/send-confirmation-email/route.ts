import { NextResponse } from 'next/server'
import { resolveEmailOrigin } from '@/lib/email/meeting-email-shared'
import { sendMeetingConfirmationEmail } from '@/lib/email/send-meeting-confirmation-email'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { MeetingRow, ProfileRow } from '@/lib/supabase/database.types'

export const runtime = 'nodejs'

/**
 * Dispara correo transaccional solo tras confirmación exitosa (pendiente → confirmada).
 * Idempotente vía claim_meeting_confirmation_email (un solo correo por reunión).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { meetingId?: string }
    const meetingId = body.meetingId?.trim()
    if (!meetingId) {
      return NextResponse.json({ error: 'meetingId requerido.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { data: claimed, error: claimError } = await supabase.rpc(
      'claim_meeting_confirmation_email',
      { p_meeting_id: meetingId },
    )

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }

    if (!claimed) {
      return NextResponse.json(
        { ok: false, skipped: true, reason: 'already_sent_or_not_confirmed' },
        { status: 200 },
      )
    }

    const row = claimed as MeetingRow

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', [row.requester_id, row.recipient_id])

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    const requesterProfile = (profiles as ProfileRow[] | null)?.find(
      (p) => p.id === row.requester_id,
    )
    const recipientProfile = (profiles as ProfileRow[] | null)?.find(
      (p) => p.id === row.recipient_id,
    )

    if (!requesterProfile || !recipientProfile) {
      return NextResponse.json({ error: 'Perfiles de reunión no encontrados.' }, { status: 404 })
    }

    const result = await sendMeetingConfirmationEmail({
      meeting: row,
      requesterProfile,
      recipientProfile,
      siteUrl: resolveEmailOrigin(request),
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[send-confirmation-email]', err)
    return NextResponse.json(
      {
        ok: false,
        sent: false,
        error: err instanceof Error ? err.message : 'Error al enviar correo.',
      },
      { status: 200 },
    )
  }
}
