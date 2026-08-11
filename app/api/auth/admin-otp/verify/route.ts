import { NextResponse } from 'next/server'
import { MASTER_ADMIN_EMAIL, isMasterAdminEmail } from '@/lib/admin-auth/constants'
import {
  admin2faCookieOptions,
  buildAdmin2faCookieValue,
} from '@/lib/admin-auth/otp-cookie'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string }
    const code = body.code?.trim().replace(/\s/g, '')

    if (!code || !/^\d{6,8}$/.test(code)) {
      return NextResponse.json(
        { error: 'Ingresa el código numérico enviado a tu correo.' },
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

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: MASTER_ADMIN_EMAIL,
      token: code,
      type: 'email',
    })

    if (verifyError) {
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
