import { NextResponse } from 'next/server'
import { fetchSupportCredentialsForAdmin } from '@/lib/admin-support/fetch-support-credentials'
import { verifySupportApiRequest } from '@/lib/admin/verify-support-api'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await verifySupportApiRequest()
  if (!auth.ok) {
    return NextResponse.json(
      { error: 'Verificación Soporte requerida.' },
      { status: 401 },
    )
  }

  try {
    const users = await fetchSupportCredentialsForAdmin()
    return NextResponse.json({ ok: true, users })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No se pudieron cargar credenciales.' },
      { status: 500 },
    )
  }
}
