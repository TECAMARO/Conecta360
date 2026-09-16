import { normalizeDelegateEmail } from '@/lib/delegate-access/constants'
import { findAuthUserByEmail } from '@/lib/password-reset/find-auth-user-by-email'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export type PasswordResetAccountType = 'titular' | 'delegate' | 'none'

export async function resolvePasswordResetAccountType(
  email: string,
): Promise<{
  type: PasswordResetAccountType
  delegateAccessId?: string
  ownerProfileId?: string
  delegateEmail?: string
}> {
  const normalized = normalizeDelegateEmail(email)
  if (!normalized) return { type: 'none' }

  const service = createServiceRoleSupabaseClient()

  const titular = await findAuthUserByEmail(service, email)

  if (titular) {
    return { type: 'titular' }
  }

  const { data: delegate, error: delegateError } = await service
    .from('profile_delegated_access')
    .select('id, owner_profile_id, email, is_active')
    .eq('email_normalized', normalized)
    .eq('is_active', true)
    .maybeSingle()

  if (delegateError) {
    throw new Error(delegateError.message)
  }

  if (delegate) {
    return {
      type: 'delegate',
      delegateAccessId: delegate.id,
      ownerProfileId: delegate.owner_profile_id,
      delegateEmail: delegate.email,
    }
  }

  return { type: 'none' }
}
