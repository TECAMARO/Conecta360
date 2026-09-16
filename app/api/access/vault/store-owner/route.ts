import { NextResponse } from 'next/server'
import { upsertOwnerCredentialVault } from '@/lib/admin-support/credential-vault'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** Guarda copia cifrada de la contraseña del titular (solo para Soporte admin). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string }
    const password = body.password ?? ''

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Contraseña inválida.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    await upsertOwnerCredentialVault({
      profileId: user.id,
      email: user.email,
      password,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[vault/store-owner]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No se pudo guardar la credencial.' },
      { status: 500 },
    )
  }
}
