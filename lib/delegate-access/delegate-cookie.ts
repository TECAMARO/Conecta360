import {
  DELEGATE_SESSION_COOKIE,
  type DelegateSessionPayload,
} from '@/lib/delegate-access/constants'
import { getAdminOtpSecret } from '@/lib/admin-auth/otp-secret'

const DELEGATE_COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000

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

export async function buildDelegateSessionCookieValue(
  payload: DelegateSessionPayload,
): Promise<{ name: string; value: string; expires: Date }> {
  const exp = Date.now() + DELEGATE_COOKIE_TTL_MS
  const body = `${payload.ownerUserId}:${payload.delegateEmail}:${payload.delegateAccessId}:${exp}`
  const sig = await hmacHex(body)
  return {
    name: DELEGATE_SESSION_COOKIE,
    value: `${body}:${sig}`,
    expires: new Date(exp),
  }
}

export async function parseDelegateSessionCookie(
  cookieValue: string | undefined,
): Promise<DelegateSessionPayload | null> {
  if (!cookieValue) return null

  const parts = cookieValue.split(':')
  if (parts.length !== 5) return null

  const [ownerUserId, delegateEmail, delegateAccessId, expStr, sig] = parts
  if (!ownerUserId || !delegateEmail || !delegateAccessId) return null

  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return null

  const expected = await hmacHex(`${ownerUserId}:${delegateEmail}:${delegateAccessId}:${exp}`)
  if (sig.length !== expected.length) return null

  let mismatch = 0
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  if (mismatch !== 0) return null

  return { ownerUserId, delegateEmail, delegateAccessId }
}

export function delegateSessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires,
  }
}

export function clearDelegateSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}
