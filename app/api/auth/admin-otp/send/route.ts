import { NextResponse } from 'next/server'
import {
  ADMIN_OTP_TTL_MS,
  generateOtpCode,
  isMasterAdminEmail,
} from '@/lib/admin-auth/constants'
import { hashAdminOtp } from '@/lib/admin-auth/otp-hash'
import { sendAdminOtpEmail } from '@/lib/admin-auth/send-otp-email'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST() {
  try {
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

    const code = generateOtpCode()
    const otpHash = hashAdminOtp(code, user.id)
    const expiresAt = new Date(Date.now() + ADMIN_OTP_TTL_MS).toISOString()

    const { error: rpcError } = await supabase.rpc('issue_admin_otp_challenge', {
      p_otp_hash: otpHash,
      p_expires_at: expiresAt,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    await sendAdminOtpEmail(code)

    const response = NextResponse.json({ ok: true })
    response.cookies.delete('c360_admin_2fa')
    return response
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al enviar OTP.' },
      { status: 500 },
    )
  }
}
