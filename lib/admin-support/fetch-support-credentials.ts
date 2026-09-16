import {
  decryptSupportPassword,
  isSupportVaultConfigured,
} from '@/lib/admin-support/credential-vault'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export type SupportDelegateCredential = {
  id: string
  email: string
  password: string | null
  passwordAvailable: boolean
}

export type SupportUserCredential = {
  profileId: string
  representativeName: string
  organizationName: string
  email: string
  ownerPassword: string | null
  ownerPasswordAvailable: boolean
  delegates: SupportDelegateCredential[]
}

type VaultRow = {
  id: string
  profile_id: string
  credential_kind: 'owner' | 'delegate'
  delegate_access_id: string | null
  login_email_normalized: string
  password_ciphertext: string
  password_iv: string
  password_tag: string
}

function tryDecrypt(row: VaultRow): string | null {
  try {
    return decryptSupportPassword({
      ciphertext: row.password_ciphertext,
      iv: row.password_iv,
      tag: row.password_tag,
    })
  } catch {
    return null
  }
}

export async function fetchSupportCredentialsForAdmin(): Promise<SupportUserCredential[]> {
  const service = createServiceRoleSupabaseClient()

  const [{ data: profiles, error: profilesError }, { data: delegates, error: delegatesError }] =
    await Promise.all([
      service
        .from('profiles')
        .select('id, full_name, organization_name, email, role')
        .neq('role', 'admin')
        .order('organization_name', { ascending: true }),
      service
        .from('profile_delegated_access')
        .select('id, owner_profile_id, email, is_active')
        .eq('is_active', true)
        .order('email', { ascending: true }),
    ])

  if (profilesError) throw new Error(profilesError.message)
  if (delegatesError) throw new Error(delegatesError.message)

  let vaultRows: VaultRow[] = []
  if (isSupportVaultConfigured()) {
    const { data, error } = await service.from('support_credential_vault').select('*')
    if (error) throw new Error(error.message)
    vaultRows = (data ?? []) as VaultRow[]
  }

  const ownerVaultByProfile = new Map<string, VaultRow>()
  const delegateVaultById = new Map<string, VaultRow>()

  for (const row of vaultRows) {
    if (row.credential_kind === 'owner') {
      ownerVaultByProfile.set(row.profile_id, row)
    } else if (row.delegate_access_id) {
      delegateVaultById.set(row.delegate_access_id, row)
    }
  }

  const delegatesByOwner = new Map<string, typeof delegates>()
  for (const delegate of delegates ?? []) {
    const list = delegatesByOwner.get(delegate.owner_profile_id) ?? []
    list.push(delegate)
    delegatesByOwner.set(delegate.owner_profile_id, list)
  }

  return (profiles ?? []).map((profile) => {
    const ownerVault = ownerVaultByProfile.get(profile.id)
    const ownerPassword = ownerVault ? tryDecrypt(ownerVault) : null

    const profileDelegates = delegatesByOwner.get(profile.id) ?? []

    return {
      profileId: profile.id,
      representativeName:
        profile.full_name?.trim() || profile.email?.trim() || 'Sin nombre',
      organizationName:
        profile.organization_name?.trim() || profile.full_name?.trim() || 'Sin organización',
      email: profile.email?.trim() ?? '',
      ownerPassword,
      ownerPasswordAvailable: Boolean(ownerPassword),
      delegates: profileDelegates.map((delegate) => {
        const vault = delegateVaultById.get(delegate.id)
        const password = vault ? tryDecrypt(vault) : null
        return {
          id: delegate.id,
          email: delegate.email,
          password,
          passwordAvailable: Boolean(password),
        }
      }),
    }
  })
}
