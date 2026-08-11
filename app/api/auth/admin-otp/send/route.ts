import { NextResponse } from 'next/server'
import { MASTER_ADMIN_EMAIL, isMasterAdminEmail } from '@/lib/admin-auth/constants'
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

    await sendAdminOtpEmail()

    const response = NextResponse.json({
      ok: true,
      sentTo: MASTER_ADMIN_EMAIL,
    })
    response.cookies.delete('c360_admin_2fa')
    return response
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al enviar OTP.' },
      { status: 500 },
    )
  }
}
