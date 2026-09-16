import { cookies } from 'next/headers'
import { ADMIN_SUPPORT_2FA_COOKIE } from '@/lib/admin-auth/support-constants'
import { isValidAdminSupport2faCookie } from '@/lib/admin-auth/support-otp-cookie'
import { verifyAdminApiRequest } from '@/lib/admin/verify-admin-api'

export async function verifySupportApiRequest(): Promise<
  { ok: true; userId: string } | { ok: false }
> {
  const admin = await verifyAdminApiRequest()
  if (!admin.ok) return { ok: false }

  const cookieStore = await cookies()
  const supportCookie = cookieStore.get(ADMIN_SUPPORT_2FA_COOKIE)?.value
  const validSupport = await isValidAdminSupport2faCookie(supportCookie, admin.userId)
  if (!validSupport) return { ok: false }

  return { ok: true, userId: admin.userId }
}
