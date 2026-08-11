/** Correo del Administrador Maestro (2FA OTP obligatorio para /admin). */
export const MASTER_ADMIN_EMAIL = 'rdnv1amaro@gmail.com'

export const ADMIN_2FA_COOKIE = 'c360_admin_2fa'

/** Duración de la verificación OTP completada (8 h). */
export const ADMIN_2FA_TTL_MS = 8 * 60 * 60 * 1000

/** Validez del código OTP enviado por correo (10 min). */
export const ADMIN_OTP_TTL_MS = 10 * 60 * 1000

export function isMasterAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()
}

export function generateOtpCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 10000
  return n.toString().padStart(4, '0')
}
