import type { Appointment, Participant } from '@/lib/data'
import type { MeetingEvaluation } from '@/lib/meeting-evaluation'
import { MEETING_MODALITY, formatPhysicalTable } from '@/lib/physical-tables'
import {
  profileInitials,
  sectorToCategory,
  type UserProfile,
} from '@/lib/profile'
import { normalizeOrganizationWebsite } from '@/lib/organization-website'
import { normalizeProfileSectors } from '@/lib/profile-sectors'
import { pruneProfileCardTags, resolveProfileCardTags } from '@/lib/profile-card-tags'
import { normalizeVerityStatus } from '@/lib/verity-status'
import type { MeetingRow, ProfileRow, ProfileUpsert } from '@/lib/supabase/database.types'
import { inferNeedsFromSeeking } from '@/lib/supabase/profile-utils'
import { dbMeetingStatusToApp } from '@/lib/supabase/meeting-status'
import { slotIdFromMeetingDayAndTime } from '@/lib/meeting-slots'

export function profileRowToUserProfile(row: ProfileRow): UserProfile {
  const sectors = normalizeProfileSectors(row.sectors, row.sector)
  return {
    fullName: row.full_name ?? '',
    role: row.job_title ?? '',
    organization: row.organization_name ?? '',
    sector: sectors[0] ?? '',
    sectors,
    location: row.region ?? '',
    description: row.description ?? '',
    offer: row.offers ?? [],
    seeking: row.seeks ?? [],
    isPublished: row.is_published === true,
    photoUrl: row.logo_url,
    websiteUrl: normalizeOrganizationWebsite(row.website_url),
    offerCardTags: row.offer_card_tags ?? null,
    seekingCardTags: row.seeking_card_tags ?? null,
    verityStatus: normalizeVerityStatus(row.verity_status),
  }
}

/** Strict write shape — only columns that exist in Supabase `profiles`. */
export type ProfileWritePayload = {
  id: string
  email?: string | null
  full_name?: string | null
  job_title?: string | null
  organization_name?: string | null
  region?: string | null
  sector?: string | null
  sectors?: string[] | null
  description?: string | null
  offers?: string[] | null
  seeks?: string[] | null
  is_published?: boolean | null
  logo_url?: string | null
  website_url?: string | null
  offer_card_tags?: string[] | null
  seeking_card_tags?: string[] | null
  updated_at?: string | null
}

/** Maps app profile fields to DB columns (`location` → `region`, etc.). */
export function buildProfileWritePayload(
  userId: string,
  profile: UserProfile,
  email?: string | null,
): ProfileWritePayload {
  const sectors = normalizeProfileSectors(profile.sectors, profile.sector)
  return {
    id: userId,
    email: email ?? null,
    full_name: profile.fullName.trim() || null,
    job_title: profile.role.trim() || null,
    organization_name: profile.organization.trim() || null,
    region: profile.location.trim() || null,
    sector: sectors[0] ?? null,
    sectors: sectors.length > 0 ? sectors : null,
    description: profile.description.trim() || null,
    offers: profile.offer,
    seeks: profile.seeking,
    is_published: profile.isPublished,
    logo_url: profile.photoUrl ?? null,
    website_url: normalizeOrganizationWebsite(profile.websiteUrl),
    offer_card_tags:
      profile.offerCardTags == null
        ? null
        : pruneProfileCardTags(profile.offer, profile.offerCardTags),
    seeking_card_tags:
      profile.seekingCardTags == null
        ? null
        : pruneProfileCardTags(profile.seeking, profile.seekingCardTags),
    updated_at: new Date().toISOString(),
  }
}

/** Full profile row for Supabase upsert. */
export function userProfileToRow(
  userId: string,
  profile: UserProfile,
  email?: string | null,
): ProfileUpsert {
  return buildProfileWritePayload(userId, profile, email)
}

export function profileRowToParticipant(
  row: ProfileRow,
  options?: { isCurrentUser?: boolean },
): Participant | null {
  if (!row.is_published) return null
  if (row.verity_status === 'red') return null

  return profileRowToAgendaParticipant(row, options)
}

/** Perfil visible en Mi Agenda aunque el usuario aún no esté en el directorio cacheado. */
export function profileRowToAgendaParticipant(
  row: ProfileRow,
  options?: { isCurrentUser?: boolean },
): Participant | null {
  const organization = (row.organization_name ?? '').trim()
  const fullName = (row.full_name ?? '').trim()
  const displayName = organization || fullName || (row.email ?? '').trim()
  if (!displayName) return null
  if (row.verity_status === 'red' && !options?.isCurrentUser) return null

  const offer = row.offers ?? []
  const seeking = row.seeks ?? []
  const sectors = normalizeProfileSectors(row.sectors, row.sector)

  return {
    id: row.id,
    name: displayName,
    fullName,
    role: (row.job_title ?? '').trim(),
    acronym: profileInitials(displayName),
    avatarUrl: row.logo_url,
    category: sectorToCategory(sectors[0] ?? ''),
    needs: inferNeedsFromSeeking(seeking),
    location: (row.region ?? '').trim(),
    offer,
    seeking,
    cardOffer: resolveProfileCardTags(offer, row.offer_card_tags, row.id),
    cardSeeking: resolveProfileCardTags(seeking, row.seeking_card_tags, row.id),
    description: (row.description ?? '').trim(),
    sector: sectors[0] ?? '',
    sectors,
    isPublished: row.is_published === true,
    isCurrentUser: options?.isCurrentUser,
    websiteUrl: normalizeOrganizationWebsite(row.website_url),
  }
}

export function meetingRowToAppointment(
  row: MeetingRow,
  currentUserId: string,
  evaluation?: MeetingEvaluation | null,
): Appointment {
  const isSent = row.requester_id === currentUserId
  const slotTime = row.slot_time
  return {
    id: row.id,
    participantId: isSent ? row.recipient_id : row.requester_id,
    requesterId: row.requester_id,
    recipientId: row.recipient_id,
    slotId: slotIdFromMeetingDayAndTime(row.day, slotTime),
    day: row.day,
    time: slotTime,
    table: formatPhysicalTable(row.table_number),
    tableNumber: row.table_number,
    modality: MEETING_MODALITY,
    status: dbMeetingStatusToApp(row.status),
    direction: isSent ? 'sent' : 'received',
    message: row.proposal ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    evaluation: evaluation ?? undefined,
  }
}

export function meetingRowToSlotOccupancy(row: MeetingRow): Appointment {
  const slotTime = row.slot_time
  return {
    id: row.id,
    participantId: row.recipient_id,
    slotId: slotIdFromMeetingDayAndTime(row.day, slotTime),
    day: row.day,
    time: slotTime,
    table: formatPhysicalTable(row.table_number),
    tableNumber: row.table_number,
    modality: MEETING_MODALITY,
    status: dbMeetingStatusToApp(row.status),
    direction: 'sent',
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}
