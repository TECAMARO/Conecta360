import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import {
  buildExecutiveSnapshot,
  DEFAULT_EXECUTIVE_FILTERS,
  type ExecutiveFilters,
} from '@/lib/admin/analytics'
import { ExecutiveReportDocument } from '@/lib/admin/pdf/executive-report-document'
import { verifyAdminApiRequest } from '@/lib/admin/verify-admin-api'
import {
  fetchAdminEvaluations,
  fetchAdminMeetings,
  fetchAdminProfilesWithMetrics,
} from '@/lib/supabase/admin-repository'

export const runtime = 'nodejs'

function resolveOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  if (host) return `${proto}://${host}`
  return new URL(request.url).origin
}

export async function POST(request: Request) {
  const auth = await verifyAdminApiRequest()
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  let filters: ExecutiveFilters = DEFAULT_EXECUTIVE_FILTERS
  let lastProcessImage: string | undefined
  try {
    const body = (await request.json()) as {
      filters?: Partial<ExecutiveFilters>
      lastProcessImage?: string
    }
    if (body.filters) {
      filters = { ...DEFAULT_EXECUTIVE_FILTERS, ...body.filters }
    }
    if (body.lastProcessImage?.startsWith('data:image/')) {
      lastProcessImage = body.lastProcessImage
    }
  } catch {
    /* use defaults */
  }

  try {
    const [profiles, meetings, evaluations] = await Promise.all([
      fetchAdminProfilesWithMetrics(),
      fetchAdminMeetings(),
      fetchAdminEvaluations(),
    ])

    const snapshot = buildExecutiveSnapshot(profiles, meetings, evaluations, filters)
    const origin = resolveOrigin(request)
    const logoUrls = {
      logo1: `${origin}/logo.png`,
      logo2: `${origin}/logo2.png`,
      logo3: `${origin}/logo3.png`,
    }

    const buffer = await renderToBuffer(
      ExecutiveReportDocument({ snapshot, logoUrls, lastProcessImage }),
    )

    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="conecta360-informe-ejecutivo-${stamp}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al generar PDF.' },
      { status: 500 },
    )
  }
}
