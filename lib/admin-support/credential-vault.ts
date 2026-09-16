import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { getAdminOtpSecret } from '@/lib/admin-auth/otp-secret'
import { normalizeDelegateEmail } from '@/lib/delegate-access/constants'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

const ALGORITHM = 'aes-256-gcm'

export type SupportCredentialKind = 'owner' | 'delegate'

export type EncryptedSupportPassword = {
  ciphertext: string
  iv: string
  tag: string
}

/** Misma clave lógica que el OTP admin/Soporte (ADMIN_OTP_SECRET vía getAdminOtpSecret). */
function getVaultKey(): Buffer {
  return scryptSync(getAdminOtpSecret(), 'conecta360-support-vault-v1', 32)
}

export function isSupportVaultConfigured(): boolean {
  try {
    getAdminOtpSecret()
    return true
  } catch {
    return false
  }
}

export function encryptSupportPassword(plaintext: string): EncryptedSupportPassword {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getVaultKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
}

export function decryptSupportPassword(payload: EncryptedSupportPassword): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    getVaultKey(),
    Buffer.from(payload.iv, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

export async function upsertOwnerCredentialVault(args: {
  profileId: string
  email: string
  password: string
}): Promise<void> {
  if (!isSupportVaultConfigured()) return

  const encrypted = encryptSupportPassword(args.password)
  const service = createServiceRoleSupabaseClient()
  const loginEmailNormalized = normalizeDelegateEmail(args.email)

  const row = {
    profile_id: args.profileId,
    credential_kind: 'owner' as const,
    delegate_access_id: null,
    login_email_normalized: loginEmailNormalized,
    password_ciphertext: encrypted.ciphertext,
    password_iv: encrypted.iv,
    password_tag: encrypted.tag,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await service
    .from('support_credential_vault')
    .select('id')
    .eq('profile_id', args.profileId)
    .eq('credential_kind', 'owner')
    .eq('login_email_normalized', loginEmailNormalized)
    .maybeSingle()

  const { error } = existing?.id
    ? await service.from('support_credential_vault').update(row).eq('id', existing.id)
    : await service.from('support_credential_vault').insert(row)

  if (error) throw new Error(error.message)
}

export async function upsertDelegateCredentialVault(args: {
  profileId: string
  delegateAccessId: string
  email: string
  password: string
}): Promise<void> {
  if (!isSupportVaultConfigured()) return

  const encrypted = encryptSupportPassword(args.password)
  const service = createServiceRoleSupabaseClient()
  const loginEmailNormalized = normalizeDelegateEmail(args.email)

  const row = {
    profile_id: args.profileId,
    credential_kind: 'delegate' as const,
    delegate_access_id: args.delegateAccessId,
    login_email_normalized: loginEmailNormalized,
    password_ciphertext: encrypted.ciphertext,
    password_iv: encrypted.iv,
    password_tag: encrypted.tag,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await service
    .from('support_credential_vault')
    .select('id')
    .eq('delegate_access_id', args.delegateAccessId)
    .maybeSingle()

  const { error } = existing?.id
    ? await service.from('support_credential_vault').update(row).eq('id', existing.id)
    : await service.from('support_credential_vault').insert(row)

  if (error) throw new Error(error.message)
}
