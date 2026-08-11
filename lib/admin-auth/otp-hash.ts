import { createHash } from 'crypto'
import { getAdminOtpSecret } from '@/lib/admin-auth/otp-secret'

export function hashAdminOtp(code: string, userId: string): string {
  return createHash('sha256')
    .update(`${code}:${userId}:${getAdminOtpSecret()}`)
    .digest('hex')
}
