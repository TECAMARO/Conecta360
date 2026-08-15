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
import { rowToBrochure } from '@/lib/supabase/brochures-repository'

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
    location: form.location.trim() || remote.location,
    description: form.description.trim() || remote.description,
    offer: form.offer.length > 0 ? form.offer : remote.offer,
    seeking: form.seeking.length > 0 ? form.seeking : remote.seeking,
    isPublished: form.isPublished,
    photoUrl: form.photoUrl ?? remote.photoUrl,
    brochure: form.brochure ?? remote.brochure,
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

  const brochure = rowToBrochure(data)
  return profileRowToUserProfile(data, brochure)
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
      'Completa el campo "Empresa u Organización" antes de guardar el perfil o subir el brochure.',
    )
  }

  const payload = buildProfileWritePayload(user.id, merged, email ?? user.email)

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
  if (error) throw new Error(error.message)
  return user.id
}

/** Updates only brochure_url when the profile row already exists. */
export async function updateMyProfileBrochureUrl(brochureUrl: string | null): Promise<void> {
  const user = await requireAuthenticatedUser()

  const { data, error } = await supabase
    .from('profiles')
    .update({
      brochure_url: brochureUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('id')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    throw new Error(
      'No se encontró tu perfil. Completa "Empresa u Organización" y guarda el perfil antes de adjuntar el brochure.',
    )
  }
}

/**
 * Saves brochure URL: tries a targeted update first; falls back to full upsert
 * merged with remote/form data when the row does not exist yet.
 */
export async function saveMyProfileBrochure(
  brochureUrl: string,
  formProfile: UserProfile,
  email?: string | null,
): Promise<string> {
  const user = await requireAuthenticatedUser()

  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (fetchError) throw new Error(fetchError.message)

  if (existing) {
    const { error } = await supabase
      .from('profiles')
      .update({
        brochure_url: brochureUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) throw new Error(error.message)
    return user.id
  }

  const merged = await mergeProfileWithRemote(
    { ...formProfile, brochure: formProfile.brochure ?? null },
    user.id,
  )

  if (!merged.organization.trim()) {
    throw new Error(
      'Completa el campo "Empresa u Organización" antes de subir el brochure.',
    )
  }

  const payload = buildProfileWritePayload(
    user.id,
    { ...merged, brochure: formProfile.brochure },
    email ?? user.email,
  )
  payload.brochure_url = brochureUrl

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
  if (error) throw new Error(error.message)
  return user.id
}

export async function fetchPublishedProfiles(currentUserId?: string | null): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_published', true)
    .order('organization_name', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as ProfileRow[]
  const participants: Participant[] = []

  for (const row of rows) {
    const brochure = rowToBrochure(row)
    const participant = profileRowToParticipant(row, {
      isCurrentUser: currentUserId ? row.id === currentUserId : false,
      brochure,
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
    const brochure = rowToBrochure(row)
    const participant = profileRowToAgendaParticipant(row, {
      isCurrentUser: currentUserId ? row.id === currentUserId : false,
      brochure,
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
