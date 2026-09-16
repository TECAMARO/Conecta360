import { ADMIN_SUPPORT_2FA_COOKIE, ADMIN_SUPPORT_2FA_TTL_MS } from '@/lib/admin-auth/support-constants'
import { getAdminOtpSecret } from '@/lib/admin-auth/otp-secret'

function cookieSecret(): string {
  return getAdminOtpSecret()
}

async function hmacHex(message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(cookieSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function buildAdminSupport2faCookieValue(userId: string): Promise<{
  name: string
  value: string
  expires: Date
}> {
  const exp = Date.now() + ADMIN_SUPPORT_2FA_TTL_MS
  const payload = `support:${userId}:${exp}`
  const sig = await hmacHex(payload)
  return {
    name: ADMIN_SUPPORT_2FA_COOKIE,
    value: `${payload}:${sig}`,
    expires: new Date(exp),
  }
}

export async function isValidAdminSupport2faCookie(
  cookieValue: string | undefined,
  userId: string,
): Promise<boolean> {
  if (!cookieValue) return false

  const parts = cookieValue.split(':')
  if (parts.length !== 4 || parts[0] !== 'support') return false

  const uid = parts[1]
  const expStr = parts[2]
  const sig = parts[3]
  if (!uid || !expStr || !sig) return false
  if (uid !== userId) return false

  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return false

  const expected = await hmacHex(`support:${uid}:${exp}`)
  if (sig.length !== expected.length) return false

  let mismatch = 0
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}

export function adminSupport2faCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires,
  }
}
