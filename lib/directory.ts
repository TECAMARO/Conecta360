import type { Participant } from '@/lib/data'
import { fetchPublishedProfiles } from '@/lib/supabase/profiles-repository'
import {
  profileInitials,
  sectorToCategory,
  type UserProfile,
} from '@/lib/profile'
import { inferNeedsFromSeeking } from '@/lib/supabase/profile-utils'

export function profileToParticipant(
  profile: UserProfile,
  userId?: string,
): Participant | null {
  if (!profile.isPublished) return null

  const organization = profile.organization.trim()
  const fullName = profile.fullName.trim()
  const displayName = organization || fullName
  if (!displayName) return null

  return {
    id: userId ?? '',
    name: displayName,
    fullName,
    role: profile.role.trim(),
    acronym: profileInitials(displayName),
    avatarUrl: profile.photoUrl ?? null,
    category: sectorToCategory(profile.sector),
    needs: inferNeedsFromSeeking(profile.seeking),
    location: profile.location.trim(),
    offer: profile.offer,
    seeking: profile.seeking,
    description: profile.description.trim(),
    sector: profile.sector.trim(),
    isPublished: true,
    isCurrentUser: true,
    brochure: profile.brochure ?? null,
  }
}

/** Loads published profiles from Supabase. */
export async function fetchDirectoryParticipants(
  currentUserId?: string | null,
): Promise<Participant[]> {
  return fetchPublishedProfiles(currentUserId)
}
