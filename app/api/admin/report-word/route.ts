import { NextResponse } from 'next/server'
import { getParticipantProfilesForReports } from '@/lib/admin/participant-reports'
import { buildReportStamp, loadReportLogoBuffers } from '@/lib/admin/report-assets'
import { verifyAdminApiRequest } from '@/lib/admin/verify-admin-api'
import { fetchAdminProfilesWithMetrics } from '@/lib/supabase/admin-repository'
import { buildParticipantSectorWordReport } from '@/lib/admin/word/participant-sector-report'

export const runtime = 'nodejs'

export async function POST() {
  const auth = await verifyAdminApiRequest()
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  try {
    const profiles = await fetchAdminProfilesWithMetrics()
    const participants = getParticipantProfilesForReports(profiles)
    const logos = loadReportLogoBuffers()
    const buffer = await buildParticipantSectorWordReport(participants, logos)
    const stamp = buildReportStamp()

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="conecta360-sectores-participantes-${stamp}.docx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al generar Word.' },
      { status: 500 },
    )
  }
}
