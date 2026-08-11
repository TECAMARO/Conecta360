import { createHash } from 'crypto'

function otpSecret(): string {
  const secret = process.env.ADMIN_OTP_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('ADMIN_OTP_SECRET no configurado en el servidor.')
  }
  return secret
}

export function hashAdminOtp(code: string, userId: string): string {
  return createHash('sha256').update(`${code}:${userId}:${otpSecret()}`).digest('hex')
}
