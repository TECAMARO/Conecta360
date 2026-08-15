import type { Appointment, Participant } from '@/lib/data'
import type { CorporateBrochure } from '@/lib/corporate-brochure'
import type { MeetingEvaluation } from '@/lib/meeting-evaluation'
import { MEETING_MODALITY, formatPhysicalTable } from '@/lib/physical-tables'
import {
  profileInitials,
  sectorToCategory,
  type UserProfile,
} from '@/lib/profile'
import type { MeetingRow, ProfileRow, ProfileUpsert } from '@/lib/supabase/database.types'
import { inferNeedsFromSeeking } from '@/lib/supabase/profile-utils'
import { dbMeetingStatusToApp } from '@/lib/supabase/meeting-status'
import { slotIdFromMeetingDayAndTime } from '@/lib/meeting-slots'

export function profileRowToUserProfile(row: ProfileRow, brochure?: CorporateBrochure | null): UserProfile {
  return {
    fullName: row.full_name ?? '',
    role: row.job_title ?? '',
    organization: row.organization_name ?? '',
    sector: row.sector ?? '',
    location: row.region ?? '',
    description: row.description ?? '',
    offer: row.offers ?? [],
    seeking: row.seeks ?? [],
    isPublished: row.is_published === true,
    photoUrl: row.logo_url,
    brochure: brochure ?? null,
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
  description?: string | null
  offers?: string[] | null
  seeks?: string[] | null
  is_published?: boolean | null
  logo_url?: string | null
  brochure_url?: string | null
  updated_at?: string | null
}

/** Maps app profile fields to DB columns (`location` → `region`, etc.). */
export function buildProfileWritePayload(
  userId: string,
  profile: UserProfile,
  email?: string | null,
  options?: { includeBrochureUrl?: boolean },
): ProfileWritePayload {
  const payload: ProfileWritePayload = {
    id: userId,
    email: email ?? null,
    full_name: profile.fullName.trim() || null,
    job_title: profile.role.trim() || null,
    organization_name: profile.organization.trim() || null,
    region: profile.location.trim() || null,
    sector: profile.sector.trim() || null,
    description: profile.description.trim() || null,
    offers: profile.offer,
    seeks: profile.seeking,
    is_published: profile.isPublished,
    logo_url: profile.photoUrl ?? null,
    updated_at: new Date().toISOString(),
  }

  if (options?.includeBrochureUrl !== false) {
    payload.brochure_url =
      profile.brochure?.brochureUrl ?? profile.brochure?.publicUrl ?? null
  }

  return payload
}

/** Full profile row for Supabase upsert (includes brochure_url when present). */
export function userProfileToRow(
  userId: string,
  profile: UserProfile,
  email?: string | null,
): ProfileUpsert {
  return buildProfileWritePayload(userId, profile, email, { includeBrochureUrl: true })
}

export function profileRowToParticipant(
  row: ProfileRow,
  options?: { isCurrentUser?: boolean; brochure?: CorporateBrochure | null },
): Participant | null {
  if (!row.is_published) return null

  return profileRowToAgendaParticipant(row, options)
}

/** Perfil visible en Mi Agenda aunque el usuario aún no esté en el directorio cacheado. */
export function profileRowToAgendaParticipant(
  row: ProfileRow,
  options?: { isCurrentUser?: boolean; brochure?: CorporateBrochure | null },
): Participant | null {
  const organization = (row.organization_name ?? '').trim()
  const fullName = (row.full_name ?? '').trim()
  const displayName = organization || fullName || (row.email ?? '').trim()
  if (!displayName) return null

  return {
    id: row.id,
    name: displayName,
    fullName,
    role: (row.job_title ?? '').trim(),
    acronym: profileInitials(displayName),
    avatarUrl: row.logo_url,
    category: sectorToCategory(row.sector ?? ''),
    needs: inferNeedsFromSeeking(row.seeks ?? []),
    location: (row.region ?? '').trim(),
    offer: row.offers ?? [],
    seeking: row.seeks ?? [],
    description: (row.description ?? '').trim(),
    sector: (row.sector ?? '').trim(),
    isPublished: row.is_published === true,
    isCurrentUser: options?.isCurrentUser,
    brochure: options?.brochure ?? null,
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
