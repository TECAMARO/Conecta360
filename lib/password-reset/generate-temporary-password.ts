import { PASSWORD_RESET_MIN_LENGTH } from '@/lib/password-reset/constants'

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export function generateTemporaryPassword(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let password = ''

  for (let i = 0; i < length; i += 1) {
    password += CHARSET[bytes[i]! % CHARSET.length]
  }

  if (password.length < PASSWORD_RESET_MIN_LENGTH) {
    return generateTemporaryPassword(PASSWORD_RESET_MIN_LENGTH)
  }

  return password
}
