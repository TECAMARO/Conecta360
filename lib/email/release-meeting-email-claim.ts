import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type ServerSupabase = SupabaseClient<Database>

export async function releaseMeetingConfirmationEmailClaim(
  supabase: ServerSupabase,
  meetingId: string,
): Promise<void> {
  const { error } = await supabase.rpc('release_meeting_confirmation_email_claim', {
    p_meeting_id: meetingId,
  })
  if (error) {
    console.warn('[releaseMeetingConfirmationEmailClaim]', error.message)
  }
}

export async function releaseMeetingCancellationEmailClaim(
  supabase: ServerSupabase,
  meetingId: string,
): Promise<void> {
  const { error } = await supabase.rpc('release_meeting_cancellation_email_claim', {
    p_meeting_id: meetingId,
  })
  if (error) {
    console.warn('[releaseMeetingCancellationEmailClaim]', error.message)
  }
}
