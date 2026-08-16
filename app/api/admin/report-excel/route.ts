import { NextResponse } from 'next/server'
import { buildParticipantDirectoryExcelReport } from '@/lib/admin/excel/participant-directory-report'
import { getParticipantProfilesForReports } from '@/lib/admin/participant-reports'
import { buildReportStamp, loadReportLogoBuffers } from '@/lib/admin/report-assets'
import { verifyAdminApiRequest } from '@/lib/admin/verify-admin-api'
import { fetchAdminProfilesWithMetrics } from '@/lib/supabase/admin-repository'

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
    const buffer = await buildParticipantDirectoryExcelReport(participants, logos)
    const stamp = buildReportStamp()

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="conecta360-directorio-participantes-${stamp}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al generar Excel.' },
      { status: 500 },
    )
  }
}
