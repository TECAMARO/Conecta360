import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isMasterAdminEmail } from '@/lib/admin-auth/constants'
import { hashAdminOtp } from '@/lib/admin-auth/otp-hash'
import {
  adminSupport2faCookieOptions,
  buildAdminSupport2faCookieValue,
} from '@/lib/admin-auth/support-otp-cookie'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string }
    const code = body.code?.trim()

    if (!code || !/^\d{4}$/.test(code)) {
      return NextResponse.json(
        { error: 'Ingresa el código de 4 dígitos enviado a tu correo.' },
        { status: 400 },
      )
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

    const { data: verified, error: rpcError } = await supabase.rpc(
      'verify_admin_support_otp_challenge',
      { p_otp_hash: otpHash },
    )

    if (rpcError) {
      return NextResponse.json(
        {
          error: `Error SQL al verificar OTP Soporte: ${rpcError.message}. Ejecuta supabase/admin-support-otp-setup.sql.`,
        },
        { status: 500 },
      )
    }

    if (!verified) {
      return NextResponse.json(
        { error: 'Código incorrecto o expirado. Solicita uno nuevo.' },
        { status: 401 },
      )
    }

    const cookie = await buildAdminSupport2faCookieValue(user.id)
    const cookieStore = await cookies()
    cookieStore.set(cookie.name, cookie.value, adminSupport2faCookieOptions(cookie.expires))

    return NextResponse.json({ ok: true, redirect: '/admin/support' })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al verificar OTP Soporte.' },
      { status: 500 },
    )
  }
}
