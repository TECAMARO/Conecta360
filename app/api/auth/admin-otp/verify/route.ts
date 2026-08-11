import { NextResponse } from 'next/server'
import { isMasterAdminEmail } from '@/lib/admin-auth/constants'
import {
  admin2faCookieOptions,
  buildAdmin2faCookieValue,
} from '@/lib/admin-auth/otp-cookie'
import { hashAdminOtp } from '@/lib/admin-auth/otp-hash'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string }
    const code = body.code?.trim()

    if (!code || !/^\d{4}$/.test(code)) {
      return NextResponse.json({ error: 'Ingresa un código válido de 4 dígitos.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email || !isMasterAdminEmail(user.email)) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const otpHash = hashAdminOtp(code, user.id)

    const { data: verified, error: rpcError } = await supabase.rpc('verify_admin_otp_challenge', {
      p_otp_hash: otpHash,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    if (!verified) {
      return NextResponse.json(
        { error: 'Código incorrecto o expirado. Solicita uno nuevo.' },
        { status: 401 },
      )
    }

    const cookie = await buildAdmin2faCookieValue(user.id)
    const response = NextResponse.json({ ok: true })
    response.cookies.set(cookie.name, cookie.value, admin2faCookieOptions(cookie.expires))
    return response
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al verificar OTP.' },
      { status: 500 },
    )
  }
}
