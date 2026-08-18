import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export type DelegateEmailRow = {
  profile_id: string
  delegate_email: string
}

/** Emails delegados activos para uno o más perfiles titulares (service role). */
export async function fetchActiveDelegateEmailsForProfiles(
  profileIds: string[],
): Promise<DelegateEmailRow[]> {
  const unique = [...new Set(profileIds.filter(Boolean))]
  if (unique.length === 0) return []

  const supabase = createServiceRoleSupabaseClient()
  const { data, error } = await supabase.rpc('get_active_delegate_emails_for_profiles', {
    p_profile_ids: unique,
  })

  if (error) {
    console.error('[fetchActiveDelegateEmailsForProfiles]', error.message)
    return []
  }

  return (data ?? []) as DelegateEmailRow[]
}

/** Destinatarios únicos: titular + delegados activos. */
export function mergeProfileAndDelegateEmails(
  profileEmail: string | null | undefined,
  delegateRows: DelegateEmailRow[],
  profileId: string,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  const primary = profileEmail?.trim()
  if (primary) {
    seen.add(primary.toLowerCase())
    out.push(primary)
  }

  for (const row of delegateRows) {
    if (row.profile_id !== profileId) continue
    const email = row.delegate_email?.trim()
    if (!email) continue
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(email)
  }

  return out
}
