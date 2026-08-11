/**
 * Secreto para firmar cookies 2FA y hashear OTP local (fallback en cadena).
 * En producción define ADMIN_OTP_SECRET en .env.local
 */
export function getAdminOtpSecret(): string {
  const secret =
    process.env.ADMIN_OTP_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (secret) return secret

  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[admin-auth] Usando secreto de desarrollo. Define ADMIN_OTP_SECRET en .env.local.',
    )
    return 'conecta360-dev-otp-secret'
  }

  throw new Error(
    'ADMIN_OTP_SECRET no configurado. Añade ADMIN_OTP_SECRET=tu-clave-segura en .env.local',
  )
}
