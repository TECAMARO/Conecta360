import { hash, compare } from 'bcryptjs'

const BCRYPT_ROUNDS = 12

export async function hashDelegatePassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS)
}

export async function verifyDelegatePassword(plain: string, hashValue: string): Promise<boolean> {
  if (!plain || !hashValue) return false
  return compare(plain, hashValue)
}

export function isDelegatePasswordStrongEnough(password: string): boolean {
  return password.trim().length >= 8
}
