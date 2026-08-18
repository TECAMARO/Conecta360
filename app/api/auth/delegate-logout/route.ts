import { NextResponse } from 'next/server'
import { DELEGATE_SESSION_COOKIE } from '@/lib/delegate-access/constants'
import {
  clearDelegateSessionCookieOptions,
} from '@/lib/delegate-access/delegate-cookie'

export const runtime = 'nodejs'

/** Limpia cookie de contexto delegado (p. ej. al iniciar sesión como titular). */
export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(DELEGATE_SESSION_COOKIE, '', clearDelegateSessionCookieOptions())
  return response
}
