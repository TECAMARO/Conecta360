import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

export async function hashDelegatePassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyDelegatePassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false
  return bcrypt.compare(plain, hash)
}

export function isDelegatePasswordStrongEnough(password: string): boolean {
  return password.trim().length >= 8
}
