import { supabase } from '@/src/lib/supabaseClient'
import type { UserProfile } from '@/lib/profile'
import {
  buildProfileWritePayload,
  profileRowToAgendaParticipant,
  profileRowToParticipant,
  profileRowToUserProfile,
} from '@/lib/supabase/mappers'
import type { Participant } from '@/lib/data'
import type { ProfileRow } from '@/lib/supabase/database.types'
import { normalizeProfileSectors } from '@/lib/profile-sectors'

async function requireAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Sesión no válida. Vuelve a iniciar sesión.')
  return data.user
}

/** Merges form state with the remote profile so upsert never omits required columns. */
async function mergeProfileWithRemote(form: UserProfile, userId: string): Promise<UserProfile> {
  const remote = await fetchMyProfile(userId)
  if (!remote) return form

  return {
    fullName: form.fullName.trim() || remote.fullName,
    role: form.role.trim() || remote.role,
    organization: form.organization.trim() || remote.organization,
    sector: form.sector.trim() || remote.sector,
    sectors:
      form.sectors.length > 0
        ? form.sectors
        : normalizeProfileSectors(remote.sectors, remote.sector),
    location: form.location.trim() || remote.location,
    description: form.description.trim() || remote.description,
    offer: form.offer.length > 0 ? form.offer : remote.offer,
    seeking: form.seeking.length > 0 ? form.seeking : remote.seeking,
    isPublished: form.isPublished,
    photoUrl: form.photoUrl === undefined ? remote.photoUrl : form.photoUrl,
    websiteUrl: form.websiteUrl === undefined ? remote.websiteUrl : form.websiteUrl,
    offerCardTags: form.offerCardTags === undefined ? remote.offerCardTags : form.offerCardTags,
    seekingCardTags:
      form.seekingCardTags === undefined ? remote.seekingCardTags : form.seekingCardTags,
    verityStatus: remote.verityStatus,
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function fetchMyProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return profileRowToUserProfile(data)
}

export async function upsertMyProfile(
  profile: UserProfile,
  email?: string | null,
  options?: { skipRemoteMerge?: boolean },
): Promise<string> {
  const user = await requireAuthenticatedUser()
  const merged = options?.skipRemoteMerge
    ? profile
    : await mergeProfileWithRemote(profile, user.id)

  if (!merged.organization.trim()) {
    throw new Error(
      'Completa el campo "Empresa u Organización" antes de guardar el perfil.',
    )
  }

  const payload = buildProfileWritePayload(user.id, merged, email ?? user.email)

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
  if (error) throw new Error(error.message)
  return user.id
}

export async function fetchPublishedProfiles(currentUserId?: string | null): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_published', true)
    .neq('verity_status', 'red')
    .order('organization_name', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as ProfileRow[]
  const participants: Participant[] = []

  for (const row of rows) {
    const participant = profileRowToParticipant(row, {
      isCurrentUser: currentUserId ? row.id === currentUserId : false,
    })
    if (participant) participants.push(participant)
  }

  return participants
}

/** Perfiles de contrapartes en reuniones (p. ej. solicitudes realtime en Mi Agenda). */
export async function fetchProfilesByIds(
  profileIds: string[],
  currentUserId?: string | null,
): Promise<Participant[]> {
  const ids = [...new Set(profileIds.filter(Boolean))]
  if (ids.length === 0) return []

  const { data, error } = await supabase.from('profiles').select('*').in('id', ids)
  if (error) throw new Error(error.message)

  const participants: Participant[] = []
  for (const row of (data ?? []) as ProfileRow[]) {
    const participant = profileRowToAgendaParticipant(row, {
      isCurrentUser: currentUserId ? row.id === currentUserId : false,
    })
    if (participant) participants.push(participant)
  }

  return participants
}

export async function fetchProfileDisplayName(profileId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('organization_name, full_name')
    .eq('id', profileId)
    .maybeSingle()

  if (error || !data) return null
  return (data.organization_name ?? '').trim() || (data.full_name ?? '').trim() || null
}
