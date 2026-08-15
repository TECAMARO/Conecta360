import { cookies } from 'next/headers'
import { isMasterAdminEmail, ADMIN_2FA_COOKIE } from '@/lib/admin-auth/constants'
import { isValidAdmin2faCookie } from '@/lib/admin-auth/otp-cookie'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function verifyAdminApiRequest(): Promise<{ ok: true; userId: string } | { ok: false }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email || !isMasterAdminEmail(user.email)) {
    return { ok: false }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return { ok: false }
  }

  const cookieStore = await cookies()
  const otpCookie = cookieStore.get(ADMIN_2FA_COOKIE)?.value
  const validOtp = await isValidAdmin2faCookie(otpCookie, user.id)
  if (!validOtp) {
    return { ok: false }
  }

  return { ok: true, userId: user.id }
}
