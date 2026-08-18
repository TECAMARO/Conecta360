import type { Participant } from '@/lib/data'
import { fetchPublishedProfiles } from '@/lib/supabase/profiles-repository'
import { resolveProfileCardTags } from '@/lib/profile-card-tags'
import { normalizeProfileSectors } from '@/lib/profile-sectors'
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

  const sectors = normalizeProfileSectors(profile.sectors, profile.sector)

  return {
    id: userId ?? '',
    name: displayName,
    fullName,
    role: profile.role.trim(),
    acronym: profileInitials(displayName),
    avatarUrl: profile.photoUrl ?? null,
    category: sectorToCategory(sectors[0] ?? ''),
    needs: inferNeedsFromSeeking(profile.seeking),
    location: profile.location.trim(),
    offer: profile.offer,
    seeking: profile.seeking,
    cardOffer: resolveProfileCardTags(profile.offer, profile.offerCardTags, userId ?? 'preview'),
    cardSeeking: resolveProfileCardTags(profile.seeking, profile.seekingCardTags, userId ?? 'preview'),
    description: profile.description.trim(),
    sector: sectors[0] ?? '',
    sectors,
    isPublished: true,
    isCurrentUser: true,
    websiteUrl: profile.websiteUrl ?? null,
  }
}

/** Loads published profiles from Supabase. */
export async function fetchDirectoryParticipants(
  currentUserId?: string | null,
): Promise<Participant[]> {
  return fetchPublishedProfiles(currentUserId)
}
