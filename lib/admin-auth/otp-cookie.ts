import { ADMIN_2FA_COOKIE, ADMIN_2FA_TTL_MS } from '@/lib/admin-auth/constants'
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

/** Firma cookie httpOnly de verificación 2FA completada. */
export async function buildAdmin2faCookieValue(userId: string): Promise<{
  name: string
  value: string
  expires: Date
}> {
  const exp = Date.now() + ADMIN_2FA_TTL_MS
  const payload = `${userId}:${exp}`
  const sig = await hmacHex(payload)
  return {
    name: ADMIN_2FA_COOKIE,
    value: `${payload}:${sig}`,
    expires: new Date(exp),
  }
}

/** Valida cookie 2FA (Edge-compatible). */
export async function isValidAdmin2faCookie(
  cookieValue: string | undefined,
  userId: string,
): Promise<boolean> {
  if (!cookieValue) return false

  const parts = cookieValue.split(':')
  if (parts.length !== 3) return false

  const [uid, expStr, sig] = parts
  if (uid !== userId) return false

  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return false

  const expected = await hmacHex(`${uid}:${exp}`)
  if (sig.length !== expected.length) return false

  let mismatch = 0
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}

export function admin2faCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires,
  }
}
