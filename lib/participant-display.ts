import type { Participant } from '@/lib/data'
import { profileInitials } from '@/lib/profile'

/** Resolves avatar URL from Supabase `logo_url` (exposed as avatarUrl on Participant). */
export function getParticipantAvatarUrl(
  participant: Pick<Participant, 'avatarUrl'>,
): string | null {
  const url = participant.avatarUrl?.trim()
  return url || null
}

export function participantDisplayAcronym(participant: Pick<Participant, 'acronym' | 'name'>): string {
  return participant.acronym || profileInitials(participant.name || '?')
}
