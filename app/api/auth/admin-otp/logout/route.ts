import { NextResponse } from 'next/server'
import { ADMIN_2FA_COOKIE } from '@/lib/admin-auth/constants'

/** Elimina la cookie de verificación 2FA admin (p. ej. al cerrar sesión). */
export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_2FA_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
