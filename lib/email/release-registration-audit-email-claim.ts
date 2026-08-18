import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type ServerSupabase = SupabaseClient<Database>

export async function releaseRegistrationAuditEmailClaim(
  supabase: ServerSupabase,
): Promise<void> {
  const { error } = await supabase.rpc('release_profile_registration_audit_email_claim')
  if (error) {
    console.warn('[releaseRegistrationAuditEmailClaim]', error.message)
  }
}
