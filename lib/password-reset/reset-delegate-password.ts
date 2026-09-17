import {
  buildDelegatePasswordResetOwnerHtml,
  buildDelegatePasswordResetOwnerSubject,
  buildDelegatePasswordResetOwnerText,
} from '@/lib/email/delegate-password-reset-template'
import { sendTransactionalMail } from '@/lib/email/send-transactional-mail'
import { getEmailSiteUrl } from '@/lib/email/site-url'
import { isTransactionalSmtpConfigured } from '@/lib/email/smtp'
import { encryptSupportPassword } from '@/lib/admin-support/credential-vault'
import { upsertDelegateCredentialVault } from '@/lib/admin-support/credential-vault'
import { hashDelegatePassword } from '@/lib/delegate-access/password'
import { generateTemporaryPassword } from '@/lib/password-reset/generate-temporary-password'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export async function resetDelegatePasswordAccess(args: {
  delegateAccessId: string
  siteUrl?: string
}): Promise<{ ok: true; delegateEmail: string } | { ok: false; error: string }> {
  if (!isTransactionalSmtpConfigured()) {
    return { ok: false, error: 'SMTP transaccional no configurado.' }
  }

  const service = createServiceRoleSupabaseClient()

  const { data: delegate, error: delegateError } = await service
    .from('profile_delegated_access')
    .select('id, owner_profile_id, email, is_active')
    .eq('id', args.delegateAccessId)
    .maybeSingle()

  if (delegateError) {
    return { ok: false, error: delegateError.message }
  }
  if (!delegate?.is_active) {
    return { ok: false, error: 'Acceso delegado no encontrado.' }
  }

  const { data: ownerProfile, error: ownerError } = await service
    .from('profiles')
    .select('id, email, full_name, organization_name')
    .eq('id', delegate.owner_profile_id)
    .maybeSingle()

  if (ownerError) {
    return { ok: false, error: ownerError.message }
  }
  if (!ownerProfile?.email) {
    return { ok: false, error: 'Titular sin correo registrado.' }
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashDelegatePassword(temporaryPassword)

  const { error: updateError } = await service
    .from('profile_delegated_access')
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq('id', delegate.id)

  if (updateError) {
    return { ok: false, error: updateError.message }
  }

  try {
    await upsertDelegateCredentialVault({
      profileId: delegate.owner_profile_id,
      delegateAccessId: delegate.id,
      email: delegate.email,
      password: temporaryPassword,
    })
  } catch (vaultErr) {
    console.warn('[reset-delegate-password] vault sync failed:', vaultErr)
  }

  const encrypted = encryptSupportPassword(temporaryPassword)

  const { error: noticeError } = await service.from('delegate_password_reset_notices').insert({
    owner_profile_id: delegate.owner_profile_id,
    delegate_access_id: delegate.id,
    delegate_email: delegate.email,
    password_ciphertext: encrypted.ciphertext,
    password_iv: encrypted.iv,
    password_tag: encrypted.tag,
  })

  if (noticeError) {
    console.warn('[reset-delegate-password] notice insert failed:', noticeError.message)
  }

  const siteUrl = (args.siteUrl ?? getEmailSiteUrl()).replace(/\/$/, '')
  const platformUrl = `${siteUrl}/plataforma?view=access`
  const ownerName =
    ownerProfile.organization_name?.trim() ||
    ownerProfile.full_name?.trim() ||
    ownerProfile.email

  await sendTransactionalMail({
    to: ownerProfile.email,
    subject: buildDelegatePasswordResetOwnerSubject(delegate.email),
    text: buildDelegatePasswordResetOwnerText({
      ownerName,
      delegateEmail: delegate.email,
      temporaryPassword,
      platformUrl,
    }),
    html: buildDelegatePasswordResetOwnerHtml({
      ownerName,
      delegateEmail: delegate.email,
      temporaryPassword,
      platformUrl,
    }),
    entityRef: `delegate-password-reset:${delegate.id}`,
  })

  return { ok: true, delegateEmail: delegate.email }
}
